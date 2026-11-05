/**
 * CAMADA DE APRESENTAÇÃO — AuthController
 */

const AuthService = require('../../application/services/AuthService');
const { extrairIp } = require('../middlewares/limitarTentativas');
const { ok } = require('../views/resposta');

async function loginTecnico(req, res, next) {
  try {
    const sessao = await AuthService.autenticarPorPin({
      pin: req.body && req.body.pin,
      ip: req.clientIp || extrairIp(req),
      perfisPermitidos: ['tecnico', 'gestor']
    });
    return ok(res, sessao);
  } catch (err) {
    next(err);
  }
}

async function loginAlmoxarifado(req, res, next) {
  try {
    const sessao = await AuthService.autenticarPorPin({
      pin: req.body && req.body.pin,
      ip: req.clientIp || extrairIp(req),
      perfisPermitidos: ['almoxarife', 'gestor']
    });
    return ok(res, sessao);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  loginTecnico,
  loginAlmoxarifado
};
