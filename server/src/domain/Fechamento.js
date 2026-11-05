/**
 * CAMADA DE DOMÍNIO — Fechamento
 * Regras puras para validação de baixa em campo (técnico) e baixa administrativa (gestor).
 */

/**
 * Valida os dados obrigatórios para fechar um chamado em campo.
 */
function validarFechamentoCampo(dados = {}) {
  const erros = [];

  if (!dados.operacao_id || typeof dados.operacao_id !== 'string') {
    erros.push('Identificador da operação (operacao_id) é obrigatório para idempotência.');
  }
  if (!dados.status || typeof dados.status !== 'string' || !dados.status.trim()) {
    erros.push('Status de resolução é obrigatório.');
  }
  if (!dados.servico || typeof dados.servico !== 'string' || !dados.servico.trim()) {
    erros.push('Descrição do serviço executado é obrigatória.');
  }
  if (Array.isArray(dados.materiais_os)) {
    for (const mat of dados.materiais_os) {
      if (!mat.nome && !mat.item_id) {
        erros.push('Todo material utilizado deve identificar o item.');
      }
      if (Number(mat.quantidade) <= 0 || !Number.isFinite(Number(mat.quantidade))) {
        erros.push(`Quantidade inválida para o material ${mat.nome || mat.item_id}.`);
      }
    }
  }

  return {
    valido: erros.length === 0,
    erros
  };
}

/**
 * Valida os dados obrigatórios para fechamento administrativo pelo gestor.
 */
function validarFechamentoAdmin(dados = {}) {
  const erros = [];

  if (!dados.operacao_id || typeof dados.operacao_id !== 'string') {
    erros.push('Identificador da operação (operacao_id) é obrigatório.');
  }
  if (!dados.informante || typeof dados.informante !== 'string' || !dados.informante.trim()) {
    erros.push('Nome do informante/responsável é obrigatório no fechamento administrativo.');
  }
  if (!dados.justificativa || typeof dados.justificativa !== 'string' || !dados.justificativa.trim()) {
    erros.push('Justificativa é obrigatória no fechamento administrativo.');
  }

  return {
    valido: erros.length === 0,
    erros
  };
}

module.exports = {
  validarFechamentoCampo,
  validarFechamentoAdmin
};
