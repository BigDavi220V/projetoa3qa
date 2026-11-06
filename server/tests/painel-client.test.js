const test = require('node:test');
const assert = require('node:assert/strict');
const modulos = Promise.all([
  import('../../public/shared/infrastructure/ApiClient.js'),
  import('../../public/tecnico/js/presentation/ListView.js')
]);
const origem = { lat: -10.125, lng: -36.175 };

test('ApiClient: o corpo não pode transformar HTTP 403 em sucesso nem alterar seu status', async () => {
  const [{ api }] = await modulos;
  const resposta = await api('/teste', { fetchImpl: async () => ({ ok: false, status: 403, text: async () => JSON.stringify({ ok: true, success: true, status: 201 }) }) });
  assert.equal(resposta.ok, false);
  assert.equal(resposta.status, 403);
});

test('Apresentação: chamados da API mantêm os campos usados pela tela e seus filtros', async () => {
  const [, { ListView }] = await modulos;
  const registros = new ListView(null).prepararRegistros([{ protocolo: 'IC-1', status: 'em_atendimento', fotoUrl: '/foto.jpg', criadoEm: '2026-11-05T12:00:00Z', lat: origem.lat, lng: origem.lng }]);
  assert.equal(registros[0].status, 'Aguardando atendimento');
  assert.equal(registros[0].foto_thumb, '/foto.jpg');
  assert.equal(registros[0].lat, origem.lat);
});
