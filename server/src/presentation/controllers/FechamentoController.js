/**
 * CAMADA DE APRESENTAÇÃO — FechamentoController
 * Delega o fechamento de chamados ao FechamentoService (transacional ACID).
 */

const FechamentoService = require('../../application/services/FechamentoService');
const { ok } = require('../views/resposta');

async function fechar(req, res, next) {
  try {
    const resultado = await FechamentoService.fecharChamado({
      protocolo: req.params.protocolo,
      tecnicoId: req.usuario.id,
      dados: req.body
    });
    return ok(res, resultado, 201);
  } catch (err) {
    next(err);
  }
}

async function fecharAdmin(req, res, next) {
  try {
    const resultado = await FechamentoService.fecharChamadoAdmin({
      protocolo: req.params.protocolo,
      gestorId: req.usuario.id,
      dados: req.body
    });
    return ok(res, resultado, 201);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  fechar,
  fecharAdmin
};
