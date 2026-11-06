/**
 * CAMADA DE APRESENTAÇÃO — Middleware Central de Tratamento de Erros
 * Traduz erros de aplicação/domínio para os códigos HTTP semânticos do contrato REST:
 * - DadoInvalido     -> 400
 * - NaoAutenticado   -> 401
 * - SemPermissao     -> 403
 * - NaoEncontrado    -> 404
 * - Conflito         -> 409
 * - Foto muito grande-> 413
 * - MuitasTentativas -> 429
 */

const { erro } = require('../views/resposta');

function tratarErros(err, req, res, next) {
  if (err.code === 'ER_DUP_ENTRY') {
    return erro(res, 409, 'CONFLITO', 'A operação conflita com um registro já existente.');
  }
  if (['ER_NO_SUCH_TABLE', 'ER_BAD_FIELD_ERROR', 'ECONNREFUSED'].includes(err.code)) {
    return erro(res, 503, 'SERVICO_INDISPONIVEL', 'Serviço temporariamente indisponível. Tente novamente mais tarde.');
  }
  const status = err.status || 500;
  const codigo = err.codigo || 'ERRO_INTERNO';
  const mensagem = status === 500
    ? 'Erro interno no servidor.'
    : (err.message || 'Erro ao processar requisição.');

  return erro(res, status, codigo, mensagem, err.detalhes);
}

module.exports = tratarErros;
