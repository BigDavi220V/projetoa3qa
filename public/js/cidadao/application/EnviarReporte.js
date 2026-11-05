/**
 * CAMADA DE APLICAÇÃO (CIDADÃO) — EnviarReporte.js
 * Caso de uso: validar os dados do formulário, gravar PRIMEIRO no IndexedDB
 * (garantindo operação Offline-First) e disparar a sincronização com o servidor.
 */

import { criarReport, validarReport } from '../domain/Report.js';

export async function enviarReporte(dadosFormulario, { repo, sincronizar }) {
  const report = criarReport(dadosFormulario);
  const erros = validarReport(report);

  if (erros.length > 0) {
    return {
      sucesso: false,
      erros,
      report: null
    };
  }

  // 1. Grava primeiro no IndexedDB do aparelho (nunca perde o reporte se a internet cair no meio)
  await repo.salvar(report);

  // 2. Se houver função de sincronização e sinal, tenta enviar imediatamente
  let enviadoRemoto = false;
  if (typeof sincronizar === 'function') {
    const resultadoSync = await sincronizar();
    enviadoRemoto = Boolean(resultadoSync && resultadoSync.sincronizados > 0);
  }

  return {
    sucesso: true,
    erros: [],
    modo: enviadoRemoto ? 'sent' : 'queued',
    report
  };
}
