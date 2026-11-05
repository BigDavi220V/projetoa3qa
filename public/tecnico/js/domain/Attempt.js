/**
 * CAMADA DE DOMÍNIO (TÉCNICO) — Attempt.js
 * Entidade pura para registro de visita sem resolução imediata.
 */

import { gerarOperacaoId } from './Close.js';

export function criarTentativa({
  operacaoId = gerarOperacaoId(),
  protocolo,
  motivo,
  gps = null,
  fotoBase64 = null
} = {}) {
  return {
    operacao_id: operacaoId,
    protocolo: String(protocolo || '').trim(),
    motivo: String(motivo || '').trim(),
    lat: gps && gps.lat != null ? Number(gps.lat) : null,
    lng: gps && gps.lng != null ? Number(gps.lng) : null,
    foto_base64: fotoBase64 || null,
    criado_em: new Date().toISOString()
  };
}

export function validarTentativa(tentativa) {
  const erros = [];
  if (!tentativa || !tentativa.protocolo) erros.push('Protocolo é obrigatório.');
  if (!tentativa || !tentativa.motivo) erros.push('Informe o motivo da tentativa.');
  return erros;
}
