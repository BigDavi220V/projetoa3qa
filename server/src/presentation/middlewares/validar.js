/**
 * CAMADA DE APRESENTAÇÃO — Middleware de Validação de Corpo HTTP
 */

const { DadoInvalido } = require('../../application/errors');

function validar(camposObrigatorios = []) {
  return function middlewareValidacao(req, res, next) {
    const corpo = req.body || {};
    const faltando = camposObrigatorios.filter(
      campo => corpo[campo] === undefined || corpo[campo] === null || corpo[campo] === ''
    );
    if (faltando.length > 0) {
      return next(
        new DadoInvalido(
          `Campos obrigatórios ausentes: ${faltando.join(', ')}.`,
          faltando.map(c => `O campo '${c}' é obrigatório.`)
        )
      );
    }
    next();
  };
}

module.exports = validar;
