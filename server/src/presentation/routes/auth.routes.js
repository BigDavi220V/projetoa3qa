/**
 * CAMADA DE APRESENTAÇÃO — Rotas de Autenticação por PIN (com Rate Limit)
 */

const limitarTentativas = require('../middlewares/limitarTentativas');
const validar = require('../middlewares/validar');
const AuthController = require('../controllers/AuthController');

function registrarRotasAuth(router) {
  const rateLimiter = limitarTentativas({ maxPorJanela: 8, janelaMs: 60_000 });

  router.post('/api/auth/login', rateLimiter, validar(['pin']), AuthController.loginTecnico);
  router.post('/api/auth/almoxarifado', rateLimiter, validar(['pin']), AuthController.loginAlmoxarifado);
}

module.exports = registrarRotasAuth;
