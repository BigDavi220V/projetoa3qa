const test = require('node:test');
const assert = require('node:assert/strict');
const modulos = Promise.all([
  import('../../../public/tecnico/js/application/CarregarRota.js'),
  import('../../../public/tecnico/js/presentation/MapView.js')
]);
const origem = { lat: -10.125, lng: -36.175 };
const chamado = (protocolo, lat, lng, status = 'aberto') => ({ protocolo, lat, lng, status });

test('Rota: agrupa chamados a até 80 m e ordena as paradas a partir do GPS informado', async () => {
  const [{ gerarRotaOtimizada }] = await modulos;
  const registros = [chamado('longe', -10.145, -36.175), chamado('perto', -10.126, -36.175), chamado('vizinho', -10.1261, -36.175)];
  const antes = structuredClone(registros);
  const rota = gerarRotaOtimizada(registros, origem);
  assert.equal(rota.stops.length, 2);
  assert.deepEqual(rota.stops[0].chamados.map(c => c.protocolo), ['perto', 'vizinho']);
  assert.equal(rota.stops[1].chamados[0].protocolo, 'longe');
  assert.ok(rota.stops.every(parada => Number.isFinite(parada.distFromPrev) && parada.distFromPrev >= 0));
  assert.equal(rota.startLat, origem.lat);
  assert.deepEqual(registros, antes);
});

test('Rota: exclui fechados, cancelados, GPS ausente, zero e coordenadas fora dos limites', async () => {
  const [{ gerarRotaOtimizada }] = await modulos;
  const registros = [
    chamado('fechado', -10.12, -36.17, 'fechado'), chamado('cancelado', -10.12, -36.17, 'cancelado'),
    chamado('vazio', null, null), chamado('zero', 0, 0), chamado('fora', 100, -36), chamado('texto', '-10abc', '-36'),
    chamado('em-atendimento', '-10,125', '-36,175', 'em_atendimento'), chamado('legado', -10.13, -36.17, 'Aguardando atendimento')
  ];
  const protocolos = gerarRotaOtimizada(registros, origem).stops.flatMap(parada => parada.chamados.map(c => c.protocolo));
  assert.deepEqual(protocolos, ['em-atendimento', 'legado']);
});

test('Rota: não inventa origem e aceita lista vazia com origem válida', async () => {
  const [{ gerarRotaOtimizada }] = await modulos;
  for (const invalida of [undefined, { lat: 0, lng: 0 }, { lat: null, lng: -36 }, { lat: -91, lng: -36 }]) {
    assert.throws(() => gerarRotaOtimizada([], invalida), /ponto de partida/);
  }
  assert.deepEqual(gerarRotaOtimizada([], origem).stops, []);
});

test('Maps: divide a rota para navegadores móveis sem perder paradas e encadeia as origens', async () => {
  const [, { MapView }] = await modulos;
  const rota = { startLat: origem.lat, startLng: origem.lng, stops: Array.from({ length: 13 }, (_, i) => ({ lat: -10.13 - i / 100, lng: -36.17 })) };
  const links = new MapView(null).criarLinksDaRota(rota).map(link => new URL(link));
  assert.equal(links.length, 4);
  const coordenadas = [];
  links.forEach((link, i) => {
    const intermediarios = (link.searchParams.get('waypoints') || '').split('|').filter(Boolean);
    assert.ok(intermediarios.length <= 3);
    assert.equal(link.searchParams.get('origin'), i ? links[i - 1].searchParams.get('destination') : `${origem.lat},${origem.lng}`);
    coordenadas.push(...intermediarios, link.searchParams.get('destination'));
  });
  assert.deepEqual(coordenadas, rota.stops.map(parada => `${parada.lat},${parada.lng}`));
});
