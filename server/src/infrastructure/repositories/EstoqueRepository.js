/**
 * CAMADA DE PERSISTÊNCIA / INFRAESTRUTURA — EstoqueRepository
 * Operações SQL de estoque, baixa de materiais em fechamento e controle de missões.
 */

const pool = require('../database/pool');
const { Conflito, NaoEncontrado } = require('../../application/errors');

async function listarItens(tx = pool) {
  const { rows } = await tx.query('SELECT * FROM itens_estoque ORDER BY nome ASC');
  return rows;
}

async function salvarItem(dados, tx = pool) {
  const { rows } = await tx.query(
    `INSERT INTO itens_estoque (nome, unidade, saldo, minimo, atualizado_em)
     VALUES ($1, $2, $3, $4, now())
     ON CONFLICT (nome) DO UPDATE SET
       unidade       = EXCLUDED.unidade,
       saldo         = EXCLUDED.saldo,
       minimo        = EXCLUDED.minimo,
       atualizado_em = now()
     RETURNING *`,
    [dados.nome.trim(), dados.unidade || 'un', Number(dados.saldo || 0), Number(dados.minimo || 0)]
  );
  return rows[0];
}

async function removerItem(nomeOuId, tx = pool) {
  const isNum = /^\d+$/.test(String(nomeOuId));
  const query = isNum
    ? 'DELETE FROM itens_estoque WHERE id = $1 RETURNING *'
    : 'DELETE FROM itens_estoque WHERE nome = $1 RETURNING *';
  const { rows } = await tx.query(query, [nomeOuId]);
  return rows[0] || null;
}

/**
 * Debita materiais utilizados no fechamento de um chamado dentro da mesma transação ACID.
 * Usa `SELECT ... FOR UPDATE` no item do estoque e valida saldo antes de debitar.
 */
async function baixarMateriais(tx, fechamentoId, materiais = []) {
  if (!Array.isArray(materiais) || materiais.length === 0) return [];

  const baixados = [];
  for (const mat of materiais) {
    const qtd = Number(mat.quantidade);
    if (!Number.isFinite(qtd) || qtd <= 0) continue;

    const buscaQuery = mat.item_id
      ? 'SELECT * FROM itens_estoque WHERE id = $1 FOR UPDATE'
      : 'SELECT * FROM itens_estoque WHERE nome = $1 FOR UPDATE';
    const chave = mat.item_id || mat.nome;

    const { rows } = await tx.query(buscaQuery, [chave]);
    const item = rows[0];
    if (!item) {
      throw new NaoEncontrado(`Material '${chave}' não encontrado no almoxarifado.`);
    }
    if (Number(item.saldo) < qtd) {
      throw new Conflito(
        `Saldo insuficiente para '${item.nome}': disponível ${item.saldo} ${item.unidade}, solicitado ${qtd}.`
      );
    }

    await tx.query(
      'UPDATE itens_estoque SET saldo = saldo - $1, atualizado_em = now() WHERE id = $2',
      [qtd, item.id]
    );

    await tx.query(
      `INSERT INTO fechamento_materiais (fechamento_id, item_id, quantidade)
       VALUES ($1, $2, $3)
       ON CONFLICT (fechamento_id, item_id) DO UPDATE SET quantidade = EXCLUDED.quantidade`,
      [fechamentoId, item.id, qtd]
    );

    baixados.push({ item_id: item.id, nome: item.nome, quantidade: qtd });
  }

  return baixados;
}

async function criarMissaoComItens(tx, { data, equipe, obs, criadoPor, itens }) {
  const { rows: missaoRows } = await tx.query(
    `INSERT INTO missoes (data, equipe, obs, criado_por)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [data, equipe, obs || null, criadoPor || null]
  );
  const missao = missaoRows[0];

  for (const it of itens) {
    const qtd = Number(it.qtd_saida);
    const buscaQuery = it.item_id
      ? 'SELECT * FROM itens_estoque WHERE id = $1 FOR UPDATE'
      : 'SELECT * FROM itens_estoque WHERE nome = $1 FOR UPDATE';
    const chave = it.item_id || it.nome;

    const { rows } = await tx.query(buscaQuery, [chave]);
    const item = rows[0];
    if (!item) throw new NaoEncontrado(`Item '${chave}' não encontrado no estoque.`);
    if (Number(item.saldo) < qtd) {
      throw new Conflito(`Saldo insuficiente para '${item.nome}' na saída de missão.`);
    }

    await tx.query(
      'UPDATE itens_estoque SET saldo = saldo - $1, atualizado_em = now() WHERE id = $2',
      [qtd, item.id]
    );
    await tx.query(
      'INSERT INTO missao_itens (missao_id, item_id, qtd_saida) VALUES ($1, $2, $3)',
      [missao.id, item.id, qtd]
    );
  }

  return missao;
}

async function listarMissoes(tx = pool) {
  const { rows } = await tx.query(
    `SELECT m.*,
       COALESCE(
         json_agg(
           json_build_object(
             'item_id', mi.item_id,
             'nome', ie.nome,
             'unidade', ie.unidade,
             'qtd_saida', mi.qtd_saida,
             'qtd_retorno', mi.qtd_retorno
           )
         ) FILTER (WHERE mi.item_id IS NOT NULL),
         '[]'
       ) AS itens
     FROM missoes m
     LEFT JOIN missao_itens mi ON mi.missao_id = m.id
     LEFT JOIN itens_estoque ie ON ie.id = mi.item_id
     GROUP BY m.id
     ORDER BY m.data DESC, m.id DESC`
  );
  return rows;
}

module.exports = {
  listarItens,
  salvarItem,
  removerItem,
  baixarMateriais,
  criarMissaoComItens,
  listarMissoes
};
