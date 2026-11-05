/**
 * CAMADA DE PERSISTÊNCIA / INFRAESTRUTURA — FechamentoRepository
 * Persiste baixas em campo e administrativas de forma idempotente.
 */

const pool = require('../database/pool');

async function buscarPorOperacaoId(tx = pool, operacaoId) {
  const { rows } = await tx.query(
    'SELECT * FROM fechamentos WHERE operacao_id = $1',
    [operacaoId]
  );
  return rows[0] || null;
}

async function inserir(tx = pool, dados) {
  const { rows } = await tx.query(
    `INSERT INTO fechamentos (
       operacao_id, chamado_id, tecnico_id, status, servico, referencia,
       latitude, longitude, foto_url, administrativo, informante, justificativa, data_fechamento
     )
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     ON CONFLICT (operacao_id) DO UPDATE SET operacao_id = EXCLUDED.operacao_id
     RETURNING *`,
    [
      dados.operacaoId,
      dados.chamadoId,
      dados.tecnicoId || null,
      dados.status,
      dados.servico || null,
      dados.referencia || null,
      dados.latitude ?? null,
      dados.longitude ?? null,
      dados.fotoUrl || null,
      Boolean(dados.administrativo),
      dados.informante || null,
      dados.justificativa || null,
      dados.dataFechamento || new Date().toISOString()
    ]
  );
  return rows[0];
}

module.exports = {
  buscarPorOperacaoId,
  inserir
};
