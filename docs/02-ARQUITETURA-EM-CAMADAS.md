# Arquitetura em Camadas — Ilumina Coruripe

> Documento 2 de 4 da série de arquitetura.
> [1. MVC](01-ARQUITETURA-MVC.md) · [2. Camadas](02-ARQUITETURA-EM-CAMADAS.md) ·
> [3. Cliente-servidor](03-ARQUITETURA-CLIENTE-SERVIDOR.md) ·
> [4. Orientada a serviços](04-ARQUITETURA-ORIENTADA-A-SERVICOS.md)

Stack considerada: **HTML + CSS + JavaScript** no navegador, **Node.js** no
servidor e banco **SQL**.

## 1. O que é arquitetura em camadas

O sistema é dividido em camadas horizontais empilhadas. Cada camada tem uma
responsabilidade e **só conversa com a camada imediatamente abaixo**:

```text
┌───────────────────────────────┐
│ 1. Apresentação               │  o que o usuário vê / o que entra por HTTP
├───────────────────────────────┤
│ 2. Aplicação (serviços)       │  casos de uso: "fechar chamado", "registrar saída"
├───────────────────────────────┤
│ 3. Domínio                    │  entidades e regras de negócio puras
├───────────────────────────────┤
│ 4. Persistência / Infra       │  SQL, arquivos, GPS, rede
├───────────────────────────────┤
│ 5. Dados                      │  banco SQL, IndexedDB
└───────────────────────────────┘
        dependência sempre para baixo ↓
```

Regras:

- Uma camada de cima **usa** a de baixo; a de baixo **nunca** chama a de cima.
- Não se pula camada: a Apresentação não executa SQL.
- Trocar uma camada (ex.: Google Sheets → PostgreSQL) não deve exigir mudança
  nas camadas acima, desde que a interface entre elas seja mantida.

## 2. Relação com o MVC

Camadas e MVC **não são concorrentes**: o MVC organiza principalmente a
camada de Apresentação, e a arquitetura em camadas organiza o sistema inteiro.

| MVC (doc. 1) | Camada correspondente |
|---|---|
| View (HTML/CSS no navegador; JSON no servidor) | 1. Apresentação |
| Controller | 1. Apresentação (entrada) |
| — *(não existe no MVC "puro")* | **2. Aplicação** — nova camada de serviços |
| Model — parte de regras | 3. Domínio |
| Model — parte de SQL / IndexedDB | 4. Persistência |
| Banco SQL / IndexedDB | 5. Dados |

A diferença prática: no MVC o Model costuma juntar regra e SQL. Em camadas,
essas duas coisas se separam, e aparece uma **camada de serviços** entre o
Controller e o Model para guardar os casos de uso. O Controller fica fino.

## 3. Camadas no servidor Node.js

```text
┌──────────────────────── SERVIDOR NODE.JS ────────────────────────┐
│ 1. APRESENTAÇÃO                                                  │
│    routes/  middlewares/  controllers/  views/ (JSON)            │
│    Sabe de HTTP (req, res, status, cabeçalhos). Nada de SQL.     │
├──────────────────────────────────────────────────────────────────┤
│ 2. APLICAÇÃO                                                     │
│    services/ ChamadoService, FechamentoService, AuthService,     │
│              EstoqueService, MissaoService, RelatorioService     │
│    Um método = um caso de uso. Controla transação e permissões.  │
├──────────────────────────────────────────────────────────────────┤
│ 3. DOMÍNIO                                                       │
│    domain/ Chamado, Poste, Fechamento, ItemEstoque, Missao       │
│    Regras puras: "pode fechar?", "saldo suficiente?".            │
│    Não importa nada de banco nem de HTTP.                        │
├──────────────────────────────────────────────────────────────────┤
│ 4. PERSISTÊNCIA / INFRAESTRUTURA                                 │
│    repositories/ ChamadoRepository, PosteRepository… (SQL)       │
│    storage/ FotoStorage    security/ HashPin, Token              │
├──────────────────────────────────────────────────────────────────┤
│ 5. DADOS                                                         │
│    PostgreSQL (ou MySQL) + pasta/bucket de fotos                 │
└──────────────────────────────────────────────────────────────────┘
```

### 3.1 Estrutura de pastas

```text
server/src/
  presentation/
    routes/            chamados.routes.js, auth.routes.js, estoque.routes.js…
    middlewares/       autenticar.js, validar.js, limitarTentativas.js, tratarErros.js
    controllers/       ChamadoController.js, FechamentoController.js…
    views/             chamado.view.js, resposta.js
  application/
    services/          ChamadoService.js, FechamentoService.js, AuthService.js,
                       EstoqueService.js, MissaoService.js, RelatorioService.js
    errors/            NaoEncontrado.js, Conflito.js, SemPermissao.js
  domain/
    Chamado.js  Poste.js  Fechamento.js  Tentativa.js  ItemEstoque.js  Missao.js
  infrastructure/
    database/          pool.js, transacao.js
    repositories/      ChamadoRepository.js, FechamentoRepository.js,
                       PosteRepository.js, EstoqueRepository.js, MissaoRepository.js,
                       UsuarioRepository.js, SessaoRepository.js
    storage/           FotoStorage.js
    security/          hashPin.js, gerarToken.js
  app.js
database/migrations/   001_inicial.sql …
```

### 3.2 O mesmo caso de uso passando pelas cinco camadas

**Caso de uso:** técnico fecha o chamado `CRP-20261103-0042` usando 2 reatores.

```js
// 1. APRESENTAÇÃO — presentation/controllers/FechamentoController.js
const FechamentoService = require('../../application/services/FechamentoService');
const { ok } = require('../views/resposta');

async function fechar(req, res, next) {
  try {
    const resultado = await FechamentoService.fecharChamado({
      protocolo: req.params.protocolo,
      tecnicoId: req.usuario.id,
      dados: req.body
    });
    ok(res, resultado, 201);
  } catch (e) { next(e); }  // tratarErros converte Conflito → 409, NaoEncontrado → 404
}
```

```js
// 2. APLICAÇÃO — application/services/FechamentoService.js
const { emTransacao } = require('../../infrastructure/database/transacao');
const ChamadoRepo = require('../../infrastructure/repositories/ChamadoRepository');
const FechamentoRepo = require('../../infrastructure/repositories/FechamentoRepository');
const EstoqueRepo = require('../../infrastructure/repositories/EstoqueRepository');
const PosteRepo = require('../../infrastructure/repositories/PosteRepository');
const FotoStorage = require('../../infrastructure/storage/FotoStorage');
const Chamado = require('../../domain/Chamado');
const { NaoEncontrado, Conflito } = require('../errors');

async function fecharChamado({ protocolo, tecnicoId, dados }) {
  const fotoUrl = await FotoStorage.salvar(dados.foto_reparo_base64);

  return emTransacao(async (tx) => {
    const chamado = await ChamadoRepo.buscarParaAtualizar(tx, protocolo); // SELECT … FOR UPDATE
    if (!chamado) throw new NaoEncontrado('Chamado não existe.');
    if (!Chamado.podeFechar(chamado)) throw new Conflito('Chamado já foi fechado.');

    const fechamento = await FechamentoRepo.inserir(tx, { ...dados, chamadoId: chamado.id, tecnicoId, fotoUrl });
    await EstoqueRepo.baixarMateriais(tx, fechamento.id, dados.materiais_os);
    await PosteRepo.atualizarConfiguracao(tx, chamado.poste_id, dados.config);
    await ChamadoRepo.mudarStatus(tx, chamado.id, 'fechado');
    return fechamento;
  });
}
module.exports = { fecharChamado };
```

```js
// 3. DOMÍNIO — domain/Chamado.js  (sem require de banco ou HTTP)
const FECHAVEIS = ['aberto', 'em_atendimento'];
exports.podeFechar = (chamado) => FECHAVEIS.includes(chamado.status);
```

```js
// 4. PERSISTÊNCIA — infrastructure/repositories/ChamadoRepository.js
exports.buscarParaAtualizar = async (tx, protocolo) =>
  (await tx.query('SELECT * FROM chamados WHERE protocolo = $1 FOR UPDATE', [protocolo])).rows[0];

exports.mudarStatus = (tx, id, status) =>
  tx.query('UPDATE chamados SET status = $1 WHERE id = $2', [status, id]);
```

```text
5. DADOS — PostgreSQL executa as instruções dentro de BEGIN … COMMIT.
   Se qualquer passo falhar (ex.: CHECK saldo >= 0), tudo volta (ROLLBACK):
   o chamado não fica "fechado" com estoque não debitado.
```

O `SELECT … FOR UPDATE` dentro da transação trava a linha do chamado: se dois
técnicos fecharem ao mesmo tempo, o segundo espera o primeiro terminar, vê o
status `fechado` e recebe `409 Conflito`.

## 4. Camadas no navegador (HTML + CSS + JavaScript)

Os PWAs também podem ser organizados em camadas, o que é importante porque
eles têm lógica própria de fila offline:

```text
┌─────────────────────── PWA (cidadão / técnico) ───────────────────────┐
│ 1. APRESENTAÇÃO   HTML + CSS + views/*.js + controllers/*.js          │
│                   (telas, eventos, mensagens "salvo no aparelho")     │
├───────────────────────────────────────────────────────────────────────┤
│ 2. APLICAÇÃO      services/ EnviarReporte, SincronizarFila,           │
│                   FecharChamado, CarregarRota                         │
├───────────────────────────────────────────────────────────────────────┤
│ 3. DOMÍNIO        domain/ Report, Ticket, Close (validação, estados   │
│                   pending → syncing → synced / needs_attention)       │
├───────────────────────────────────────────────────────────────────────┤
│ 4. INFRAESTRUTURA infrastructure/ IndexedDbReportRepository,          │
│                   ApiClient (fetch), GeolocationService, CameraService│
├───────────────────────────────────────────────────────────────────────┤
│ 5. DADOS LOCAIS   IndexedDB (ilumina_v2, ilumina_tec), localStorage,  │
│                   Cache Storage do service worker                     │
└───────────────────────────────────────────────────────────────────────┘
```

```text
public/js/cidadao/
  presentation/   views/FormView.js, views/GpsView.js, controllers/ReportController.js
  application/    EnviarReporte.js, SincronizarFila.js
  domain/         Report.js
  infrastructure/ IndexedDbReportRepository.js, GeolocationService.js
public/shared/infrastructure/
  ApiClient.js  idb.js  config.js (gerado no build)
```

Exemplo de serviço de aplicação no navegador:

```js
// public/js/cidadao/application/SincronizarFila.js
export async function sincronizarFila({ repo, api, agora = Date.now() }) {
  const pendentes = (await repo.listarPendentes()).filter(r => !r.sync.nextRetryAt || r.sync.nextRetryAt <= agora);
  for (const r of pendentes) {
    await repo.marcar(r.id, 'syncing');
    try {
      const resp = await api('/api/chamados', { method: 'POST', body: r });
      if (resp.success) await repo.marcar(r.id, 'synced', { remoto: resp.data.protocolo });
      else await repo.marcar(r.id, 'needs_attention', { erro: resp.error });   // erro permanente
    } catch (e) {
      const espera = Math.min(2 ** r.sync.attempts * 30_000, 30 * 60_000);    // backoff exponencial
      await repo.marcar(r.id, 'pending', { erro: e.message, nextRetryAt: agora + espera });
    }
  }
}
```

Como `repo` e `api` são recebidos por parâmetro, o teste unitário passa
versões falsas e verifica a regra de backoff sem precisar de navegador nem rede.

## 5. Sistema completo, de ponta a ponta

```text
 NAVEGADOR                                 SERVIDOR                         BANCO
┌────────────────────┐                ┌───────────────────────┐
│ Apresentação       │                │ Apresentação          │
│ Aplicação          │  HTTPS/JSON    │  (rotas, controllers) │
│ Domínio            │ ─────────────► │ Aplicação (services)  │
│ Infra (ApiClient,  │                │ Domínio               │        ┌─────────┐
│  IndexedDB)        │ ◄───────────── │ Persistência (repos)  │ ─SQL─► │ Postgre │
└────────────────────┘                └───────────────────────┘        └─────────┘
```

A fronteira de rede fica entre a camada de Infraestrutura do navegador
(`ApiClient`) e a camada de Apresentação do servidor (rotas). O contrato entre
elas é a API REST descrita no documento 1 (seção 4.6).

## 6. Regras de dependência (para revisão de código)

| Arquivo em… | Pode importar de… | Não pode importar de… |
|---|---|---|
| `presentation/` | `application/`, `views/` | `infrastructure/repositories/`, driver SQL |
| `application/` | `domain/`, `infrastructure/` (repositórios, storage) | `presentation/`, `express`, `req`/`res` |
| `domain/` | nada do projeto (só JS puro) | qualquer outra camada |
| `infrastructure/` | `domain/` (para tipos/entidades), driver SQL | `presentation/`, `application/` |

Uma checagem simples no CI pode procurar `require('pg')` fora de
`infrastructure/` e falhar o build.

## 7. Vantagens e desvantagens para o Ilumina

**Vantagens**

- Regras do domínio (fechamento, estoque, estados da fila) testáveis sem
  banco, sem navegador e sem rede.
- A troca Apps Script/Sheets → Node/SQL fica concentrada na camada de
  Persistência; isso também vale para uma troca futura de PostgreSQL para MySQL.
- Transações ficam num lugar só (serviços), o que evita estado inconsistente
  entre chamado, poste e estoque.
- Fácil de explicar e de dividir entre integrantes do grupo (um por camada).

**Desvantagens**

- Mais arquivos e mais "passagem de parâmetro" para operações simples
  (ex.: `GET /api/estoque` passa por controller → service → repository só para um `SELECT`).
- Risco de camada "vazia" que só repassa chamada — aceitar isso para consultas
  simples ou permitir que leituras simples chamem o repositório direto, desde
  que a regra fique documentada.
- Continua sendo **um único deploy** (monólito): uma falha no módulo de
  relatórios pode derrubar o envio de reportes, se não houver tratamento de erro.

## 8. Quando escolher camadas

Para o tamanho do Ilumina (dois apps, uma equipe técnica, um banco), a
combinação **MVC na apresentação + camadas de serviço, domínio e persistência**
é o ponto de equilíbrio: organizada o suficiente para testar, sem a operação
de vários servidores exigida pela arquitetura orientada a serviços (doc. 4).
