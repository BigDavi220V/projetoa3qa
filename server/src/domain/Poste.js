/**
 * CAMADA DE DOMÍNIO — Poste
 * Regras puras para identificação de postes (QR Code), normalização de ID e configuração física.
 */

const PADRAO_POSTE_ID = /^P-\d{1,6}$/;

/**
 * Normaliza códigos lidos de QR Code ou digitados (ex.: "p0001" -> "P-0001").
 * Retorna string vazia se não for um código de poste válido.
 */
function normalizarPosteId(raw) {
  if (!raw) return '';
  let limpo = String(raw).trim().toUpperCase();

  const matchUrl = /[?&]POSTE=([A-Z0-9-]+)/i.exec(limpo);
  if (matchUrl) {
    limpo = matchUrl[1].toUpperCase();
  }

  if (/^P\d+$/.test(limpo)) {
    limpo = limpo.replace(/^P/, 'P-');
  }
  limpo = limpo.replace(/^P--+/, 'P-');

  return PADRAO_POSTE_ID.test(limpo) ? limpo : '';
}

/**
 * Mescla a configuração técnica anterior do poste com os novos componentes informados na baixa.
 */
function mesclarConfiguracao(atual = {}, nova = {}) {
  const campos = [
    'codigo', 'bairro', 'rua', 'referencia', 'endereco',
    'braco', 'luminaria', 'reator', 'fotosensor',
    'porta_fusivel', 'fusivel', 'cabo', 'conector', 'obs'
  ];
  const resultado = { ...atual };
  for (const campo of campos) {
    if (nova[campo] !== undefined && nova[campo] !== null && String(nova[campo]).trim() !== '') {
      resultado[campo] = String(nova[campo]).trim();
    }
  }
  return resultado;
}

module.exports = {
  PADRAO_POSTE_ID,
  normalizarPosteId,
  mesclarConfiguracao
};
