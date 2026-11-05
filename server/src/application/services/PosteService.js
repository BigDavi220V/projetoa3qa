/**
 * CAMADA DE APLICAÇÃO — PosteService
 * Consulta de situação do poste (anti-duplicata no QR do cidadão) e histórico técnico.
 */

const PosteRepoDefault = require('../../infrastructure/repositories/PosteRepository');
const Poste = require('../../domain/Poste');
const { DadoInvalido, NaoEncontrado } = require('../errors');

async function verificarSituacao(rawId, deps = {}) {
  const PosteRepo = deps.PosteRepo || PosteRepoDefault;
  const posteId = Poste.normalizarPosteId(rawId);
  if (!posteId) {
    throw new DadoInvalido('Identificador de poste inválido. Formato esperado: P-0001.');
  }

  const [poste, chamadoAberto, historico] = await Promise.all([
    PosteRepo.buscarPorId(posteId),
    PosteRepo.buscarChamadoAbertoNoPoste(posteId),
    PosteRepo.listarHistoricoDoPoste(posteId)
  ]);

  if (!poste) {
    return {
      existe: false,
      poste_id: posteId,
      poste: null,
      chamado_aberto: null
    };
  }

  return {
    existe: true,
    poste: {
      ...poste,
      lat: poste.latitude != null ? Number(poste.latitude) : null,
      lng: poste.longitude != null ? Number(poste.longitude) : null,
      qtd: historico.length
    },
    chamado_aberto: chamadoAberto
      ? {
          protocolo: chamadoAberto.protocolo,
          tipo: chamadoAberto.tipo,
          descricao: chamadoAberto.descricao,
          data: chamadoAberto.criado_em
        }
      : null
  };
}

async function obterHistorico(rawId, deps = {}) {
  const PosteRepo = deps.PosteRepo || PosteRepoDefault;
  const posteId = Poste.normalizarPosteId(rawId);
  if (!posteId) {
    throw new DadoInvalido('Identificador de poste inválido.');
  }

  const poste = await PosteRepo.buscarPorId(posteId);
  if (!poste) {
    throw new NaoEncontrado(`Poste ${posteId} não encontrado.`);
  }

  const chamados = await PosteRepo.listarHistoricoDoPoste(posteId);
  return {
    poste: {
      ...poste,
      qtd: chamados.length
    },
    chamados
  };
}

async function listarPostes(bairro = '', deps = {}) {
  const PosteRepo = deps.PosteRepo || PosteRepoDefault;
  return PosteRepo.listarTodos(bairro);
}

module.exports = {
  verificarSituacao,
  obterHistorico,
  listarPostes
};
