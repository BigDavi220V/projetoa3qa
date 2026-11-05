class NaoEncontrado extends Error {
  constructor(mensagem = 'Recurso não encontrado.') {
    super(mensagem);
    this.name = 'NaoEncontrado';
    this.status = 404;
    this.codigo = 'NAO_ENCONTRADO';
  }
}

module.exports = NaoEncontrado;
