/**
 * CAMADA DE PERSISTÊNCIA / INFRAESTRUTURA — SessaoRepository
 * Gerencia sessões stateless (tabela `sessoes`) e auditoria de rate limit (`tentativas_login`).
 */

const pool = require('../database/pool');

async function criarSessao({ token, usuarioId, expiraEm }, tx = pool) {
  const { rows } = await tx.query(
    `INSERT INTO sessoes (token, usuario_id, expira_em)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [token, usuarioId, expiraEm]
  );
  return rows[0];
}

async function buscarSessaoValida(token, tx = pool) {
  const { rows } = await tx.query(
    `SELECT s.token, s.expira_em, u.id AS usuario_id, u.nome, u.perfil, u.ativo
     FROM sessoes s
     JOIN usuarios u ON u.id = s.usuario_id
     WHERE s.token = $1 AND s.expira_em > now() AND u.ativo = TRUE`,
    [token]
  );
  return rows[0] || null;
}

async function contarFalhasRecentesPorIp(ip, janelaMinutos = 15, tx = pool) {
  const { rows } = await tx.query(
    `SELECT COUNT(*)::int AS falhas
     FROM tentativas_login
     WHERE ip = $1
       AND sucesso = FALSE
       AND criado_em > now() - ($2 || ' minutes')::interval`,
    [ip, String(janelaMinutos)]
  );
  return rows[0] ? rows[0].falhas : 0;
}

async function registrarTentativaLogin({ ip, perfil, sucesso }, tx = pool) {
  await tx.query(
    `INSERT INTO tentativas_login (ip, perfil, sucesso)
     VALUES ($1, $2, $3)`,
    [ip || '0.0.0.0', perfil || null, Boolean(sucesso)]
  );
}

module.exports = {
  criarSessao,
  buscarSessaoValida,
  contarFalhasRecentesPorIp,
  registrarTentativaLogin
};
