/** Verifica a conexão sem criar banco, tabelas ou registros. */
const pool = require('../src/infrastructure/database/pool');

async function main() {
  try {
    const { rows } = await pool.query('SELECT 1 AS conectado, DATABASE() AS banco, VERSION() AS versao');
    if (rows[0]?.conectado !== 1) {
      throw new Error('O servidor não confirmou a conexão.');
    }
    console.log(`Conexão MySQL confirmada: ${rows[0].banco} (servidor ${rows[0].versao}).`);
  } catch (erro) {
    console.error('Falha na conexão MySQL:', erro.code || erro.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
