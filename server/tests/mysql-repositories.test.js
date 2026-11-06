const test = require('node:test');
const assert = require('node:assert/strict');
const Chamados = require('../src/infrastructure/repositories/ChamadoRepository');
const Fechamentos = require('../src/infrastructure/repositories/FechamentoRepository');
const Usuarios = require('../src/infrastructure/repositories/UsuarioRepository');
const Sessoes = require('../src/infrastructure/repositories/SessaoRepository');

function conferirParametros(sql, valores = []) {
  assert.equal((sql.match(/\?/g) || []).length, valores.length, 'Cada marcador SQL precisa de um valor vinculado');
  assert.doesNotMatch(sql, /\$\d|ON CONFLICT|RETURNING|::/);
}

test('Persistência MySQL: fechamento vincula os valores e devolve a linha inserida', async () => {
  const consultas = [];
  const informante = "Responsável d'água";
  const registro = { id: 9, informante };
  const tx = { async query(sql, valores) {
    conferirParametros(sql, valores);
    consultas.push({ sql, valores });
    return { rows: sql.startsWith('SELECT') ? [registro] : { insertId: 9 } };
  } };
  assert.deepEqual(await Fechamentos.inserir(tx, { operacaoId: 'op', chamadoId: 'chamado', tecnicoId: 7, status: 'Concluído', administrativo: true, informante, justificativa: 'Justificativa suficiente.' }), registro);
  assert.ok(consultas[0].valores.includes(informante));
  assert.ok(!consultas[0].sql.includes(informante));
  assert.ok(consultas[0].valores.at(-1) instanceof Date);
  assert.deepEqual(consultas[1].valores, [9]);
});

test('Persistência MySQL: colisão de protocolo não é confundida com reenvio do mesmo chamado', async () => {
  const duplicado = Object.assign(new Error('Protocolo já existe'), { code: 'ER_DUP_ENTRY' });
  const tx = { async query(sql, valores) {
    conferirParametros(sql, valores);
    if (sql.trimStart().startsWith('INSERT')) throw duplicado;
    return { rows: [] };
  } };
  await assert.rejects(Chamados.criarOuRetornarExistente(tx, { id: 'novo-id', protocolo: 'repetido', tipo: 'apagado' }), erro => erro === duplicado);
});

test('Persistência MySQL: estatísticas numéricas e vínculo de poste mantêm o contrato', async () => {
  const tx = { async query(sql, valores) {
    conferirParametros(sql, valores);
    if (sql.startsWith('UPDATE')) assert.deepEqual(valores, ['fechado', 'P-0001', 'chamado-1']);
    return { rows: [{ total: 3, abertos: '2', atendidos: '1' }] };
  } };
  assert.deepEqual(await Chamados.obterEstatisticas(tx), { total: 3, abertos: 2, atendidos: 1 });
  await Chamados.mudarStatus(tx, 'chamado-1', 'fechado', 'P-0001');
});

test('Persistência MySQL: login e sessão usam parâmetros, inclusive listas de perfis', async () => {
  const tx = { async query(sql, valores) { conferirParametros(sql, valores); return { rows: [] }; } };
  assert.deepEqual(await Usuarios.listarAtivosPorPerfis([], tx), []);
  await Usuarios.listarAtivosPorPerfis(['tecnico', 'gestor'], tx);
  await Usuarios.buscarPorId(7, tx);
  await Sessoes.buscarSessaoValida('token de teste', tx);
  await Sessoes.contarFalhasRecentesPorIp('127.0.0.1', 15, tx);
  await Sessoes.registrarTentativaLogin({ ip: '127.0.0.1', perfil: 'gestor', sucesso: false }, tx);
  await Sessoes.criarSessao({ token: 'teste', usuarioId: 7, expiraEm: new Date(Date.now() + 60000).toISOString() }, tx);
});
