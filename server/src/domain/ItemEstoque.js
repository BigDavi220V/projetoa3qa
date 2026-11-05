/**
 * CAMADA DE DOMÍNIO — ItemEstoque
 * Regras puras de controle de saldo, estoque mínimo e validação de materiais do almoxarifado.
 */

const UNIDADES_VALIDAS = Object.freeze(['un', 'm', 'cx', 'rolo', 'kg', 'par']);

function temSaldoSuficiente(item, quantidadeRequisitada) {
  if (!item) return false;
  const saldoAtual = Number(item.saldo);
  const qtd = Number(quantidadeRequisitada);
  if (!Number.isFinite(saldoAtual) || !Number.isFinite(qtd) || qtd <= 0) return false;
  return saldoAtual >= qtd;
}

function abaixoDoMinimo(item) {
  if (!item) return false;
  return Number(item.saldo) < Number(item.minimo || 0);
}

function validarItemEstoque(dados = {}) {
  const erros = [];
  if (!dados.nome || typeof dados.nome !== 'string' || !dados.nome.trim()) {
    erros.push('Nome do item de estoque é obrigatório.');
  }
  const unidade = dados.unidade || 'un';
  if (!UNIDADES_VALIDAS.includes(unidade)) {
    erros.push(`Unidade inválida (${unidade}). Use: ${UNIDADES_VALIDAS.join(', ')}.`);
  }
  const saldo = Number(dados.saldo ?? 0);
  const minimo = Number(dados.minimo ?? 0);
  if (!Number.isFinite(saldo) || saldo < 0) {
    erros.push('Saldo não pode ser negativo.');
  }
  if (!Number.isFinite(minimo) || minimo < 0) {
    erros.push('Estoque mínimo não pode ser negativo.');
  }

  return {
    valido: erros.length === 0,
    erros
  };
}

module.exports = {
  UNIDADES_VALIDAS,
  temSaldoSuficiente,
  abaixoDoMinimo,
  validarItemEstoque
};
