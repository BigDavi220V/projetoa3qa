/**
 * CAMADA DE PERSISTÊNCIA / INFRAESTRUTURA — ChamadoRepository
 * Contém exclusivamente consultas SQL parametrizadas sobre a tabela `chamados`.
 */

const pool = require('../database/pool');

/**
 * Insere um chamado de forma idempotente (ON CONFLICT (id) DO UPDATE).
 * Se o celular reenviar o mesmo UUID após timeout de rede, devolve o registro já salvo.
 */
async function criarOuRetornarExistente(tx = pool, dados) {
  const { rows } = await tx.query(
    `INSERT INTO chamados (
       id, protocolo, tipo, status, latitude, longitude, precisao_m,
       descricao, nome, telefone, endereco, foto_url, poste_id, user_agent, criado_em
     )
     VALUES ($1,$2,$3,'aberto',$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
     ON CONFLICT (id) DO UPDATE SET id = EXCLUDED.id
     RETURNING *`,
    [
      dados.id,
      dados.protocolo,
      dados.tipo,
      dados.latitude ?? null,
      dados.longitude ?? null,
      dados.precisao_m ?? null,
      dados.descricao || null,
      dados.nome || null,
      dados.telefone || null,
      dados.endereco || null,
      dados.fotoUrl || null,
      dados.posteId || null,
      dados.userAgent || null,
      dados.criadoEm || new Date().toISOString()
    ]
  );
  return rows[0];
}

/**
 * Busca o chamado pelo protocolo e trava a linha (`FOR UPDATE`) dentro da transação
 * para impedir que dois técnicos fechem o mesmo chamado simultaneamente.
 */
async function buscarParaAtualizar(tx, protocolo) {
  const { rows } = await tx.query(
    'SELECT * FROM chamados WHERE protocolo = $1 FOR UPDATE',
    [protocolo]
  );
  return rows[0] || null;
}

async function buscarPorProtocolo(protocolo, tx = pool) {
  const { rows } = await tx.query(
    'SELECT * FROM chamados WHERE protocolo = $1',
    [protocolo]
  );
  return rows[0] || null;
}

async function listar(escopo = 'abertos', tx = pool) {
  if (escopo === 'abertos') {
    const { rows } = await tx.query(
      `SELECT * FROM chamados
       WHERE status IN ('aberto', 'em_atendimento')
       ORDER BY criado_em ASC`
    );
    return rows;
  }
  const { rows } = await tx.query('SELECT * FROM chamados ORDER BY criado_em DESC LIMIT 500');
  return rows;
}

async function obterEstatisticas(tx = pool) {
  const { rows } = await tx.query(
    `SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE status IN ('aberto', 'em_atendimento'))::int AS abertos,
       COUNT(*) FILTER (WHERE status = 'fechado')::int AS atendidos
     FROM chamados`
  );
  return rows[0] || { total: 0, abertos: 0, atendidos: 0 };
}

async function mudarStatus(tx, id, novoStatus, posteId = null) {
  if (posteId) {
    await tx.query(
      'UPDATE chamados SET status = $1, poste_id = COALESCE(poste_id, $3) WHERE id = $2',
      [novoStatus, id, posteId]
    );
  } else {
    await tx.query(
      'UPDATE chamados SET status = $1 WHERE id = $2',
      [novoStatus, id]
    );
  }
}

module.exports = {
  criarOuRetornarExistente,
  buscarParaAtualizar,
  buscarPorProtocolo,
  listar,
  obterEstatisticas,
  mudarStatus
};
