/**
 * CAMADA DE PERSISTÊNCIA / INFRAESTRUTURA — ChamadoRepository
 * Contém exclusivamente consultas SQL parametrizadas sobre a tabela `chamados`.
 */

const pool = require('../database/pool');

/**
 * Insere um chamado e reconhece reenvios pelo UUID, sem sobrescrever outro protocolo.
 * Se o celular reenviar o mesmo UUID após timeout de rede, devolve o registro já salvo.
 */
async function criarOuRetornarExistente(tx = pool, dados) {
  let duplicado;
  try {
    await tx.query(
    `INSERT INTO chamados (
       id, protocolo, tipo, status, latitude, longitude, precisao_m,
       descricao, nome, telefone, endereco, foto_url, poste_id, user_agent, criado_em
     )
     VALUES (?,?,?,'aberto',?,?,?,?,?,?,?,?,?,?,?)`,
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
      new Date(dados.criadoEm || Date.now())
    ]
    );
  } catch (erro) {
    if (erro.code !== 'ER_DUP_ENTRY') throw erro;
    duplicado = erro;
  }
  const { rows } = await tx.query('SELECT * FROM chamados WHERE id = ? FOR UPDATE', [dados.id]);
  if (!rows[0] && duplicado) throw duplicado;
  return rows[0];
}

/**
 * Busca o chamado pelo protocolo e trava a linha (`FOR UPDATE`) dentro da transação
 * para impedir que dois técnicos fechem o mesmo chamado simultaneamente.
 */
async function buscarParaAtualizar(tx, protocolo) {
  const { rows } = await tx.query(
    'SELECT * FROM chamados WHERE protocolo = ? FOR UPDATE',
    [protocolo]
  );
  return rows[0] || null;
}

async function buscarPorProtocolo(protocolo, tx = pool) {
  const { rows } = await tx.query(
    'SELECT * FROM chamados WHERE protocolo = ?',
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
       COUNT(*) AS total,
       COALESCE(SUM(status IN ('aberto', 'em_atendimento')), 0) AS abertos,
       COALESCE(SUM(status = 'fechado'), 0) AS atendidos
     FROM chamados`
  );
  const registro = rows[0] || {};
  return { total: Number(registro.total || 0), abertos: Number(registro.abertos || 0), atendidos: Number(registro.atendidos || 0) };
}

async function mudarStatus(tx, id, novoStatus, posteId = null) {
  if (posteId) {
    await tx.query(
      'UPDATE chamados SET status = ?, poste_id = COALESCE(poste_id, ?) WHERE id = ?',
      [novoStatus, posteId, id]
    );
  } else {
    await tx.query(
      'UPDATE chamados SET status = ? WHERE id = ?',
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
