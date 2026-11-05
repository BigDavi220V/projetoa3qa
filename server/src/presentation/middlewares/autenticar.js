/**
 * CAMADA DE APRESENTAÇÃO — Middleware de Autenticação e Autorização por Perfil
 */

const AuthService = require('../../application/services/AuthService');
const { NaoAutenticado, SemPermissao } = require('../../application/errors');

function autenticar(perfisAceitos = ['tecnico', 'gestor']) {
  const listaPerfis = Array.isArray(perfisAceitos) ? perfisAceitos : [perfisAceitos];
  // Gestor também tem acesso às rotas de técnico
  if (listaPerfis.includes('tecnico') && !listaPerfis.includes('gestor')) {
    listaPerfis.push('gestor');
  }

  return async function middlewareAutenticacao(req, res, next) {
    try {
      const authHeader = req.headers && (req.headers.authorization || req.headers.Authorization);
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new NaoAutenticado('Cabeçalho Authorization: Bearer <token> é obrigatório.');
      }

      const token = authHeader.slice('Bearer '.length).trim();
      const usuario = await AuthService.validarTokenSessao(token);

      if (!listaPerfis.includes(usuario.perfil)) {
        throw new SemPermissao(`Esta rota exige perfil: ${listaPerfis.join(' ou ')}.`);
      }

      req.usuario = usuario;
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = autenticar;
