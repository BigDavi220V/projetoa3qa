/**
 * CAMADA DE APRESENTAÇÃO — Rotas de Postes (QR Code e Histórico)
 */

const autenticar = require('../middlewares/autenticar');
const PosteController = require('../controllers/PosteController');

function registrarRotasPostes(router) {
  // Público: Cidadão escaneia o QR Code colado no poste (/?poste=P-0001)
  router.get('/api/postes/:id/situacao', PosteController.situacao);

  // Equipe Técnica / Gestor: Histórico e listagem de postes
  router.get('/api/postes', autenticar('tecnico'), PosteController.listar);
  router.get('/api/postes/:id/historico', autenticar('tecnico'), PosteController.historico);
}

module.exports = registrarRotasPostes;
