/**
 * CAMADA DE PERSISTÊNCIA / INFRAESTRUTURA — UsuarioRepository
 */

const pool = require('../database/pool');

async function listarAtivosPorPerfis(perfis = ['tecnico', 'gestor'], tx = pool) {
  const { rows } = await tx.query(
    'SELECT * FROM usuarios WHERE ativo = TRUE AND perfil = ANY($1::varchar[])',
    [perfis]
  );
  return rows;
}

async function buscarPorId(id, tx = pool) {
  const { rows } = await tx.query(
    'SELECT id, nome, perfil, ativo FROM usuarios WHERE id = $1',
    [id]
  );
  return rows[0] || null;
}

module.exports = {
  listarAtivosPorPerfis,
  buscarPorId
};
