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
  const status = err.status || 500;
  const codigo = err.codigo || 'ERRO_INTERNO';
  const mensagem = status === 500
    ? 'Erro interno no servidor.'
    : (err.message || 'Erro ao processar requisição.');

  return erro(res, status, codigo, mensagem, err.detalhes);
}

module.exports = tratarErros;
