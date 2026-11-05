/**
 * CAMADA DE DOMÍNIO (TÉCNICO / ALMOXARIFADO) — StockItem.js
 * Regras puras para validação de itens de estoque no cliente.
 */

export function criarStockItem({ nome, unidade = 'un', saldo = 0, minimo = 0 } = {}) {
  return {
    nome: String(nome || '').trim(),
    unidade: String(unidade || 'un').trim(),
    saldo: Number(saldo),
    minimo: Number(minimo)
  };
}

export function validarStockItem(item) {
  const erros = [];
  if (!item || !item.nome) erros.push('Informe o nome do material.');
  if (!Number.isFinite(item.saldo) || item.saldo < 0) erros.push('O saldo não pode ser negativo.');
  if (!Number.isFinite(item.minimo) || item.minimo < 0) erros.push('O estoque mínimo não pode ser negativo.');
  return erros;
}
