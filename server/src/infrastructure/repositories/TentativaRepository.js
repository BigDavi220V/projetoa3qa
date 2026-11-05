/**
 * CAMADA DE PERSISTÊNCIA / INFRAESTRUTURA — TentativaRepository
 */

const pool = require('../database/pool');

async function inserir(tx = pool, dados) {
  const { rows } = await tx.query(
    `INSERT INTO tentativas (
       operacao_id, chamado_id, tecnico_id, motivo, latitude, longitude, foto_url
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (operacao_id) DO UPDATE SET operacao_id = EXCLUDED.operacao_id
     RETURNING *`,
    [
      dados.operacaoId,
      dados.chamadoId,
      dados.tecnicoId,
      dados.motivo,
      dados.latitude ?? null,
      dados.longitude ?? null,
      dados.fotoUrl || null
    ]
  );
  return rows[0];
}

async function listar(tx = pool) {
  const { rows } = await tx.query(
    `SELECT t.*, c.protocolo, u.nome AS tecnico_nome
     FROM tentativas t
     JOIN chamados c ON c.id = t.chamado_id
     LEFT JOIN usuarios u ON u.id = t.tecnico_id
     ORDER BY t.criado_em DESC`
  );
  return rows;
}

module.exports = {
  inserir,
  listar
};
