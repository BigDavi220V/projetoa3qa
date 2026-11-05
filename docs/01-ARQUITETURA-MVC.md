# Arquitetura MVC — Ilumina Coruripe

> Documento 1 de 4 da série de arquitetura.
> [1. MVC](01-ARQUITETURA-MVC.md) · [2. Camadas](02-ARQUITETURA-EM-CAMADAS.md) ·
> [3. Cliente-servidor](03-ARQUITETURA-CLIENTE-SERVIDOR.md) ·
> [4. Orientada a serviços](04-ARQUITETURA-ORIENTADA-A-SERVICOS.md)

## 1. Decisão de tecnologia

| Parte | Tecnologia decidida | Substitui |
|---|---|---|
| Interface (cidadão e técnico) | **HTML + CSS + JavaScript** (sem framework) | — (continua, mas separado em arquivos) |
| Servidor / API | **Node.js** | Google Apps Script (2 deploys) |
| Banco de dados | **SQL** (exemplos em PostgreSQL) | Google Sheets |

Situação atual, conforme [`ARQUITETURA.md`](ARQUITETURA.md):

- `public/index.html` (cidadão, ~1.650 linhas) e `public/tecnico/index.html`
  (técnico, ~4.960 linhas, ~140 funções) misturam tela, regras, IndexedDB e
  `fetch` no mesmo arquivo.
- O backend é Apps Script, com código só no editor do Google (`apps-script/`
  está vazio), e os dados ficam numa planilha.

Este documento descreve **como fica o MVC com a stack decidida**, nos dois lados:
no navegador (HTML/CSS/JS) e no servidor (Node.js + SQL).

## 2. O que é MVC

MVC (Model–View–Controller) divide o código em três responsabilidades:

| Papel | Pergunta que responde | No Ilumina |
|---|---|---|
| **Model** | "Quais são os dados e as regras?" | Chamado, Poste, Fechamento, Item de estoque, Missão… e o acesso ao SQL |
| **View** | "Como isso aparece?" | Telas HTML/CSS no navegador; respostas JSON no servidor |
| **Controller** | "O que fazer quando algo acontece?" | Recebe o clique ou a requisição HTTP, chama o Model e escolhe a View |

A regra principal: **a View não acessa dados diretamente e o Model não sabe
nada de tela ou de HTTP.** O Controller é o único que conversa com os dois.

## 3. Visão geral

O sistema passa a ter **dois MVCs**: um em cada navegador (para funcionar
offline) e um no servidor Node.js (que é a fonte central da verdade).

```text
┌──────────────── NAVEGADOR (PWA) ─────────────────┐
│  View        HTML + CSS + render*.js              │
│    ↓ eventos (click, submit, online)              │
│  Controller  ReportController, SyncController,    │
│              TicketController, CloseController…   │
│    ↓ comandos                                     │
│  Model       Report, Ticket, Close + repositórios │
│    ├── IndexedDB (fila offline)                   │
│    └── ApiClient (fetch JSON) ───────────┐        │
└──────────────────────────────────────────┼────────┘
                                           │ HTTPS / JSON
┌──────────────── SERVIDOR NODE.JS ────────┼────────┐
│  Rotas       /api/chamados, /api/postes… ◄┘       │
│    ↓                                              │
│  Middlewares autenticação, validação, limite      │
│    ↓                                              │
│  Controller  ChamadoController, PosteController,  │
│              FechamentoController, Estoque…       │
│    ↓                                              │
│  Model       Chamado, Poste, Fechamento… (SQL)    │
│    ↓                                              │
│  View        JSON { success, data | error }       │
└──────────────────────────┬────────────────────────┘
                           │ SQL (driver pg / mysql2)
                    ┌──────┴──────┐
                    │ Banco SQL   │
                    └─────────────┘
```

## 4. MVC no servidor (Node.js + SQL)

### 4.1 Estrutura de pastas

```text
server/
  package.json
  src/
    app.js                     # cria o servidor, registra middlewares e rotas
    server.js                  # sobe na porta (process.env.PORT)
    config/
      env.js                   # lê e valida variáveis de ambiente
      database.js              # pool de conexões SQL
    routes/                    # URL + método → controller
      chamados.routes.js
      postes.routes.js
      auth.routes.js
      estoque.routes.js
      missoes.routes.js
      relatorios.routes.js
    controllers/               # C — orquestra a requisição
      ChamadoController.js
      PosteController.js
      TentativaController.js
      FechamentoController.js
      AuthController.js
      EstoqueController.js
      MissaoController.js
      RelatorioController.js
    models/                    # M — dados, regras e SQL
      Chamado.js
      Poste.js
      Tentativa.js
      Fechamento.js
      Usuario.js
      Sessao.js
      ItemEstoque.js
      Missao.js
    views/                     # V — formato da resposta JSON
      chamado.view.js
      poste.view.js
      resposta.js              # ok(data) / erro(codigo, mensagem)
    middlewares/
      autenticar.js            # exige token e perfil (técnico, almoxarife, gestor)
      validar.js               # confere corpo da requisição
      limitarTentativas.js     # rate limit do login por PIN
      tratarErros.js
    storage/
      fotos.js                 # salva a foto em disco/objeto e devolve a URL
  database/
    migrations/                # scripts .sql versionados (001_inicial.sql…)
    seeds/                     # dados de teste
  tests/
```

> No servidor a **View não é HTML**: é a forma como o Model vira JSON.
> Separar isso evita mandar campos internos (ex.: `pin_hash`) para o navegador.

### 4.2 Model (servidor)

O Model concentra **regras de negócio** e **acesso ao SQL**. Exemplos de
regras que hoje estão espalhadas no Apps Script ou nas telas:

- Um chamado só pode ser fechado se estiver `aberto` ou `em_atendimento`.
- O mesmo `id` de chamado enviado duas vezes não cria duplicata (idempotência).
- Saída de material de uma missão debita o estoque; o retorno credita.
- Um poste não pode receber um segundo chamado aberto sem aviso (`check_poste`).

```js
// server/src/models/Chamado.js
const db = require('../config/database');

const STATUS_FECHAVEIS = ['aberto', 'em_atendimento'];

async function criar(dados) {
  // ON CONFLICT torna o envio idempotente: repetir após timeout não duplica
  const { rows } = await db.query(
    `INSERT INTO chamados (id, protocolo, tipo, latitude, longitude, precisao_m,
                           descricao, nome, telefone, endereco, foto_url,
                           poste_id, criado_em, user_agent)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
     ON CONFLICT (id) DO UPDATE SET id = EXCLUDED.id
     RETURNING *`,
    [dados.id, dados.protocolo, dados.tipo, dados.lat, dados.lng, dados.acc,
     dados.descricao, dados.nome, dados.tel, dados.endereco, dados.fotoUrl,
     dados.posteId || null, dados.timestamp, dados.userAgent]
  );
  return rows[0];
}

async function buscarPorProtocolo(protocolo) {
  const { rows } = await db.query('SELECT * FROM chamados WHERE protocolo = $1', [protocolo]);
  return rows[0] || null;
}

function podeFechar(chamado) {
  return STATUS_FECHAVEIS.includes(chamado.status);
}

module.exports = { criar, buscarPorProtocolo, podeFechar };
```

Sempre usar **consultas parametrizadas** (`$1`, `$2`…), nunca concatenar texto
do usuário no SQL — isso evita SQL injection.

### 4.3 View (servidor)

```js
// server/src/views/resposta.js
const ok   = (res, data, status = 200) => res.status(status).json({ success: true, data });
const erro = (res, status, codigo, mensagem) =>
  res.status(status).json({ success: false, error: { codigo, mensagem } });
module.exports = { ok, erro };

// server/src/views/chamado.view.js — o que o navegador pode ver
module.exports = (c) => ({
  protocolo: c.protocolo,
  tipo: c.tipo,
  status: c.status,
  lat: Number(c.latitude), lng: Number(c.longitude),
  endereco: c.endereco,
  fotoUrl: c.foto_url,
  posteId: c.poste_id,
  criadoEm: c.criado_em
});
```

O formato `{ success, ... }` já é o contrato usado pelos apps hoje, então a
troca do backend não obriga a reescrever o tratamento de resposta das telas.

### 4.4 Controller (servidor)

O Controller **não tem SQL e não monta HTML**: lê a requisição, chama o Model
e escolhe a View.

```js
// server/src/controllers/FechamentoController.js
const Chamado = require('../models/Chamado');
const Fechamento = require('../models/Fechamento');
const fotos = require('../storage/fotos');
const { ok, erro } = require('../views/resposta');

async function fechar(req, res) {
  const chamado = await Chamado.buscarPorProtocolo(req.params.protocolo);
  if (!chamado) return erro(res, 404, 'NAO_ENCONTRADO', 'Chamado não existe.');
  if (!Chamado.podeFechar(chamado))
    return erro(res, 409, 'CONFLITO', 'Chamado já foi fechado por outro técnico.');

  const fotoUrl = await fotos.salvar(req.body.foto_reparo_base64);
  const fechamento = await Fechamento.registrar({
    ...req.body, chamadoId: chamado.id, tecnicoId: req.usuario.id, fotoUrl
  });
  return ok(res, fechamento, 201);
}

module.exports = { fechar };
```

O `409 Conflito` resolve a pendência de "dois técnicos alterando o mesmo
chamado" descrita em `ARQUITETURA.md`: o servidor confere o estado atual
antes de gravar, em vez de sobrescrever.

### 4.5 Rotas

```js
// server/src/routes/chamados.routes.js
const router = require('express').Router();
const autenticar = require('../middlewares/autenticar');
const C = require('../controllers/ChamadoController');
const F = require('../controllers/FechamentoController');
const T = require('../controllers/TentativaController');

router.post('/',                           C.criar);                       // público (cidadão)
router.get('/',                            autenticar('tecnico'), C.listar);
router.get('/:protocolo',                  autenticar('tecnico'), C.buscar);
router.post('/:protocolo/tentativas',      autenticar('tecnico'), T.registrar);
router.post('/:protocolo/fechamento',      autenticar('tecnico'), F.fechar);
router.post('/:protocolo/fechamento-admin',autenticar('gestor'),  F.fecharAdmin);

module.exports = router;
```

> Express é a sugestão por ser o framework Node mais comum e simples. O mesmo
> desenho funciona com o módulo `http` nativo; a escolha ainda está aberta.

### 4.6 De `action` do Apps Script para rotas REST

Hoje tudo é `POST` com um campo `action`. Com servidor próprio, cada ação vira
uma rota com método HTTP adequado:

| `action` atual | Rota nova | Perfil |
|---|---|---|
| *(envio de reporte)* | `POST /api/chamados` | público |
| `check_poste` | `GET /api/postes/:id/situacao` | público |
| `link_poste` | *deixa de existir*: `poste_id` vai no próprio `POST /api/chamados` | — |
| `login` | `POST /api/auth/login` | público (com limite de tentativas) |
| `almox_login` | `POST /api/auth/almoxarifado` | público (com limite) |
| `list` | `GET /api/chamados?escopo=abertos` | técnico |
| `search` | `GET /api/chamados/:protocolo` | técnico |
| `get_poste_history` | `GET /api/postes/:id/historico` | técnico |
| `list_postes` | `GET /api/postes` | técnico |
| `list_attempts` | `GET /api/tentativas` | técnico |
| `attempt` | `POST /api/chamados/:protocolo/tentativas` | técnico |
| `close` | `POST /api/chamados/:protocolo/fechamento` | técnico |
| `close_admin` | `POST /api/chamados/:protocolo/fechamento-admin` | gestor |
| `estoque_list` | `GET /api/estoque` | almoxarife |
| `estoque_upsert` | `PUT /api/estoque/:item` | almoxarife |
| `estoque_delete` | `DELETE /api/estoque/:item` | almoxarife |
| `missao_create` | `POST /api/missoes` | almoxarife |
| `missao_list` | `GET /api/missoes` | almoxarife |
| `missao_return` | `POST /api/missoes/:id/retorno` | almoxarife |
| `material_report` | `GET /api/relatorios/materiais` | almoxarife/gestor |

Ganhos diretos:

- O token vai no cabeçalho `Authorization: Bearer <token>`, não no corpo.
- Acabam os truques de `text/plain` e `form-urlencoded` para fugir do preflight
  de CORS do Apps Script; o corpo passa a ser `application/json` normal.
- `link_poste` "fire-and-forget" some: o vínculo poste ↔ protocolo é gravado
  na mesma transação do chamado, então não fica mais chamado sem poste por
  falha de rede.

## 5. MVC no navegador (HTML + CSS + JavaScript)

O navegador continua com MVC próprio porque precisa **funcionar sem internet**
(fila no IndexedDB). A separação alvo já descrita em `ARQUITETURA.md` fica assim:

```text
public/
  index.html                      # só a estrutura HTML do app do cidadão
  css/
    cidadao.css
  js/cidadao/
    main.js                       # ponto de entrada: cria controllers e chama init()
    models/
      Report.js                   # entidade + validação (tipo, GPS, foto)
      ReportRepository.js         # IndexedDB "ilumina_v2" / "reports"
      LocationService.js          # GPS (navigator.geolocation)
    views/
      FormView.js                 # renderiza o formulário e lê os campos
      GpsView.js                  # mostra precisão do GPS
      PendingBannerView.js        # "Aguardando envio (2)"
      ToastView.js
    controllers/
      ReportController.js         # validar → salvar local → tentar enviar
      SyncController.js           # fila offline, backoff, evento "online"
      PosteQrController.js        # ?poste=P-0001 → verifica situação do poste
  tecnico/
    index.html
    css/tecnico.css
    js/
      models/       Ticket.js, Close.js, Attempt.js, Session.js, StockItem.js
      repositories/ TicketCache.js, CloseQueue.js (máx. 10), PhotoCache.js
      views/        ListView.js, DetailView.js, MapView.js (Leaflet), CloseFormView.js,
                    StockView.js, ReportsView.js
      controllers/  LoginController.js, TicketController.js, CloseController.js,
                    RouteController.js, StockController.js, SyncController.js
  shared/
    config.js                     # gerado no build (scripts/build-config.mjs)
    ApiClient.js                  # único lugar com fetch para o servidor Node
    idb.js                        # utilitário de IndexedDB
```

Usar `<script type="module">` permite `import`/`export` sem ferramenta de build.

### 5.1 Exemplo das três peças no cliente

```js
// public/js/cidadao/models/Report.js — MODEL: dados e regras, sem DOM
export function criarReport({ tipo, gps, foto, posteId, descricao, nome, tel, endereco }) {
  return {
    id: crypto.randomUUID(),           // estável em todas as tentativas
    protocolo: gerarProtocolo(),
    timestamp: new Date().toISOString(),
    tipo, lat: gps?.lat, lng: gps?.lng, acc: gps?.acc,
    foto_base64: foto, poste_id: posteId || '',
    descricao, nome, tel, endereco,
    sync: { estado: 'pending', attempts: 0, lastError: null, nextRetryAt: null }
  };
}

export function validar(r) {
  const erros = [];
  if (!r.tipo) erros.push('Escolha o tipo de defeito.');
  if (r.lat == null || r.lng == null) erros.push('Localização não registrada.');
  return erros;                      // nunca inventa coordenada
}
```

```js
// public/js/cidadao/controllers/ReportController.js — CONTROLLER
import { criarReport, validar } from '../models/Report.js';

export class ReportController {
  constructor({ view, repo, sync }) { Object.assign(this, { view, repo, sync }); }

  async enviar() {
    const report = criarReport(this.view.lerFormulario());
    const erros = validar(report);
    if (erros.length) return this.view.mostrarErros(erros);

    await this.repo.salvar(report);                 // 1º grava no aparelho
    this.view.mostrarSalvoNoAparelho(report.protocolo);
    this.sync.tentarAgora();                        // 2º tenta a rede
  }
}
```

```js
// public/js/cidadao/views/FormView.js — VIEW: só DOM
export class FormView {
  lerFormulario() { /* lê inputs e devolve objeto simples */ }
  mostrarErros(lista) { /* pinta mensagens */ }
  mostrarSalvoNoAparelho(protocolo) { /* "Salvo neste aparelho — aguardando envio" */ }
  mostrarConfirmado(protocolo) { /* "Registrado no sistema" */ }
}
```

```js
// public/shared/ApiClient.js — único ponto de rede
export async function api(caminho, { method = 'GET', body, token, timeout = 30000 } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeout);
  try {
    const resp = await fetch(window.ILUMINA.API_URL + caminho, {
      method,
      headers: { 'Content-Type': 'application/json',
                 ...(token && { Authorization: 'Bearer ' + token }) },
      body: body && JSON.stringify(body),
      signal: ctrl.signal
    });
    return await resp.json();
  } finally { clearTimeout(t); }
}
```

`scripts/build-config.mjs` passa a gerar uma única variável `API_URL`
(ex.: `ILUMINA_API_URL`) no lugar de `ENDPOINT_CIDADAO` e `ENDPOINT_TECNICO`.

## 6. Fluxos completos

### 6.1 Cidadão envia um reporte

```text
 1. Cidadão toca "Enviar"
      │
 2. FormView.lerFormulario()                         [View — navegador]
      │
 3. ReportController.enviar()                        [Controller — navegador]
      ├─ Report.validar()                            [Model — navegador]
      ├─ ReportRepository.salvar() → IndexedDB       [Model — navegador]
      └─ FormView.mostrarSalvoNoAparelho()  → "Salvo neste aparelho"
      │
 4. SyncController.tentarAgora()
      └─ ApiClient: POST /api/chamados  (JSON)
                    │  HTTPS
 5. Servidor Node   ▼
      ├─ routes/chamados.routes.js                   [Rota]
      ├─ middlewares/validar.js
      ├─ ChamadoController.criar()                   [Controller — servidor]
      │    ├─ storage/fotos.salvar() → foto_url
      │    └─ Chamado.criar() → INSERT … ON CONFLICT [Model — servidor → SQL]
      └─ chamado.view.js → 201 { success: true, data } [View — servidor]
      │
 6. ReportRepository marca "synced"
      └─ FormView.mostrarConfirmado()  → "Registrado no sistema"
```

Sem internet, o fluxo para depois de "salvo no aparelho". O `SyncController`
tenta de novo no evento `online`, ao reabrir o app e por backoff exponencial.
Como o servidor usa o `id` como chave, repetir o envio após timeout não duplica.

### 6.2 Técnico fecha um chamado

1. `LoginController` → `POST /api/auth/login` com o PIN → recebe `{ token, expiry }`
   e guarda em `Session` (localStorage `ilu_tech_session`).
2. `TicketController` → `GET /api/chamados?escopo=abertos` → atualiza
   `TicketCache` (`ilu_tech_list_cache`) → `ListView`/`MapView` renderizam.
3. Técnico preenche a baixa. `CloseController` valida (Model `Close`), grava na
   `CloseQueue` (IndexedDB `ilumina_tec/close_queue`) com um `operacao_id`.
4. `SyncController` envia `POST /api/chamados/:protocolo/fechamento`.
5. No servidor: `autenticar('tecnico')` → `FechamentoController.fechar` →
   `Chamado.podeFechar` → `Fechamento.registrar` (transação SQL que grava o
   fechamento, os materiais usados, atualiza o poste e muda o status).
6. Resposta `201` → item sai da fila. Resposta `409` → a `CloseFormView` mostra
   "este chamado já foi fechado por outro técnico" para revisão.

## 7. Modelo de dados (SQL)

Substitui as abas da planilha. Exemplo em PostgreSQL:

```sql
CREATE TABLE usuarios (
  id          SERIAL PRIMARY KEY,
  nome        VARCHAR(120) NOT NULL,
  perfil      VARCHAR(20)  NOT NULL CHECK (perfil IN ('tecnico','gestor','almoxarife')),
  pin_hash    VARCHAR(255) NOT NULL,          -- nunca o PIN em texto puro
  ativo       BOOLEAN      NOT NULL DEFAULT TRUE
);

CREATE TABLE sessoes (
  token       CHAR(64) PRIMARY KEY,
  usuario_id  INT NOT NULL REFERENCES usuarios(id),
  expira_em   TIMESTAMPTZ NOT NULL
);

CREATE TABLE postes (
  id             VARCHAR(20) PRIMARY KEY,      -- 'P-0001', o mesmo do QR
  latitude       NUMERIC(9,6),
  longitude      NUMERIC(9,6),
  endereco       VARCHAR(255),
  braco          VARCHAR(60),
  luminaria      VARCHAR(60),
  reator         VARCHAR(60),
  fotosensor     VARCHAR(60),
  porta_fusivel  VARCHAR(60),
  fusivel        VARCHAR(60),
  cabo           VARCHAR(60),
  conector       VARCHAR(60),
  obs            TEXT,
  atualizado_em  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE chamados (
  id           UUID PRIMARY KEY,               -- gerado no aparelho (idempotência)
  protocolo    VARCHAR(30) UNIQUE NOT NULL,
  tipo         VARCHAR(40) NOT NULL,
  status       VARCHAR(20) NOT NULL DEFAULT 'aberto'
               CHECK (status IN ('aberto','em_atendimento','fechado','cancelado')),
  latitude     NUMERIC(9,6),
  longitude    NUMERIC(9,6),
  precisao_m   INT,
  descricao    TEXT,
  nome         VARCHAR(120),
  telefone     VARCHAR(30),
  endereco     VARCHAR(255),
  foto_url     VARCHAR(500),                   -- arquivo fora do banco
  poste_id     VARCHAR(20) REFERENCES postes(id),
  user_agent   VARCHAR(180),
  criado_em    TIMESTAMPTZ NOT NULL,           -- hora do aparelho
  recebido_em  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_chamados_status ON chamados(status);
CREATE INDEX idx_chamados_poste  ON chamados(poste_id);

CREATE TABLE tentativas (                      -- visita sem resolução
  id           SERIAL PRIMARY KEY,
  operacao_id  UUID UNIQUE NOT NULL,
  chamado_id   UUID NOT NULL REFERENCES chamados(id),
  tecnico_id   INT  NOT NULL REFERENCES usuarios(id),
  motivo       TEXT NOT NULL,
  latitude     NUMERIC(9,6),
  longitude    NUMERIC(9,6),
  foto_url     VARCHAR(500),
  criado_em    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE fechamentos (
  id              SERIAL PRIMARY KEY,
  operacao_id     UUID UNIQUE NOT NULL,
  chamado_id      UUID UNIQUE NOT NULL REFERENCES chamados(id),  -- 1 fechamento por chamado
  tecnico_id      INT REFERENCES usuarios(id),
  status          VARCHAR(30) NOT NULL,
  servico         TEXT,
  referencia      VARCHAR(255),
  latitude        NUMERIC(9,6),
  longitude       NUMERIC(9,6),
  foto_url        VARCHAR(500),
  administrativo  BOOLEAN NOT NULL DEFAULT FALSE,
  informante      VARCHAR(120),
  justificativa   TEXT,
  data_fechamento TIMESTAMPTZ NOT NULL
);

CREATE TABLE itens_estoque (
  id       SERIAL PRIMARY KEY,
  nome     VARCHAR(120) UNIQUE NOT NULL,
  unidade  VARCHAR(20)  NOT NULL,
  saldo    NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (saldo >= 0),
  minimo   NUMERIC(10,2) NOT NULL DEFAULT 0
);

CREATE TABLE fechamento_materiais (
  fechamento_id INT REFERENCES fechamentos(id),
  item_id       INT REFERENCES itens_estoque(id),
  quantidade    NUMERIC(10,2) NOT NULL,
  PRIMARY KEY (fechamento_id, item_id)
);

CREATE TABLE missoes (
  id         SERIAL PRIMARY KEY,
  data       DATE NOT NULL,
  equipe     VARCHAR(120) NOT NULL,
  obs        TEXT,
  criado_por INT REFERENCES usuarios(id)
);

CREATE TABLE missao_itens (
  missao_id   INT REFERENCES missoes(id),
  item_id     INT REFERENCES itens_estoque(id),
  qtd_saida   NUMERIC(10,2) NOT NULL,
  qtd_retorno NUMERIC(10,2),
  PRIMARY KEY (missao_id, item_id)
);

CREATE TABLE tentativas_login (                -- base do limite de tentativas do PIN
  id        SERIAL PRIMARY KEY,
  ip        VARCHAR(45) NOT NULL,
  sucesso   BOOLEAN NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Observações:

- `chamados.id UUID` gerado no aparelho e `operacao_id UNIQUE` em tentativas e
  fechamentos garantem que reenvio da fila offline não grava duas vezes.
- `CHECK (saldo >= 0)` impede estoque negativo direto no banco.
- Fotos **não** ficam em base64 dentro da tabela: o servidor salva o arquivo e
  grava só a URL. Isso mantém o banco pequeno e as consultas rápidas.
- O PIN fica com hash (ex.: bcrypt) e `tentativas_login` permite bloquear força
  bruta — resolve a pendência "PIN de 4 dígitos sem limite" de `ARQUITETURA.md`.

## 8. O que cada parte pode e não pode fazer

| Parte | Pode | Não pode |
|---|---|---|
| View (navegador) | Ler/escrever DOM, disparar eventos | Chamar `fetch`, abrir IndexedDB, decidir regra |
| Controller (navegador) | Chamar Model, repositórios e View; navegar | Montar HTML longo; conhecer SQL |
| Model (navegador) | Validar, criar entidades, ler/gravar via repositório | Tocar no DOM |
| Rota (servidor) | Ligar URL + método a controller e middlewares | Ter regra de negócio |
| Controller (servidor) | Ler `req`, chamar Model, escolher View | Escrever SQL; acessar `req` dentro do Model |
| Model (servidor) | SQL, transações, regras de domínio | Conhecer `req`/`res` ou formato JSON de saída |
| View (servidor) | Transformar Model em JSON público | Consultar o banco |

## 9. Plano de migração incremental

1. **Banco e servidor mínimo.** Criar `server/`, as migrations SQL e a rota
   `POST /api/chamados`. Importar os dados atuais da planilha (exportar CSV →
   script de importação).
2. **Cliente do cidadão.** Extrair `ApiClient`, `ReportRepository` e `Report`
   do `index.html`; depois `ReportController`/`SyncController`; por fim as Views.
3. **Autenticação.** `POST /api/auth/login` com hash de PIN e limite de tentativas.
4. **Painel técnico.** Rotas de chamados, tentativas, fechamento e postes;
   extração do `tecnico/index.html` na mesma ordem (repositórios → controllers → views).
5. **Almoxarifado e relatórios.**
6. **Desligar o Apps Script** só depois que os dois apps estiverem usando a API
   nova em produção.

Durante a transição o `ApiClient` pode apontar para o Apps Script ou para o
Node trocando só a configuração, porque as Views e Controllers não sabem qual
backend está do outro lado.

> **Importante:** os QR já colados nos postes apontam para
> `iluminacoruripe.netlify.app/?poste=…`. A rota `/?poste=` do front não muda,
> então os QR continuam válidos.

## 10. Por que isso ajuda nos testes de qualidade

| Peça | Tipo de teste | Ferramenta sugerida |
|---|---|---|
| Models do navegador (`Report.validar`) | Unitário, sem navegador | `node:test` (nativo do Node 18+) |
| Models do servidor (`Chamado.podeFechar`) | Unitário | `node:test` |
| Controllers + rotas | Integração HTTP com banco de teste | `node:test` + `supertest` |
| SQL (constraints, idempotência) | Integração com banco | banco descartável em Docker |
| Fluxo completo e offline | Ponta a ponta (E2E) | Playwright (simula offline e GPS) |

Com tudo misturado num `index.html`, só dá para testar pela tela. Com MVC, cada
regra pode ser testada isolada.

## 11. Decisões em aberto

- **SGBD:** PostgreSQL ou MySQL (os exemplos usam PostgreSQL; em MySQL mudam
  tipos como `UUID`, `TIMESTAMPTZ` e o `ON CONFLICT`, que vira `ON DUPLICATE KEY`).
- **Framework HTTP:** Express (sugerido) ou `http` nativo.
- **Hospedagem do Node:** Netlify/Vercel servem bem o front estático, mas um
  servidor Node com conexão SQL persistente costuma ir para Render, Railway,
  Fly.io ou uma VPS. Se a API ficar em outro domínio, configurar CORS para a
  origem do front, ou criar um redirect `/api/*` no `netlify.toml`/`vercel.json`
  para manter a mesma origem.
- **Armazenamento de fotos:** disco do servidor (simples) ou armazenamento de
  objetos (S3, Cloudflare R2, Supabase Storage).
