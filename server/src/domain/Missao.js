/**
 * CAMADA DE DOMÍNIO — Missão
 * Regras puras para saída e devolução de materiais de manutenção em campo.
 */

function validarMissao(dados = {}) {
  const erros = [];
  if (!dados.data || typeof dados.data !== 'string') {
    erros.push('Data da missão é obrigatória.');
  }
  if (!dados.equipe || typeof dados.equipe !== 'string' || !dados.equipe.trim()) {
    erros.push('Identificação da equipe é obrigatória.');
  }
  if (!Array.isArray(dados.itens) || dados.itens.length === 0) {
    erros.push('A missão deve conter pelo menos um item de saída.');
  } else {
    for (const item of dados.itens) {
      if (!item.item_id && !item.nome) {
        erros.push('Item da missão sem identificação.');
      }
      if (!Number.isFinite(Number(item.qtd_saida)) || Number(item.qtd_saida) <= 0) {
        erros.push('Quantidade de saída deve ser maior que zero.');
      }
    }
  }
  return {
    valido: erros.length === 0,
    erros
  };
}

function validarRetornoMissao(itensMissao = [], retornos = []) {
  const erros = [];
  const mapaSaida = new Map(itensMissao.map(i => [String(i.item_id || i.nome), Number(i.qtd_saida)]));

  for (const ret of retornos) {
    const chave = String(ret.item_id || ret.nome);
    const qtdRetorno = Number(ret.qtd_retorno);
    if (!Number.isFinite(qtdRetorno) || qtdRetorno < 0) {
      erros.push(`Quantidade de retorno inválida para o item ${chave}.`);
      continue;
    }
    const qtdSaida = mapaSaida.get(chave);
    if (qtdSaida !== undefined && qtdRetorno > qtdSaida) {
      erros.push(`Retorno (${qtdRetorno}) não pode ser maior que a saída (${qtdSaida}) do item ${chave}.`);
    }
  }

  return {
    valido: erros.length === 0,
    erros
  };
}

module.exports = {
  validarMissao,
  validarRetornoMissao
};
