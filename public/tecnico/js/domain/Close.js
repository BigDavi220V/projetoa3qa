/**
 * CAMADA DE DOMÍNIO (TÉCNICO) — Close.js
 * Entidade pura para baixa de chamado em campo (idempotente via `operacao_id`).
 */

export function gerarOperacaoId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function criarBaixa({
  operacaoId = gerarOperacaoId(),
  protocolo,
  status,
  servico,
  referencia = '',
  gps = null,
  fotoBase64 = null,
  posteId = '',
  config = {},
  materiais = []
} = {}) {
  return {
    operacao_id: operacaoId,
    protocolo: String(protocolo || '').trim(),
    status: String(status || '').trim(),
    servico: String(servico || '').trim(),
    referencia: String(referencia || '').trim(),
    lat: gps && gps.lat != null ? Number(gps.lat) : null,
    lng: gps && gps.lng != null ? Number(gps.lng) : null,
    foto_reparo_base64: fotoBase64 || null,
    poste_id: String(posteId || '').trim().toUpperCase(),
    config: config || {},
    materiais_os: Array.isArray(materiais) ? materiais : [],
    data_fechamento: new Date().toISOString(),
    sync: {
      estado: 'pending',
      attempts: 0,
      lastError: null
    }
  };
}

export function validarBaixa(baixa) {
  const erros = [];
  if (!baixa || !baixa.protocolo) erros.push('Protocolo do chamado é obrigatório.');
  if (!baixa || !baixa.status) erros.push('Selecione o status de atendimento.');
  if (!baixa || !baixa.servico) erros.push('Descreva o serviço realizado.');
  return erros;
}
