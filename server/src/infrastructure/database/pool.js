/**
 * CAMADA DE INFRAESTRUTURA — Pool de Conexões MySQL.
 * Mantém o contrato query/connect dos serviços, sem traduzir o dialeto SQL.
 */

require('../config/env');

let activePool = null;

function adaptarExecutor(executor) {
  return {
    async query(sql, valores) {
      const [rows] = await executor.query(sql, valores);
      return { rows };
    }
  };
}

function criarPoolPadrao() {
  const faltando = ['DB_USER', 'DB_NAME'].filter(chave => !process.env[chave]?.trim());
  if (faltando.length) {
    throw new Error(`Configure ${faltando.join(', ')} no .env da raiz antes de conectar ao MySQL.`);
  }

  const porta = Number(process.env.DB_PORT || 3306);
  if (!Number.isInteger(porta) || porta < 1 || porta > 65535) {
    throw new Error('DB_PORT deve ser uma porta válida entre 1 e 65535.');
  }

  const mysql = require('mysql2/promise');
  const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: porta,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    connectTimeout: 5000
  });

  return {
    ...adaptarExecutor(pool),
    async connect() {
      const conexao = await pool.getConnection();
      return {
        ...adaptarExecutor(conexao),
        release: () => conexao.release()
      };
    },
    end: () => pool.end()
  };
}

function getPool() {
  if (!activePool) {
    activePool = criarPoolPadrao();
  }
  return activePool;
}

/**
 * Permite injetar um pool de teste (mock/in-memory) em testes de unidade e integração.
 */
function setPool(customPool) {
  activePool = customPool;
}

module.exports = {
  getPool,
  setPool,
  query: (...args) => getPool().query(...args),
  connect: (...args) => getPool().connect(...args),
  async end() {
    const pool = activePool;
    activePool = null;
    if (pool && typeof pool.end === 'function') {
      await pool.end();
    }
  }
};
