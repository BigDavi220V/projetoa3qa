# Conexão local com MySQL

Esta etapa configura somente a conexão entre a API Node.js e um servidor MySQL já existente. Não cria tabelas, importa o DER nem migra dados. Mantém o monólito modular em camadas: credenciais e driver ficam em `server/src/infrastructure/`; apresentação e domínio não acessam o banco diretamente.

## Configurar

1. Instale as dependências do backend, a partir da raiz:

   ```bash
   npm install --prefix server
   ```

2. Copie `.env.example` para `.env`, caso ainda não exista. Preencha os dados do seu servidor local:

   ```dotenv
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_NAME=db_iluminacao
   DB_USER=ilumina_app
   DB_PASSWORD=sua_senha_local
   ```

   O banco e o usuário devem existir no MySQL. O `.env` fica fora do Git; cada integrante configura suas próprias credenciais. Variáveis definidas no ambiente têm prioridade sobre o arquivo. Nenhuma credencial é incluída no JavaScript dos aplicativos.

3. Com o MySQL em execução, confirme o acesso:

   ```bash
   npm run db:check
   ```

   O comando executa apenas `SELECT 1`, `DATABASE()` e `VERSION()`, informa o banco e a versão do servidor e fecha as conexões. Retorna código de saída diferente de zero se o acesso falhar. Também funciona com `npm --prefix server run db:check`.

## Responsabilidades

- `server/src/infrastructure/config/env.js`: lê o `.env` da raiz, independentemente do diretório de execução.
- `server/src/infrastructure/database/pool.js`: usa `mysql2/promise`, mantém um pool e preserva o contrato `query()` com resultado `{ rows }` e `connect()` com `release()`.
- `server/src/infrastructure/database/transacao.js`: continua responsável por `BEGIN`, `COMMIT`, `ROLLBACK` e liberação da conexão.
- `server/scripts/check-db.js`: comprova o acesso ao servidor sem escrever dados.

## Limite desta entrega

Conexão confirmada não significa que toda a aplicação foi migrada. A entrega seguinte implementa os [itens 4 e 6](07-SPRINT2-ROTA-E-FECHAMENTO-ADMINISTRATIVO.md), liga seus fluxos à API e adapta os repositórios de chamados, fechamentos, usuários e sessões ao MySQL. O esquema ainda precisa ser alinhado ao DER do grupo e preparado; nenhuma tabela foi criada. Outros repositórios e `server/database/migrations/001_inicial.sql` ainda contêm SQL de PostgreSQL (`$1`, `RETURNING`, `ON CONFLICT`, entre outros). Não execute essa migration no MySQL.

O arquivo `.mwb.zip` é um modelo do MySQL Workbench; abri-lo no Workbench não cria nem inicia um servidor. Nenhuma rotina desta conexão executa esse modelo.
