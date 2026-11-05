const NaoEncontrado = require('./NaoEncontrado');
const Conflito = require('./Conflito');
const SemPermissao = require('./SemPermissao');

class DadoInvalido extends Error {
  constructor(mensagem = 'Dados inválidos na requisição.', detalhes = []) {
    super(mensagem);
    this.name = 'DadoInvalido';
    this.status = 400;
    this.codigo = 'DADO_INVALIDO';
    this.detalhes = detalhes;
  }
}

class NaoAutenticado extends Error {
  constructor(mensagem = 'Sessão inválida ou expirada.') {
    super(mensagem);
    this.name = 'NaoAutenticado';
    this.status = 401;
    this.codigo = 'NAO_AUTENTICADO';
  }
}

class MuitasTentativas extends Error {
  constructor(mensagem = 'Muitas tentativas de login. Aguarde alguns minutos.') {
    super(mensagem);
    this.name = 'MuitasTentativas';
    this.status = 429;
    this.codigo = 'MUITAS_TENTATIVAS';
  }
}

module.exports = {
  NaoEncontrado,
  Conflito,
  SemPermissao,
  DadoInvalido,
  NaoAutenticado,
  MuitasTentativas
};
