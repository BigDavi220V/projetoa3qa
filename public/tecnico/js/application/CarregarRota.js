/**
 * CAMADA DE APLICAÇÃO (TÉCNICO / GESTOR) — CarregarRota.js
 * Ordena os chamados abertos por vizinho mais próximo (Nearest Neighbor) para planejar a rota do dia.
 */

import { normalizarCoordenada, chamadoEstaAberto, calcularDistanciaMetros } from '../domain/Ticket.js';

export function gerarRotaOtimizada(chamados = [], pontoPartida = { lat: -10.1256, lng: -36.1756 }) {
  const abertosComGps = chamados
    .filter(chamadoEstaAberto)
    .map((c) => ({
      ...c,
      latNorm: normalizarCoordenada(c.lat ?? c.latitude, 'lat'),
      lngNorm: normalizarCoordenada(c.lng ?? c.longitude, 'lng')
    }))
    .filter((c) => Number.isFinite(c.latNorm) && Number.isFinite(c.lngNorm));

  const restantes = [...abertosComGps];
  const rota = [];
  let atual = { lat: pontoPartida.lat, lng: pontoPartida.lng };

  while (restantes.length > 0) {
    let menorIdx = 0;
    let menorDist = Infinity;

    for (let i = 0; i < restantes.length; i++) {
      const d = calcularDistanciaMetros(atual.lat, atual.lng, restantes[i].latNorm, restantes[i].lngNorm);
      if (d < menorDist) {
        menorDist = d;
        menorIdx = i;
      }
    }

    const escolhido = restantes.splice(menorIdx, 1)[0];
    rota.push({
      ...escolhido,
      distanciaAnteriorMetros: menorDist
    });
    atual = { lat: escolhido.latNorm, lng: escolhido.lngNorm };
  }

  return rota;
}
