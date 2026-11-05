/**
 * CAMADA DE INFRAESTRUTURA — Pool de Conexões SQL (PostgreSQL)
 */

let activePool = null;

function criarPoolPadrao() {
  try {
    const { Pool } = require('pg');
    return new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
      max: Number(process.env.DB_POOL_MAX || 10),
      idleTimeoutMillis: 30000
    });
  } catch (err) {
    return {
      async query() {
        throw new Error('Driver PostgreSQL (pg) não inicializado ou DATABASE_URL ausente.');
      },
      async connect() {
        throw new Error('Driver PostgreSQL (pg) não inicializado ou DATABASE_URL ausente.');
      }
    };
  }
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
  connect: (...args) => getPool().connect(...args)
};
