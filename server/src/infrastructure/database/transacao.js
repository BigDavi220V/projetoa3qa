/**
 * CAMADA DE INFRAESTRUTURA — Gerenciador de Transações ACID
 * Garante atomicidade (BEGIN ... COMMIT / ROLLBACK) em operações que envolvem
 * múltiplas tabelas (ex.: fechar chamado + debitar estoque + atualizar poste).
 */

const pool = require('./pool');

/**
 * Executa uma função assíncrona dentro de uma transação SQL única.
 * Se qualquer erro for lançado dentro de `operacao(tx)`, executa ROLLBACK automaticamente.
 *
 * @param {(tx: { query: Function }) => Promise<any>} operacao
 * @param {object} [customPool] Pool opcional para injeção em testes
 */
async function emTransacao(operacao, customPool = pool) {
  const client = await customPool.connect();
  try {
    await client.query('BEGIN');
    const resultado = await operacao(client);
    await client.query('COMMIT');
    return resultado;
  } catch (erro) {
    try {
      await client.query('ROLLBACK');
    } catch (_) {
      // Ignora erro secundário de rollback se a conexão caiu
    }
    throw erro;
  } finally {
    if (typeof client.release === 'function') {
      client.release();
    }
  }
}

module.exports = { emTransacao };
