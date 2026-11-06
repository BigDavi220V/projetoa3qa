const test = require('node:test');
const assert = require('node:assert/strict');
const { fecharChamadoAdmin } = require('../../src/application/services/FechamentoService');
const Fechamento = require('../../src/domain/Fechamento');
const { criarCenario } = require('../helpers/administrative-fixture');

const dados = {
  operacao_id: '11111111-1111-4111-8111-111111111111',
  informante: 'Responsável de teste', justificativa: 'Serviço confirmado pela equipe municipal.', status: 'Concluído'
};
const pedido = novosDados => ({ protocolo: 'IC-TESTE-1', gestorId: 7, dados: { ...dados, ...novosDados } });

test('Administrativo: exige UUID, informante, justificativa mínima e status permitido', () => {
  assert.equal(Fechamento.validarFechamentoAdmin(dados).valido, true);
  for (const invalido of [{ operacao_id: 'sem-uuid' }, { informante: ' ' }, { informante: 'a'.repeat(121) }, { justificativa: 'curta' }, { status: 'qualquer' }]) {
    assert.equal(Fechamento.validarFechamentoAdmin({ ...dados, ...invalido }).valido, false);
  }
  assert.equal(Fechamento.validarFechamentoAdmin(null).valido, false);
});

test('Administrativo: registra gestor, motivo e data, sem movimentar estoque nem salvar foto', async t => {
  const cenario = criarCenario();
  t.mock.method(require('../../src/infrastructure/repositories/EstoqueRepository'), 'baixarMateriais', () => assert.fail('Administrativo não debita materiais'));
  t.mock.method(require('../../src/infrastructure/storage/FotoStorage'), 'salvar', () => assert.fail('Administrativo não salva foto'));
  const resposta = await fecharChamadoAdmin(pedido({ informante: `  ${dados.informante} `, justificativa: ` ${dados.justificativa} ` }), cenario.deps);
  assert.equal(resposta.administrativo, true);
  assert.equal(resposta.tecnico_id, 7);
  assert.equal(resposta.informante, dados.informante);
  assert.ok(Number.isFinite(Date.parse(resposta.data_fechamento)));
  assert.equal(cenario.estado.chamado.status, 'fechado');
  assert.deepEqual(cenario.eventos, ['BEGIN', 'LOCK', 'OPERATION', 'INSERT', 'STATUS', 'COMMIT', 'RELEASE']);
});

test('Administrativo: dois reenvios simultâneos da mesma operação retornam o mesmo fechamento', async () => {
  const cenario = criarCenario();
  const resultados = await Promise.all([fecharChamadoAdmin(pedido(), cenario.deps), fecharChamadoAdmin(pedido(), cenario.deps)]);
  assert.deepEqual(resultados[0], resultados[1]);
  assert.equal(cenario.eventos.filter(evento => evento === 'INSERT').length, 1);
  assert.equal(cenario.eventos.filter(evento => evento === 'STATUS').length, 1);
});

test('Administrativo: outro fechamento concorrente recebe conflito', async () => {
  const cenario = criarCenario();
  const resultados = await Promise.allSettled([
    fecharChamadoAdmin(pedido(), cenario.deps),
    fecharChamadoAdmin(pedido({ operacao_id: '22222222-2222-4222-8222-222222222222' }), cenario.deps)
  ]);
  assert.equal(resultados[0].status, 'fulfilled');
  assert.equal(resultados[1].reason.status, 409);
  assert.equal(cenario.eventos.filter(evento => evento === 'INSERT').length, 1);
});

test('Administrativo: não reutiliza identificador com dados ou gestor diferentes', async () => {
  const cenario = criarCenario();
  await fecharChamadoAdmin(pedido(), cenario.deps);
  await assert.rejects(fecharChamadoAdmin(pedido({ justificativa: 'Outra justificativa para a mesma operação.' }), cenario.deps), { status: 409 });
  await assert.rejects(fecharChamadoAdmin({ ...pedido(), gestorId: 8 }, cenario.deps), { status: 409 });
  assert.equal(cenario.estado.fechamento.justificativa, dados.justificativa);
});

test('Administrativo: chamado inexistente retorna 404 e falha após inserir reverte a transação', async () => {
  const inexistente = criarCenario();
  await assert.rejects(fecharChamadoAdmin({ ...pedido(), protocolo: 'IC-INEXISTENTE' }, inexistente.deps), { status: 404 });
  const cenario = criarCenario();
  cenario.falharAoAtualizarStatus();
  await assert.rejects(fecharChamadoAdmin(pedido(), cenario.deps), /Falha simulada/);
  assert.equal(cenario.estado.fechamento, null);
  assert.equal(cenario.estado.chamado.status, 'aberto');
  assert.ok(cenario.eventos.includes('ROLLBACK'));
  assert.equal(cenario.eventos.at(-1), 'RELEASE');
});

test('API administrativa: parâmetro de rota malformado retorna 400 sem interromper o servidor', async () => {
  const app = require('../../src/app').criarApp();
  const resposta = await app.handle({ method: 'POST', url: '/api/chamados/%E0%A4%A/fechamento-admin', body: {}, headers: {} }, {});
  assert.equal(resposta.statusCode, 400);
  assert.equal(resposta.body.error.codigo, 'PARAMETRO_INVALIDO');
});

test('API administrativa: autenticação e perfil são aplicados antes da gravação', async t => {
  const pool = require('../../src/infrastructure/database/pool');
  const cenario = criarCenario();
  pool.setPool(cenario.pool);
  t.mock.method(require('../../src/infrastructure/repositories/SessaoRepository'), 'buscarSessaoValida', async token => {
    const perfil = { 'token-gestor': 'gestor', 'token-tecnico': 'tecnico' }[token];
    return perfil ? { usuario_id: 7, nome: 'Usuário de teste', perfil, expira_em: new Date(Date.now() + 60000) } : null;
  });
  for (const [nome, metodo] of Object.entries(cenario.ChamadoRepo)) t.mock.method(require('../../src/infrastructure/repositories/ChamadoRepository'), nome, metodo);
  for (const [nome, metodo] of Object.entries(cenario.FechamentoRepo)) t.mock.method(require('../../src/infrastructure/repositories/FechamentoRepository'), nome, metodo);
  const server = require('../../src/app').criarApp().listen(0);
  await new Promise(resolve => server.once('listening', resolve));
  t.after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); pool.setPool(null); });
  const url = `http://127.0.0.1:${server.address().port}/api/chamados/IC-TESTE-1/fechamento-admin`;
  const enviar = (token, body = dados) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });
  assert.equal((await enviar()).status, 401);
  assert.equal((await enviar('invalido')).status, 401);
  assert.equal((await enviar('token-tecnico')).status, 403);
  assert.equal(cenario.eventos.length, 0);
  assert.equal((await enviar('token-gestor', { ...dados, justificativa: 'curta' })).status, 400);
  const criado = await enviar('token-gestor');
  assert.equal(criado.status, 201);
  assert.equal((await criado.json()).data.administrativo, true);
  const repetido = await enviar('token-gestor');
  assert.equal(repetido.status, 201);
  assert.equal((await repetido.json()).data.id, 1);
  assert.equal(cenario.eventos.filter(evento => evento === 'INSERT').length, 1);
  assert.equal((await enviar('token-gestor', { ...dados, operacao_id: '33333333-3333-4333-8333-333333333333' })).status, 409);
});
