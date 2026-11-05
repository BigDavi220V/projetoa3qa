class SemPermissao extends Error {
  constructor(mensagem = 'Sem permissão para executar esta operação.') {
    super(mensagem);
    this.name = 'SemPermissao';
    this.status = 403;
    this.codigo = 'SEM_PERMISSAO';
  }
}

module.exports = SemPermissao;
