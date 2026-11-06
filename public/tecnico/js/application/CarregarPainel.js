/** Acesso à API existente necessário para carregar os chamados dos itens 4 e 6. */
function exigirSucesso(resposta) {
  if (!resposta.ok) {
    const erro = new Error(resposta.error?.mensagem || 'Não foi possível acessar o serviço.');
    erro.status = resposta.status;
    throw erro;
  }
  return resposta.data;
}

export async function autenticarPainel(pin, { api }) {
  return exigirSucesso(await api('/api/auth/login', { method: 'POST', body: { pin } }));
}

export async function carregarPainel(token, { api }) {
  return exigirSucesso(await api('/api/chamados?escopo=abertos', { token }));
}
