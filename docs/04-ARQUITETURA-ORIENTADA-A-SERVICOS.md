# Arquitetura Orientada a Serviços (SOA) — Ilumina Coruripe

> Documento 4 de 4 da série de arquitetura.
> [1. MVC](01-ARQUITETURA-MVC.md) · [2. Camadas](02-ARQUITETURA-EM-CAMADAS.md) ·
> [3. Cliente-servidor](03-ARQUITETURA-CLIENTE-SERVIDOR.md) ·
> [4. Orientada a serviços](04-ARQUITETURA-ORIENTADA-A-SERVICOS.md)

Stack considerada: **HTML + CSS + JavaScript** (clientes), **Node.js** (cada
serviço) e banco **SQL**.

## 1. O que é SOA

Na arquitetura orientada a serviços o sistema é dividido **por capacidade de
negócio**, e não por camada técnica. Cada serviço:

- resolve uma parte do negócio (ex.: "estoque") do começo ao fim;
- expõe um **contrato** (API) bem definido e esconde como funciona por dentro;
- é dono dos seus dados — outro serviço não lê as tabelas dele direto;
- pode ser implantado, atualizado e escalado de forma independente;
- é reutilizável por vários clientes (PWA do cidadão, do técnico, um futuro
  painel da prefeitura ou o HUB Central).

Comparação rápida:

| | Camadas (doc. 2) | SOA |
|---|---|---|
| Divide por | tipo técnico (tela, regra, banco) | assunto de negócio (chamados, estoque…) |
| Deploy | um só | um por serviço |
| Banco | um, compartilhado | um esquema por serviço |
| Comunicação interna | chamada de função | rede (HTTP / mensagens) |

## 2. Serviços identificados no Ilumina

As ações que hoje estão em `ENDPOINT_TECNICO` e `ENDPOINT_CIDADAO` se agrupam
naturalmente em sete serviços:

| Serviço | Responsabilidade | Ações atuais que absorve | Dados (tabelas) |
|---|---|---|---|
| **Identidade** | Login por PIN, sessões, perfis, limite de tentativas | `login`, `almox_login` | `usuarios`, `sessoes`, `tentativas_login` |
| **Reportes** | Receber reportes do cidadão (idempotente), gerar protocolo | envio de reporte | `reportes` |
| **Atendimento** | Chamados, tentativas, fechamentos, conflitos | `list`, `search`, `list_attempts`, `attempt`, `close`, `close_admin` | `chamados`, `tentativas`, `fechamentos` |
| **Postes** | Cadastro, configuração, histórico, QR e situação | `check_poste`, `link_poste`, `list_postes`, `get_poste_history` | `postes`, `poste_historico` |
| **Almoxarifado** | Itens, saldo, missões, saída e retorno | `estoque_*`, `missao_*` | `itens_estoque`, `missoes`, `missao_itens`, `movimentacoes` |
| **Arquivos** | Receber, comprimir e servir fotos | (hoje embutido em base64) | metadados + bucket/pasta |
| **Relatórios** | Consultas consolidadas, somente leitura | `material_report`, relatórios do painel | réplicas/visões de leitura |

## 3. Visão geral

```text
   ┌──────────────┐   ┌──────────────┐   ┌───────────────────────┐
   │ PWA Cidadão  │   │ PWA Técnico  │   │ HUB Central / futuros │
   │ HTML/CSS/JS  │   │ HTML/CSS/JS  │   │ painéis da prefeitura │
   └──────┬───────┘   └──────┬───────┘   └──────────┬────────────┘
          └──────────────────┼──────────────────────┘
                             │ HTTPS / JSON
                 ┌───────────▼────────────┐
                 │ API Gateway (Node.js)  │  roteamento, CORS, autenticação do token,
                 │ /api/*                 │  limite de requisições, logs
                 └───┬───┬───┬───┬───┬───┬┘
      ┌──────────────┘   │   │   │   │   └───────────────┐
      ▼                  ▼   │   ▼   ▼                   ▼
┌───────────┐ ┌───────────┐  │ ┌──────────┐ ┌───────────┐ ┌────────────┐
│Identidade │ │ Reportes  │  │ │ Postes   │ │Almoxarif. │ │ Relatórios │
│ Node + SQL│ │ Node + SQL│  │ │Node + SQL│ │ Node + SQL│ │ Node (lê)  │
└───────────┘ └─────┬─────┘  │ └────▲─────┘ └─────▲─────┘ └─────▲──────┘
                    │        ▼      │             │             │
                    │  ┌───────────┐│             │             │
                    │  │Atendimento│┘             │             │
                    │  │ Node + SQL│──────────────┘             │
                    │  └─────┬─────┘                            │
                    │        │                                  │
              ══════╧════════╧══════ barramento de eventos ═════╧═══════
                    ReporteRecebido · ChamadoFechado · MateriaisUtilizados
                                    ┌───────────┐
                                    │ Arquivos  │ ◄── usado por Reportes e Atendimento
                                    └───────────┘
```

## 4. Contratos de cada serviço

Cada serviço publica um contrato (pode ser descrito em OpenAPI). Exemplo:

### Identidade — `/api/auth`
| Método e rota | Entrada | Saída |
|---|---|---|
| `POST /api/auth/login` | `{ pin }` | `{ token, expiry, perfil }` ou `429` |
| `POST /api/auth/almoxarifado` | `{ pin }` | `{ token, perfil: "almoxarife" }` |
| `GET /api/auth/validar` *(interno)* | cabeçalho `Authorization` | `{ usuarioId, perfil }` |

### Reportes — `/api/reportes`
| Método e rota | Entrada | Saída |
|---|---|---|
| `POST /api/reportes` | `{ id, protocolo, tipo, lat, lng, acc, poste_id?, foto_base64?, … }` | `201 { protocolo }` (idempotente pelo `id`) |
| `GET /api/reportes/:protocolo` | — | situação para o cidadão acompanhar |

### Atendimento — `/api/chamados`
| Método e rota | Perfil |
|---|---|
| `GET /api/chamados?escopo=abertos` | técnico |
| `GET /api/chamados/:protocolo` | técnico |
| `POST /api/chamados/:protocolo/tentativas` | técnico |
| `POST /api/chamados/:protocolo/fechamento` | técnico (`409` em conflito) |
| `POST /api/chamados/:protocolo/fechamento-admin` | gestor |

### Postes — `/api/postes`
| Método e rota | Perfil |
|---|---|
| `GET /api/postes/:id/situacao` | público (substitui `check_poste`) |
| `GET /api/postes` | técnico |
| `GET /api/postes/:id/historico` | técnico |
| `PUT /api/postes/:id/configuracao` *(interno, via evento)* | serviço Atendimento |

### Almoxarifado — `/api/estoque`, `/api/missoes`
| Método e rota | Perfil |
|---|---|
| `GET /api/estoque` · `PUT /api/estoque/:item` · `DELETE /api/estoque/:item` | almoxarife |
| `POST /api/missoes` · `GET /api/missoes` · `POST /api/missoes/:id/retorno` | almoxarife |

### Arquivos — `/api/arquivos`
| Método e rota | Saída |
|---|---|
| `POST /api/arquivos` (imagem) | `{ url }` |
| `GET /api/arquivos/:id` | a imagem |

### Relatórios — `/api/relatorios`
| Método e rota | Perfil |
|---|---|
| `GET /api/relatorios/materiais` | almoxarife / gestor |
| `GET /api/relatorios/chamados?de=&ate=` | gestor |

## 5. Comunicação entre serviços

### 5.1 Síncrona (HTTP) — quando a resposta é necessária na hora

- Gateway → **Identidade** `GET /api/auth/validar` para conferir o token.
- **Postes** responde `situacao` consultando **Atendimento**
  ("existe chamado aberto para P-0001?").

### 5.2 Assíncrona (eventos) — quando o outro serviço pode reagir depois

| Evento | Publicado por | Consumido por | Efeito |
|---|---|---|---|
| `ReporteRecebido` | Reportes | Atendimento | cria o chamado na fila da equipe |
| `ReporteRecebido` (com `poste_id`) | Reportes | Postes | vincula protocolo ↔ poste (substitui `link_poste`) |
| `ChamadoFechado` | Atendimento | Postes | atualiza configuração e histórico do poste |
| `MateriaisUtilizados` | Atendimento | Almoxarifado | debita os itens usados na O.S. |
| `MissaoRetornada` | Almoxarifado | Relatórios | atualiza consolidado de materiais |

Exemplo de mensagem:

```json
{
  "evento": "ChamadoFechado",
  "id": "c5f0…",
  "ocorridoEm": "2026-11-03T21:40:00Z",
  "dados": {
    "protocolo": "CRP-20261103-0042",
    "posteId": "P-0001",
    "tecnicoId": 7,
    "config": { "reator": "70W", "luminaria": "LED 100W" },
    "materiais": [{ "item": "Reator 70W", "quantidade": 2 }]
  }
}
```

Para um projeto deste porte, o barramento pode começar simples:

1. **Tabela "outbox" no SQL** de cada serviço + um processo Node que lê e
   entrega os eventos (garante que o evento não se perde se o serviço cair); ou
2. **Fila gerenciada** (RabbitMQ, Redis Streams) quando houver volume.

Cada consumidor guarda o `id` do evento já processado para não aplicar duas
vezes (ex.: não debitar estoque em dobro).

## 6. Dados: um esquema por serviço

```text
PostgreSQL (uma instância, esquemas separados — ou um banco por serviço)
├── identidade.usuarios, identidade.sessoes, identidade.tentativas_login
├── reportes.reportes, reportes.outbox
├── atendimento.chamados, atendimento.tentativas, atendimento.fechamentos, atendimento.outbox
├── postes.postes, postes.poste_historico
├── almoxarifado.itens_estoque, almoxarifado.missoes, almoxarifado.missao_itens,
│   almoxarifado.movimentacoes, almoxarifado.eventos_processados
└── relatorios.vw_materiais, relatorios.vw_chamados_por_bairro   (dados copiados via eventos)
```

Regra: o serviço Atendimento **não faz** `SELECT` em `almoxarifado.itens_estoque`.
Se precisar do saldo, pergunta à API do Almoxarifado ou reage a um evento.

Consequência importante: **não existe transação única** entre "fechar
chamado" e "debitar estoque". O fechamento é confirmado no Atendimento e o
débito acontece logo depois, pelo evento (*consistência eventual*). Se o
débito falhar (saldo insuficiente), o Almoxarifado publica `DebitoRecusado`
e o gestor é avisado — em vez de impedir o fechamento em campo.

## 7. Estrutura do repositório

```text
projetoa3qa/
  public/                      # clientes (HTML/CSS/JS) — sem mudança de papel
  services/
    gateway/       src/  package.json  Dockerfile
    identidade/    src/{routes,controllers,services,domain,repositories}  migrations/
    reportes/      src/…  migrations/
    atendimento/   src/…  migrations/
    postes/        src/…  migrations/
    almoxarifado/  src/…  migrations/
    arquivos/      src/…
    relatorios/    src/…
  packages/
    contratos/     # esquemas JSON dos eventos e das APIs, compartilhados
    eventos/       # cliente do outbox / fila
  docker-compose.yml           # sobe todos os serviços + PostgreSQL localmente
```

Dentro de cada serviço vale a organização dos documentos 1 e 2 (MVC +
camadas). SOA define **as fronteiras entre serviços**; MVC e camadas definem
**o código dentro de cada um**.

## 8. Fluxo completo em SOA

```text
 1. PWA Cidadão salva no IndexedDB → POST /api/reportes (via Gateway)
 2. Gateway → Reportes: grava reportes + outbox(ReporteRecebido) na mesma transação → 201
 3. Outbox entrega ReporteRecebido
      ├─► Atendimento cria o chamado "aberto"
      └─► Postes vincula P-0001 ao protocolo
 4. PWA Técnico → GET /api/chamados?escopo=abertos (Gateway valida token na Identidade)
 5. Técnico fecha → POST /api/chamados/:protocolo/fechamento
      Atendimento: grava fechamento + outbox(ChamadoFechado, MateriaisUtilizados) → 201
 6. Outbox entrega
      ├─► Postes atualiza configuração e histórico
      ├─► Almoxarifado debita os reatores
      └─► Relatórios atualiza consolidado
```

## 9. Vantagens e desvantagens para o Ilumina

**Vantagens**

- Falha isolada: se Relatórios cair, o cidadão continua reportando.
- Cada serviço escala sozinho (ex.: Reportes pode receber picos após uma
  queda de energia na cidade, sem afetar o almoxarifado).
- Serviços reaproveitáveis por outros sistemas da prefeitura via HUB Central
  (ex.: o serviço de Identidade ou de Arquivos).
- Times diferentes podem trabalhar em serviços diferentes sem conflito de código.

**Desvantagens**

- **Complexidade operacional alta:** 7–8 processos Node, gateway, fila/outbox,
  monitoramento e logs distribuídos — para uma equipe acadêmica e um sistema
  municipal pequeno, é custo desproporcional.
- Consistência eventual: o débito de estoque não acontece "junto" com o
  fechamento; é preciso tratar falhas e compensações.
- Latência extra: cada chamada passa pelo gateway e às vezes por mais de um serviço.
- Testes mais difíceis: além dos testes de cada serviço, são necessários
  **testes de contrato** entre serviços e testes ponta a ponta com tudo no ar.

## 10. Recomendação: começar como monólito modular

Uma forma realista de aproveitar as ideias de SOA sem o custo de operação:

1. **Um único servidor Node.js**, mas com pastas por serviço
   (`modules/identidade`, `modules/atendimento`, `modules/almoxarifado`…).
2. Cada módulo expõe uma interface pública (`index.js`) e só ela pode ser
   importada pelos outros; as tabelas de cada módulo ficam num esquema SQL próprio.
3. Eventos entre módulos começam como chamadas internas (ou uma tabela outbox).
4. Quando um módulo precisar escalar ou ser reutilizado fora do Ilumina,
   ele vira um serviço separado sem reescrever as regras.

## 11. Comparação final das quatro arquiteturas

| Critério | MVC | Camadas | Cliente-servidor | SOA |
|---|---|---|---|---|
| O que descreve | organização da interface/entrada | organização do código inteiro | distribuição física (quem roda onde) | divisão por capacidade de negócio |
| Nº de deploys do backend | 1 | 1 | 1 servidor + banco | vários |
| Transação entre chamado e estoque | sim | sim | sim | não (consistência eventual) |
| Facilidade de teste unitário | boa | ótima | depende da organização interna | ótima por serviço, difícil no conjunto |
| Custo de operação | baixo | baixo | médio | alto |
| Adequação ao Ilumina hoje | **alta** | **alta** | **é o modelo de implantação** | baixa (só como evolução) |

**Leitura recomendada para o projeto:** cliente-servidor como modelo de
implantação (PWA ⇄ API Node ⇄ SQL), camadas dentro do servidor, MVC na
apresentação de cada lado e as fronteiras da SOA (seção 2) como divisão de
módulos — prontas para virar serviços se o sistema crescer.
