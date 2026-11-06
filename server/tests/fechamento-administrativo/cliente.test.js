const test = require('node:test');
const assert = require('node:assert/strict');
const modulo = import('../../../public/tecnico/js/application/FecharAdministrativamente.js');
const baixa = { operacao_id: '11111111-1111-4111-8111-111111111111', protocolo: 'IC/TESTE 1', informante: 'Gestor de teste', justificativa: 'Serviço confirmado pela equipe.', status: 'Concluído' };

test('Cliente administrativo: valida antes de enviar e exige identificador estável e sessão', async () => {
  const { fecharAdministrativamente } = await modulo;
  const api = () => assert.fail('Dados inválidos não devem chegar à rede');
  assert.equal((await fecharAdministrativamente({ ...baixa, justificativa: 'curta' }, { api, token: 'teste' })).status, 400);
  assert.equal((await fecharAdministrativamente({ ...baixa, operacao_id: undefined }, { api, token: 'teste' })).status, 400);
  assert.equal((await fecharAdministrativamente(baixa, { api, token: null })).status, 401);
});

test('Cliente administrativo: usa REST e mantém o UUID ao repetir depois de falha de rede', async () => {
  const { fecharAdministrativamente } = await modulo;
  const pedidos = [];
  const api = async (url, opcoes) => {
    pedidos.push({ url, opcoes });
    if (pedidos.length === 1) throw new Error('Falha de rede');
    return { ok: true, status: 201, data: { id: 1 } };
  };
  await assert.rejects(fecharAdministrativamente(baixa, { api, token: 'teste' }), /Falha de rede/);
  assert.equal((await fecharAdministrativamente(baixa, { api, token: 'teste' })).sucesso, true);
  assert.deepEqual(pedidos[0], pedidos[1]);
  assert.equal(pedidos[0].url, '/api/chamados/IC%2FTESTE%201/fechamento-admin');
  assert.equal(pedidos[0].opcoes.token, 'teste');
  assert.equal(pedidos[0].opcoes.body.foto_reparo_base64, undefined);
});

test('Cliente administrativo: preserva conflito e acesso negado como falha', async () => {
  const { fecharAdministrativamente } = await modulo;
  for (const status of [401, 403, 409, 503]) {
    const resultado = await fecharAdministrativamente(baixa, { token: 'teste', api: async () => ({ ok: false, status, error: { mensagem: 'Falha de teste' } }) });
    assert.equal(resultado.sucesso, false);
    assert.equal(resultado.status, status);
  }
});
