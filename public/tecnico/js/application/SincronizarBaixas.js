/**
 * CAMADA DE APLICAÇÃO (TÉCNICO) — SincronizarBaixas.js
 * Envia as baixas pendentes da `CloseQueue` para `POST /api/chamados/:protocolo/fechamento`
 * tratando idempotência (`201`/`200`), conflitos de concorrência (`409 Conflict`) e sessão expirada (`401`).
 */

export async function sincronizarBaixas({ queue, api, token }) {
  if (!token) {
    return { sincronizados: 0, conflitos: [], sessaoExpirada: false };
  }

  const pendentes = (await queue.listarTodos()).filter((item) => item.estado !== 'conflict');
  let sincronizados = 0;
  const conflitos = [];

  for (const registro of pendentes) {
    const payload = registro.payload || registro;
    try {
      const resp = await api(`/api/chamados/${encodeURIComponent(payload.protocolo)}/fechamento`, {
        method: 'POST',
        token,
        body: payload
      });

      if (resp && (resp.success || resp.ok)) {
        await queue.remover(registro.id);
        sincronizados += 1;
      } else if (resp && resp.status === 409) {
        const msg = (resp.error && resp.error.mensagem) || 'Chamado já foi fechado por outro técnico.';
        await queue.marcarConflito(registro.id, msg);
        conflitos.push({ protocolo: payload.protocolo, mensagem: msg });
      } else if (resp && resp.status === 401) {
        return { sincronizados, conflitos, sessaoExpirada: true };
      } else {
        break;
      }
    } catch (_) {
      // Sem sinal ou timeout — interrompe e aguarda reconexão
      break;
    }
  }

  return {
    sincronizados,
    conflitos,
    sessaoExpirada: false
  };
}
