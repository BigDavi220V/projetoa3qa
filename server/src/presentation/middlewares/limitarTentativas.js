/**
 * CAMADA DE APRESENTAÇÃO — Middleware de Limite de Tentativas (Rate Limit em Memória + IP)
 * Complementa a auditoria persistente em `tentativas_login` do AuthService.
 */

const { MuitasTentativas } = require('../../application/errors');

function extrairIp(req) {
  const forwarded = req.headers && req.headers['x-forwarded-for'];
  if (forwarded) return String(forwarded).split(',')[0].trim();
  return (req.socket && req.socket.remoteAddress) || req.ip || '127.0.0.1';
}

function limitarTentativas({ maxPorJanela = 10, janelaMs = 60_000 } = {}) {
  const contadores = new Map();

  return function middlewareRateLimit(req, res, next) {
    const ip = extrairIp(req);
    req.clientIp = ip;
    const agora = Date.now();

    const registro = contadores.get(ip);
    if (!registro || agora > registro.expiraEm) {
      contadores.set(ip, { count: 1, expiraEm: agora + janelaMs });
      return next();
    }

    registro.count += 1;
    if (registro.count > maxPorJanela) {
      return next(new MuitasTentativas('Limite de requisições excedido. Aguarde um minuto.'));
    }

    return next();
  };
}

module.exports = limitarTentativas;
module.exports.extrairIp = extrairIp;
