const test = require('node:test');
const assert = require('node:assert/strict');
const pool = require('../src/infrastructure/database/pool');

function preservarAmbiente(t) {
  const chaves = ['DB_USER', 'DB_NAME', 'DB_PORT'];
  const anterior = Object.fromEntries(chaves.map(chave => [chave, process.env[chave]]));
  pool.setPool(null);
  t.after(async () => {
    await pool.end();
    for (const chave of chaves) {
      if (anterior[chave] === undefined) delete process.env[chave];
      else process.env[chave] = anterior[chave];
    }
  });
}

test('MySQL: configuração incompleta informa somente as chaves ausentes', t => {
  preservarAmbiente(t);
  delete process.env.DB_USER;
  delete process.env.DB_NAME;
  assert.throws(() => pool.getPool(), /Configure DB_USER, DB_NAME no \.env/);

  process.env.DB_USER = 'usuario_teste';
  assert.throws(() => pool.getPool(), /Configure DB_NAME no \.env/);
});

test('MySQL: rejeita portas inválidas antes de tentar uma conexão', t => {
  preservarAmbiente(t);
  process.env.DB_USER = 'usuario_teste';
  process.env.DB_NAME = 'banco_teste';
  for (const porta of ['abc', '0', '-1', '65536', '3306.5']) {
    process.env.DB_PORT = porta;
    assert.throws(() => pool.getPool(), /DB_PORT deve ser uma porta válida/);
  }
});
