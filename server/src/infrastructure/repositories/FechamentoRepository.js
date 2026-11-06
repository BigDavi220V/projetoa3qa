/**
 * CAMADA DE PERSISTÊNCIA / INFRAESTRUTURA — FechamentoRepository
 * Persiste baixas em campo e administrativas de forma idempotente.
 */

const pool = require('../database/pool');

async function buscarPorOperacaoId(tx = pool, operacaoId) {
  // O serviço trava o chamado antes desta leitura. Evita bloquear lacunas do índice
  // MySQL para UUIDs ausentes, o que causaria deadlocks entre chamados diferentes.
  const { rows } = await tx.query(
    'SELECT * FROM fechamentos WHERE operacao_id = ?',
    [operacaoId]
  );
  return rows[0] || null;
}

async function inserir(tx = pool, dados) {
  const { rows: resultado } = await tx.query(
    `INSERT INTO fechamentos (
       operacao_id, chamado_id, tecnico_id, status, servico, referencia,
       latitude, longitude, foto_url, administrativo, informante, justificativa, data_fechamento
     )
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
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
      new Date(dados.dataFechamento || Date.now())
    ]
  );
  const { rows } = await tx.query('SELECT * FROM fechamentos WHERE id = ?', [resultado.insertId]);
  return rows[0];
}

module.exports = {
  buscarPorOperacaoId,
  inserir
};
