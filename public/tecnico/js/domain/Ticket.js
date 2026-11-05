/**
 * CAMADA DE DOMÍNIO (TÉCNICO) — Ticket.js
 * Regras puras para chamados no painel técnico, normalização de coordenadas e filtro de status.
 */

export function normalizarCoordenada(valor, tipo = 'lat') {
  let n = parseFloat(valor);
  if (!Number.isFinite(n)) return NaN;
  const limite = tipo === 'lng' ? 180 : 90;
  let guard = 0;
  while (Math.abs(n) > limite && guard < 12) {
    n = n / 10;
    guard++;
  }
  return n;
}

export function chamadoEstaAberto(ticket) {
  if (!ticket) return false;
  const st = String(ticket.status || '').toLowerCase();
  return st === 'aberto' || st === 'em_atendimento' || st === 'aguardando atendimento';
}

export function calcularDistanciaMetros(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (g) => (g * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}
