/**
 * CAMADA DE INFRAESTRUTURA COMPARTILHADA — ApiClient.js
 * Ponto único de comunicação de rede (fetch) com timeout via AbortController,
 * cabeçalho Authorization: Bearer <token> e suporte híbrido durante a migração
 * do Google Apps Script para o servidor Node.js (/api/*).
 */

export async function api(caminho, { method = 'GET', body, token, timeout = 30000, fetchImpl = fetch } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);

  const baseUrl = (typeof window !== 'undefined' && window.ILUMINA && window.ILUMINA.API_URL)
    ? window.ILUMINA.API_URL.replace(/\/$/, '')
    : '';

  const url = caminho.startsWith('http') ? caminho : `${baseUrl}${caminho}`;

  const headers = {
    'Content-Type': 'application/json'
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const resp = await fetchImpl(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: ctrl.signal
    });

    const texto = await resp.text();
    let json;
    try {
      json = texto ? JSON.parse(texto) : {};
    } catch (_) {
      json = { success: false, ok: false, error: { codigo: 'RESPOSTA_INVALIDA', mensagem: 'Resposta não é JSON válido.' } };
    }

    return {
      status: resp.status,
      ok: resp.ok && (json.success !== false && json.ok !== false),
      ...json
    };
  } finally {
    clearTimeout(timer);
  }
}

export default { api };
