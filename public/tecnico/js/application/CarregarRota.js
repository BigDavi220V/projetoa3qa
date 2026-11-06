/** Planeja paradas de manutenção por proximidade, sem depender de tela ou rede. */
import { normalizarCoordenada, coordenadasValidas, chamadoEstaAberto, calcularDistanciaMetros } from '../domain/Ticket.js';

const RAIO_PARADA_METROS = 80;

export function gerarRotaOtimizada(chamados = [], pontoPartida) {
  if (!pontoPartida || !coordenadasValidas(pontoPartida.lat, pontoPartida.lng)) {
    throw new Error('Defina um ponto de partida com localização válida.');
  }
  const startLat = normalizarCoordenada(pontoPartida.lat);
  const startLng = normalizarCoordenada(pontoPartida.lng, 'lng');
  const elegiveis = chamados.filter(chamadoEstaAberto).map(chamado => ({
    ...chamado,
    lat: normalizarCoordenada(chamado.lat ?? chamado.latitude),
    lng: normalizarCoordenada(chamado.lng ?? chamado.longitude, 'lng')
  })).filter(chamado => coordenadasValidas(chamado.lat, chamado.lng));

  // Cada grupo usa o primeiro chamado como referência, preservando o raio de 80 m.
  const grupos = [];
  const usados = new Set();
  for (let i = 0; i < elegiveis.length; i++) {
    if (usados.has(i)) continue;
    const grupo = [elegiveis[i]];
    usados.add(i);
    for (let j = i + 1; j < elegiveis.length; j++) {
      if (!usados.has(j) && calcularDistanciaMetros(elegiveis[i].lat, elegiveis[i].lng, elegiveis[j].lat, elegiveis[j].lng) <= RAIO_PARADA_METROS) {
        grupo.push(elegiveis[j]);
        usados.add(j);
      }
    }
    grupos.push({
      lat: grupo.reduce((soma, chamado) => soma + chamado.lat, 0) / grupo.length,
      lng: grupo.reduce((soma, chamado) => soma + chamado.lng, 0) / grupo.length,
      chamados: grupo
    });
  }

  const stops = [];
  let atual = { lat: startLat, lng: startLng };
  while (grupos.length) {
    let menorIdx = 0;
    let menorDist = Infinity;
    for (let i = 0; i < grupos.length; i++) {
      const distancia = calcularDistanciaMetros(atual.lat, atual.lng, grupos[i].lat, grupos[i].lng);
      if (distancia < menorDist) {
        menorDist = distancia;
        menorIdx = i;
      }
    }
    const parada = grupos.splice(menorIdx, 1)[0];
    stops.push({ ...parada, distFromPrev: menorDist });
    atual = parada;
  }
  return { stops, startLat, startLng, generatedAt: Date.now() };
}
