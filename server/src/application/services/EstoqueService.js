/**
 * CAMADA DE APLICAÇÃO — EstoqueService
 * Casos de uso do almoxarifado: gestão de itens, saída de missões e relatórios de materiais.
 */

const { emTransacao: defaultEmTransacao } = require('../../infrastructure/database/transacao');
const EstoqueRepoDefault = require('../../infrastructure/repositories/EstoqueRepository');
const ItemEstoque = require('../../domain/ItemEstoque');
const Missao = require('../../domain/Missao');
const { DadoInvalido, NaoEncontrado } = require('../errors');

async function listarEstoque(deps = {}) {
  const EstoqueRepo = deps.EstoqueRepo || EstoqueRepoDefault;
  const itens = await EstoqueRepo.listarItens();
  return itens.map(item => ({
    ...item,
    alertaMinimo: ItemEstoque.abaixoDoMinimo(item)
  }));
}

async function salvarItemEstoque(dados, deps = {}) {
  const EstoqueRepo = deps.EstoqueRepo || EstoqueRepoDefault;
  const validacao = ItemEstoque.validarItemEstoque(dados);
  if (!validacao.valido) {
    throw new DadoInvalido(validacao.erros.join(' '), validacao.erros);
  }
  return EstoqueRepo.salvarItem(dados);
}

async function excluirItemEstoque(nomeOuId, deps = {}) {
  const EstoqueRepo = deps.EstoqueRepo || EstoqueRepoDefault;
  const removido = await EstoqueRepo.removerItem(nomeOuId);
  if (!removido) throw new NaoEncontrado('Item de estoque não encontrado.');
  return removido;
}

async function registrarSaidaMissao(dados, usuarioId, deps = {}) {
  const emTransacao = deps.emTransacao || defaultEmTransacao;
  const EstoqueRepo = deps.EstoqueRepo || EstoqueRepoDefault;

  const validacao = Missao.validarMissao(dados);
  if (!validacao.valido) {
    throw new DadoInvalido(validacao.erros.join(' '), validacao.erros);
  }

  return emTransacao(async (tx) => {
    return EstoqueRepo.criarMissaoComItens(tx, {
      data: dados.data,
      equipe: dados.equipe,
      obs: dados.obs,
      criadoPor: usuarioId,
      itens: dados.itens
    });
  });
}

async function listarMissoes(deps = {}) {
  const EstoqueRepo = deps.EstoqueRepo || EstoqueRepoDefault;
  return EstoqueRepo.listarMissoes();
}

module.exports = {
  listarEstoque,
  salvarItemEstoque,
  excluirItemEstoque,
  registrarSaidaMissao,
  listarMissoes
};
