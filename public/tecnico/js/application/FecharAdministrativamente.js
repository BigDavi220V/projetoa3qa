import { criarFechamentoAdministrativo, validarFechamentoAdministrativo } from '../domain/AdminClose.js';

export async function fecharAdministrativamente(dados, { api, token }) {
  const payload = criarFechamentoAdministrativo({ ...dados, operacao_id: dados?.operacao_id ?? '' });
  const erros = validarFechamentoAdministrativo(payload);
  if (erros.length) return { sucesso: false, status: 400, mensagem: erros[0], erros };
  if (!token) return { sucesso: false, status: 401, mensagem: 'Faça login novamente.' };

  const resposta = await api(`/api/chamados/${encodeURIComponent(payload.protocolo)}/fechamento-admin`, {
    method: 'POST', token, body: payload
  });
  if (!resposta.ok) {
    return {
      sucesso: false,
      status: resposta.status,
      mensagem: resposta.error?.mensagem || 'Não foi possível registrar o fechamento.'
    };
  }
  return { sucesso: true, fechamento: resposta.data };
}
