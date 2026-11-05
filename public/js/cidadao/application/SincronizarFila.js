/**
 * CAMADA DE APLICAÇÃO (CIDADÃO) — SincronizarFila.js
 * Motor de sincronização da fila offline com Exponential Backoff, envio idempotente
 * e distinção entre falha transitória de rede (`pending`) e erro permanente (`needs_attention`).
 */

import { ESTADOS_SYNC, calcularBackoffMs } from '../domain/Report.js';

export async function sincronizarFila({ repo, api, agora = Date.now() }) {
  const todosPendentes = await repo.listarPendentes();
  const elegiveis = todosPendentes.filter(
    (r) => !r.sync || !r.sync.nextRetryAt || r.sync.nextRetryAt <= agora
  );

  let sincronizados = 0;
  let falhas = 0;

  for (const r of elegiveis) {
    await repo.marcar(r.id, ESTADOS_SYNC.SYNCING);
    try {
      const resp = await api('/api/chamados', {
        method: 'POST',
        body: r
      });

      if (resp && (resp.success || resp.ok)) {
        await repo.marcar(r.id, ESTADOS_SYNC.SYNCED, {
          remoto: resp.data ? resp.data.protocolo : r.protocolo
        });
        sincronizados += 1;
      } else if (resp && resp.status >= 400 && resp.status < 500 && resp.status !== 429) {
        // Erro de validação permanente (400): vai para needs_attention sem ficar em loop infinito
        const msgErro = (resp.error && resp.error.mensagem) || resp.error || 'Dados inválidos';
        await repo.marcar(r.id, ESTADOS_SYNC.NEEDS_ATTENTION, { erro: msgErro });
        falhas += 1;
      } else {
        // Erro 5xx ou 429 transitório: aplica backoff exponencial
        const tentativasAtuais = (r.sync && r.sync.attempts) || 0;
        const espera = calcularBackoffMs(tentativasAtuais);
        await repo.marcar(r.id, ESTADOS_SYNC.PENDING, {
          incrementarTentativa: true,
          erro: (resp && resp.error && resp.error.mensagem) || 'Erro temporário no servidor',
          nextRetryAt: agora + espera
        });
        falhas += 1;
      }
    } catch (err) {
      // Falha de rede / timeout: mantém pending com backoff exponencial
      const tentativasAtuais = (r.sync && r.sync.attempts) || 0;
      const espera = calcularBackoffMs(tentativasAtuais);
      await repo.marcar(r.id, ESTADOS_SYNC.PENDING, {
        incrementarTentativa: true,
        erro: (err && err.message) || 'Sem conexão',
        nextRetryAt: agora + espera
      });
      falhas += 1;
    }
  }

  return {
    processados: elegiveis.length,
    sincronizados,
    falhas
  };
}
