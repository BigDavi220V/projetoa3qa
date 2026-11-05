/**
 * CAMADA DE APRESENTAÇÃO (CIDADÃO) — ReportController.js
 * Coordena os eventos de interface do cidadão com os serviços da Camada de Aplicação
 * (`enviarReporte` e `sincronizarFila`).
 */

import { enviarReporte } from '../application/EnviarReporte.js';
import { sincronizarFila } from '../application/SincronizarFila.js';

export class ReportController {
  constructor({ formView, gpsView, repo, api }) {
    this.formView = formView;
    this.gpsView = gpsView;
    this.repo = repo;
    this.api = api;
  }

  async submeter(estadoExtra = {}) {
    this.formView.atualizarBotaoEnvio({ habilitado: true, enviando: true });
    const dados = this.formView.lerFormulario(estadoExtra);

    const resultado = await enviarReporte(dados, {
      repo: this.repo,
      sincronizar: () => this.sincronizarPendentes()
    });

    this.formView.atualizarBotaoEnvio({ habilitado: true, enviando: false });

    if (resultado.sucesso) {
      this.formView.mostrarResultadoEnvio(resultado.report.protocolo, resultado.modo);
      await this.atualizarContadorFila();
    }

    return resultado;
  }

  async sincronizarPendentes() {
    const res = await sincronizarFila({
      repo: this.repo,
      api: this.api
    });
    await this.atualizarContadorFila();
    return res;
  }

  async atualizarContadorFila() {
    const pendentes = await this.repo.listarPendentes();
    this.formView.atualizarBannerFila(pendentes.length);
    return pendentes.length;
  }
}
