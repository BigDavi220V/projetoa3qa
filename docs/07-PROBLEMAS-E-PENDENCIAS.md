# Problemas e pendências — Ilumina Coruripe

Lista para consulta do que falta resolver antes de colocar a nova arquitetura em produção.

- **Levantamento feito em:** 05/11/2026, na branch `test/funcionalidades-offline`.
- **Situação geral:** as camadas novas existem e os 13 testes automáticos passam, mas o sistema ainda não funciona de ponta a ponta. A causa principal é o item [P01](#p01).

## Como ler esta lista

**Como cada item foi verificado:**

- **Executado:** o comportamento foi reproduzido rodando o código.
- **Leitura:** a conclusão vem da leitura do código, sem execução. Vale confirmar ao corrigir.

**Prioridade:**

- **Crítica:** impede o sistema de funcionar.
- **Alta:** risco real de segurança, perda de informação ou dado errado.
- **Média:** deve ser corrigido, mas não impede o uso.
- **Baixa:** melhoria ou limpeza.

## Resumo

| ID | Problema | Prioridade | Verificação |
|---|---|---|---|
| [P01](#p01) | Telas não conversam com o novo servidor | Crítica | Executado |
| [P02](#p02) | Três funções da tela não têm rota no servidor | Crítica | Leitura |
| [P03](#p03) | Banco sem instalação automática e sem usuários | Crítica | Leitura |
| [P04](#p04) | Servidor não lê o `.env` e o driver do banco não está instalado | Crítica | Leitura |
| [P05](#p05) | Fotos salvas não podem ser abertas | Crítica | Executado |
| [P06](#p06) | Seguir o guia faz o build falhar | Crítica | Executado |
| [P07](#p07) | Publicação unificada pendente e endereço do servidor provisório | Crítica | Leitura |
| [P08](#p08) | Dados da planilha sem plano de migração | Crítica | Leitura |
| [P09](#p09) | Reportes antigos na fila do celular são incompatíveis | Alta | Leitura |
| [S01](#s01) | Bloqueio de tentativas de PIN pode ser burlado | Alta | Executado |
| [S02](#s02) | Envio público de reportes sem limite | Alta | Leitura |
| [S03](#s03) | Upload aceita conteúdo que não é imagem e links externos | Alta | Leitura |
| [S04](#s04) | CORS liberado para qualquer site por padrão | Média | Leitura |
| [S05](#s05) | Login identifica o usuário só pelo PIN | Média | Leitura |
| [D01](#d01) | Material repetido deixa o registro diferente do estoque | Alta | Executado |
| [D02](#d02) | Fotos ficam órfãs quando a operação falha ou é reenviada | Média | Leitura |
| [D03](#d03) | Alguns conflitos do banco viram "erro interno" | Média | Leitura |
| [D04](#d04) | Erros internos não ficam registrados | Média | Leitura |
| [D05](#d05) | Sessões e tentativas antigas nunca são apagadas | Baixa | Leitura |
| [Q01](#q01) | Testes não cobrem a integração | Alta | Leitura |
| [Q02](#q02) | Testes não rodam automaticamente | Média | Leitura |
| [Q03](#q03) | Documentação desatualizada | Média | Leitura |

## Funcionamento

<a id="p01"></a>
### P01 — Telas não conversam com o novo servidor

Os botões ainda executam o código antigo, escrito para o Google Apps Script. As camadas novas são carregadas, mas nenhuma tela as utiliza.

Ao simular os pedidos das telas no servidor:

| Tela | O que envia | Resposta |
|---|---|---|
| Login do técnico | `POST /api` com `{ action: 'login' }` | 404: a rota não existe |
| Reporte do cidadão | `POST /api/chamados` em formato de formulário | 400: JSON inválido |

Trocar só o formato não basta:

- O reporte antigo não envia o `id`, que o servidor exige.
- As telas do técnico enviam o token no corpo do pedido, e o servidor espera o cabeçalho `Authorization: Bearer`.

**Onde:** `postReport` e `buildPayload` em [`public/index.html`](../public/index.html); `apiFetchTO` em [`public/tecnico/index.html`](../public/tecnico/index.html).

**O que fazer:** ligar as telas às camadas novas e remover o código antigo, começando pelo app do cidadão, que é menor.

<a id="p02"></a>
### P02 — Três funções da tela não têm rota no servidor

| Ação na tela | Para que serve | Situação no servidor |
|---|---|---|
| `list_attempts` | Listar tentativas de atendimento | Sem rota de listagem |
| `missao_return` | Registrar o retorno de material de uma missão | Só existe a validação no domínio |
| `material_report` | Relatório de materiais | Sem rota nem serviço |

**O que fazer:** criar essas rotas antes de migrar as telas correspondentes, ou essas funções deixarão de existir.

<a id="p03"></a>
### P03 — Banco sem instalação automática e sem usuários

- Não há comando que aplique [`001_inicial.sql`](../server/database/migrations/001_inicial.sql).
- Nenhum usuário é criado nessa instalação, e não existe rota para cadastrar usuários. Em um banco novo, ninguém consegue fazer login.
- O PIN precisa ser gravado como hash, então não dá para cadastrá-lo digitando o número direto no banco.

**O que fazer:** criar um comando de migração e outro para cadastrar o primeiro gestor com o PIN em hash.

<a id="p04"></a>
### P04 — Servidor não lê o `.env` e o driver do banco não está instalado

- [`server/src/app.js`](../server/src/app.js) usa `process.env`, mas nada carrega o arquivo `.env`. As variáveis `DATABASE_URL` e `PORT` do `.env.example` são ignoradas ao rodar `npm run start:server`.
- O driver `pg` só está declarado em [`server/package.json`](../server/package.json). O `npm install` na raiz não o instala, e não há lockfile no servidor.
- Sem o driver, o servidor sobe normalmente e só falha quando precisa do banco.

**O que fazer:** carregar o `.env` na inicialização, documentar a instalação em `server/` e versionar o lockfile.

<a id="p05"></a>
### P05 — Fotos salvas não podem ser abertas

O servidor grava a foto e guarda um endereço como `/uploads/fotos/arquivo.jpg`, mas nenhuma rota entrega esse arquivo. O teste retornou **404**. O proxy do Netlify e da Vercel também só encaminha `/api/*`.

**O que fazer:** servir os arquivos com segurança ou adotar um bucket (veja a [decisão 3](#decisoes)).

<a id="p06"></a>
### P06 — Seguir o guia faz o build falhar

| Situação | Resultado |
|---|---|
| Copiar `.env.example` para `.env` sem editar, como manda o [guia para iniciantes](05-GUIA-PARA-INICIANTES.md) | Build abortado: `ENDPOINT_CIDADAO` ainda tem o valor de exemplo |
| Deixar `ILUMINA_API_URL` vazia para usar o proxy, como sugere o comentário do `.env.example` | Build abortado: exige os endpoints antigos |

Com isso, a configuração recomendada para produção, com proxy na mesma origem, não passa no build.

**O que fazer:** ajustar [`scripts/build-config.mjs`](../scripts/build-config.mjs) para não exigir os endpoints antigos, e corrigir o `.env.example` e o guia.

<a id="p07"></a>
### P07 — Publicação unificada pendente e endereço do servidor provisório

- O [`netlify.toml`](../netlify.toml) e o [`vercel.json`](../vercel.json) apontam para `api-ilumina-coruripe.onrender.com`. O próprio `netlify.toml` indica que esse endereço deve ser trocado pela URL real.
- Não há configuração para publicar o servidor Node.js nem o banco.
- Segundo o README, os sites em produção ainda são os dois antigos.
- As plaquetas instaladas apontam para `iluminacoruripe.netlify.app`. Esse domínio não pode ser desligado sem antes ser redirecionado para o site novo.

<a id="p08"></a>
### P08 — Dados da planilha sem plano de migração

Os dados atuais estão no Google Sheets, e o repositório não tem ferramenta para importá-los ao PostgreSQL. Sem isso, o sistema novo começaria sem chamados, postes, estoque e usuários.

**O que fazer:** definir o que será importado, criar o script e combinar a virada para não perder chamados abertos durante a troca.

<a id="p09"></a>
### P09 — Reportes antigos na fila do celular são incompatíveis

Os dois códigos usam a mesma fila local (`ilumina_v2`), mas os reportes antigos têm número sequencial como identificador, e não UUID. O código novo usaria esse número como `id`, que a coluna do banco não aceita. Esses reportes podem ficar presos, sem chegar ao servidor.

**O que fazer:** converter os registros antigos ao ligar as telas (P01) e testar com uma fila real.

## Segurança

<a id="s01"></a>
### S01 — Bloqueio de tentativas de PIN pode ser burlado

O servidor identifica quem está tentando pelo cabeçalho `X-Forwarded-For`, que pode ser inventado por quem faz o pedido. No teste do limitador, o IP repetido foi bloqueado, mas bastou trocar o valor do cabeçalho para ser liberado. O contador de falhas do [`AuthService`](../server/src/application/services/AuthService.js) recebe o mesmo IP.

Como o PIN pode ter só 4 dígitos, um atacante poderia testar as combinações sem ser barrado.

**Onde:** `extrairIp` em [`limitarTentativas.js`](../server/src/presentation/middlewares/limitarTentativas.js).

**O que fazer:** só confiar nesse cabeçalho quando vier do proxy conhecido e considerar um limite geral de falhas, além do limite por IP.

<a id="s02"></a>
### S02 — Envio público de reportes sem limite

`POST /api/chamados` não exige login, o que é esperado, mas também não tem limite de frequência. Cada pedido pode ter até 8 MB, então alguém pode encher o disco e a lista de chamados com dados falsos.

**O que fazer:** aplicar um limite por origem nessa rota.

<a id="s03"></a>
### S03 — Upload aceita conteúdo que não é imagem e links externos

Em [`FotoStorage.js`](../server/src/infrastructure/storage/FotoStorage.js):

- Conteúdo que não é reconhecido como imagem é gravado mesmo assim, com extensão `.jpg`.
- Um endereço `http(s)` é aceito como foto. Pela rota pública, alguém pode fazer um link externo aparecer como foto do chamado.

**O que fazer:** validar o conteúdo real do arquivo e não aceitar links vindos do público.

<a id="s04"></a>
### S04 — CORS liberado para qualquer site por padrão

Sem a variável `CORS_ORIGIN`, o servidor usa `*`. O [documento de cliente-servidor](03-ARQUITETURA-CLIENTE-SERVIDOR.md) determina o contrário para rotas autenticadas. Essa variável também não aparece no `.env.example`.

**O que fazer:** não permitir qualquer origem por padrão e documentar a variável.

<a id="s05"></a>
### S05 — Login identifica o usuário só pelo PIN

O login não pede nome nem matrícula: o servidor compara o PIN com o de cada usuário ativo.

- Com dois usuários usando o mesmo PIN, entra o primeiro encontrado, e o serviço pode ficar registrado no nome errado.
- Com mais usuários cadastrados, cada PIN digitado tem mais chances de acertar alguém.
- A comparação é propositalmente lenta, então cada tentativa fica mais cara para o servidor conforme a equipe cresce.

**O que fazer:** avaliar o uso de um identificador junto com o PIN (veja a [decisão 4](#decisoes)).

## Dados e operação

<a id="d01"></a>
### D01 — Material repetido deixa o registro diferente do estoque

Se o mesmo material vier duas vezes em um fechamento, as duas quantidades são descontadas, mas só a última fica registrada. No teste com banco simulado, LED 1 + LED 2 **descontou 3 e registrou 2**.

**Onde:** `baixarMateriais` em [`EstoqueRepository.js`](../server/src/infrastructure/repositories/EstoqueRepository.js).

**O que fazer:** somar as quantidades ou rejeitar itens repetidos, e criar um teste para o caso.

<a id="d02"></a>
### D02 — Fotos ficam órfãs quando a operação falha ou é reenviada

A foto é gravada antes da transação do banco, em [`FechamentoService.js`](../server/src/application/services/FechamentoService.js) e [`ChamadoService.js`](../server/src/application/services/ChamadoService.js). Se a operação for desfeita, o arquivo fica no disco. Cada reenvio da fila offline também grava uma nova cópia.

**O que fazer:** verificar o reenvio antes de gravar e definir uma limpeza para arquivos sem uso.

<a id="d03"></a>
### D03 — Alguns conflitos do banco viram "erro interno"

Estes casos violam regras do banco e, pela leitura do código, retornam 500 sem explicação ao usuário:

- Excluir um item de estoque já usado em fechamentos ou missões.
- Dois reportes com ids diferentes e o mesmo protocolo. É raro, mas a fila continuaria reenviando sem sucesso.

**O que fazer:** traduzir esses erros em respostas claras, como 409.

<a id="d04"></a>
### D04 — Erros internos não ficam registrados

[`tratarErros.js`](../server/src/presentation/middlewares/tratarErros.js) responde "Erro interno no servidor" e descarta a causa. Em produção, não haveria como investigar uma falha.

**O que fazer:** registrar o erro no log do servidor, sem incluir PIN, token ou foto.

<a id="d05"></a>
### D05 — Sessões e tentativas antigas nunca são apagadas

As tabelas `sessoes` e `tentativas_login` só crescem, e não há rota de logout para encerrar uma sessão antes de expirar.

**O que fazer:** criar uma limpeza periódica e a rota de logout.

## Qualidade e documentação

<a id="q01"></a>
### Q01 — Testes não cobrem a integração

Os 13 testes verificam regras e serviços com peças simuladas. Isso explica por que eles passam mesmo com o P01 aberto. Faltam testes de:

- Rotas HTTP e formato dos pedidos.
- SQL em um PostgreSQL real.
- Telas e funcionamento offline em um navegador.

**O que fazer:** adicionar primeiro um teste de ponta a ponta do reporte do cidadão.

<a id="q02"></a>
### Q02 — Testes não rodam automaticamente

O repositório não tem integração contínua, então um commit pode quebrar os testes sem ninguém perceber.

**O que fazer:** rodar `npm test` a cada push e em todo pull request.

<a id="q03"></a>
### Q03 — Documentação desatualizada

| Documento | O que está errado |
|---|---|
| [`README.md`](../README.md) | Descreve o backend como Apps Script com planilha, inclusive login e variáveis |
| [`03-ARQUITETURA-CLIENTE-SERVIDOR.md`](03-ARQUITETURA-CLIENTE-SERVIDOR.md) | Cita `/api/postes/:id/situacao`, que foi removida, e `/api/relatorios`, que não existe |
| [`01-ARQUITETURA-MVC.md`](01-ARQUITETURA-MVC.md) | Cita as mesmas rotas e diz que os QR continuam válidos |
| [`04-ARQUITETURA-ORIENTADA-A-SERVICOS.md`](04-ARQUITETURA-ORIENTADA-A-SERVICOS.md) | Ainda cita QR e a rota removida. Como é uma alternativa não adotada, a correção é opcional |
| [`05-GUIA-PARA-INICIANTES.md`](05-GUIA-PARA-INICIANTES.md) | Os passos de instalação levam ao erro do P06 |
| [`001_inicial.sql`](../server/database/migrations/001_inicial.sql) | Comentário ainda relaciona o id do poste ao QR Code físico |

<a id="decisoes"></a>
## Decisões a tomar

Estes pontos dependem da equipe, e não só de programação:

1. **Reportes duplicados:** junto com o QR Code, saiu o aviso de "já existe um chamado aberto para este poste". Hoje, vários moradores podem abrir chamados para o mesmo problema. Isso é aceitável, ou deve haver outra forma de detectar duplicados, por exemplo por proximidade do GPS?
2. **Vínculo com o poste:** o reporte do cidadão não informa mais o poste. O vínculo só é feito quando o técnico fecha o chamado. Isso atende ao gestor e ao histórico de cada poste?
3. **Armazenamento de fotos:** usar o disco do servidor ou um bucket? Só o disco está implementado, e é preciso confirmar se a hospedagem escolhida mantém os arquivos após reinícios.
4. **Login:** manter só o PIN ou incluir um identificador do usuário?
5. **Plaquetas instaladas:** continuam nos postes, sem função além de abrir o formulário, ou serão retiradas? Até quando o domínio antigo será mantido?

## O que ainda não foi verificado

Este levantamento **não** cobre os itens abaixo, então podem existir outros problemas:

- Migração e consultas em um PostgreSQL real.
- Disputa real entre dois técnicos no banco. O teste atual simula esse cenário.
- Funcionamento offline e service workers em um celular ou navegador.
- Publicação em Netlify, Vercel ou Render.
- Funcionamento dos sites antigos e do Apps Script em produção.

## Ordem sugerida

1. **Rodar o servidor com um banco real:** P03 e P04.
2. **Permitir testes locais e publicação:** P06.
3. **Tomar as decisões pendentes:** [lista acima](#decisoes), porque elas afetam as telas.
4. **Fechar as falhas graves de dados e segurança:** D01, S01, S02 e S03.
5. **Ligar o app do cidadão com teste de ponta a ponta:** P01, P09 e Q01.
6. **Ligar o app do técnico:** P02, P05 e o restante do P01.
7. **Preparar a produção:** P07, P08, D03, D04, S04, S05 e Q02.
8. **Finalizar:** Q03, D02 e D05.
