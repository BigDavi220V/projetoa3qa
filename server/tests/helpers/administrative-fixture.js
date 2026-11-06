const assert = require('node:assert/strict');
const { emTransacao } = require('../../src/infrastructure/database/transacao');

// Modelo transacional em memória: a trava só é obtida quando o serviço pede o chamado.
// Não cria tabelas nem simula o SQL do MySQL.
function criarCenario() {
  let estado = { chamado: { id: 'chamado-1', protocolo: 'IC-TESTE-1', status: 'aberto' }, fechamento: null };
  let fila = Promise.resolve();
  let falharStatus = false;
  const eventos = [];
  const pool = {
    async connect() {
      let soltar;
      let anterior;
      return {
        async travar() {
          const esperar = fila;
          fila = new Promise(resolve => { soltar = resolve; });
          await esperar;
          anterior = structuredClone(estado);
          eventos.push('LOCK');
        },
        async query(comando) {
          assert.ok(['BEGIN', 'COMMIT', 'ROLLBACK'].includes(comando));
          eventos.push(comando);
          if (comando === 'ROLLBACK' && anterior) estado = anterior;
          if (comando !== 'BEGIN' && soltar) { soltar(); soltar = null; }
          return { rows: [] };
        },
        release() { eventos.push('RELEASE'); }
      };
    }
  };
  const ChamadoRepo = {
    async buscarParaAtualizar(tx, protocolo) {
      await tx.travar();
      return estado.chamado?.protocolo === protocolo ? { ...estado.chamado } : null;
    },
    async mudarStatus(_tx, id, status) {
      assert.equal(id, estado.chamado.id);
      eventos.push('STATUS');
      if (falharStatus) throw new Error('Falha simulada na atualização');
      estado.chamado.status = status;
    }
  };
  const FechamentoRepo = {
    async buscarPorOperacaoId(_tx, id) {
      eventos.push('OPERATION');
      return estado.fechamento?.operacao_id === id ? { ...estado.fechamento } : null;
    },
    async inserir(_tx, dados) {
      eventos.push('INSERT');
      if (estado.fechamento) throw Object.assign(new Error('Duplicado'), { code: 'ER_DUP_ENTRY' });
      estado.fechamento = {
        id: 1, operacao_id: dados.operacaoId, chamado_id: dados.chamadoId,
        tecnico_id: dados.tecnicoId, administrativo: dados.administrativo,
        informante: dados.informante, justificativa: dados.justificativa,
        status: dados.status, data_fechamento: dados.dataFechamento
      };
      return { ...estado.fechamento };
    }
  };
  return {
    pool, eventos, ChamadoRepo, FechamentoRepo,
    deps: { ChamadoRepo, FechamentoRepo, emTransacao: operacao => emTransacao(operacao, pool) },
    get estado() { return estado; },
    falharAoAtualizarStatus() { falharStatus = true; }
  };
}

module.exports = { criarCenario };
