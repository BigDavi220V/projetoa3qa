import { gerarOperacaoId } from './Close.js';

export const STATUS_ADMINISTRATIVOS = ['Concluído', 'Parcialmente resolvido', 'Ponto não localizado'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function criarFechamentoAdministrativo(dados = {}) {
  const texto = valor => typeof valor === 'string' ? valor.trim() : '';
  return {
    operacao_id: dados.operacao_id === undefined ? gerarOperacaoId() : texto(dados.operacao_id),
    protocolo: texto(dados.protocolo),
    informante: texto(dados.informante),
    justificativa: texto(dados.justificativa),
    status: dados.status === undefined ? STATUS_ADMINISTRATIVOS[0] : texto(dados.status)
  };
}

export function validarFechamentoAdministrativo(dados) {
  const erros = [];
  if (!UUID.test(dados.operacao_id)) erros.push('Identificador da operação inválido. Reabra o formulário.');
  if (!dados.protocolo) erros.push('Selecione o chamado.');
  if (!dados.informante || dados.informante.length > 120) erros.push('Informe o responsável, com até 120 caracteres.');
  if (dados.justificativa.length < 10) erros.push('Detalhe a justificativa com pelo menos 10 caracteres.');
  if (!STATUS_ADMINISTRATIVOS.includes(dados.status)) erros.push('Selecione um status final válido.');
  return erros;
}
