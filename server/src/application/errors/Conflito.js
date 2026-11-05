class Conflito extends Error {
  constructor(mensagem = 'Conflito de estado na operação.') {
    super(mensagem);
    this.name = 'Conflito';
    this.status = 409;
    this.codigo = 'CONFLITO';
  }
}

module.exports = Conflito;
