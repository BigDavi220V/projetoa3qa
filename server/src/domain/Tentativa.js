/**
 * CAMADA DE DOMÍNIO — Tentativa
 * Regras puras para registro de visita técnica sem resolução imediata.
 */

function validarTentativa(dados = {}) {
  const erros = [];

  if (!dados.operacao_id || typeof dados.operacao_id !== 'string') {
    erros.push('Identificador da operação (operacao_id) é obrigatório.');
  }
  if (!dados.motivo || typeof dados.motivo !== 'string' || !dados.motivo.trim()) {
    erros.push('Motivo da não resolução é obrigatório.');
  }

  return {
    valido: erros.length === 0,
    erros
  };
}

module.exports = {
  validarTentativa
};
