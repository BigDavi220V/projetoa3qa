/**
 * PONTO DE ENTRADA (CIDADÃO) — public/js/cidadao/main.js
 * Instancia as camadas de Apresentação, Aplicação, Domínio e Infraestrutura
 * no navegador usando ES Modules nativos.
 */

import { api } from '../../shared/infrastructure/ApiClient.js';
import { IndexedDbReportRepository } from './infrastructure/IndexedDbReportRepository.js';
import { GeolocationService } from './infrastructure/GeolocationService.js';
import { FormView } from './presentation/FormView.js';
import { GpsView } from './presentation/GpsView.js';
import { ReportController } from './presentation/ReportController.js';
import * as ReportDomain from './domain/Report.js';

const repo = new IndexedDbReportRepository();
const geoService = new GeolocationService();
const formView = new FormView();
const gpsView = new GpsView();

const reportController = new ReportController({
  formView,
  gpsView,
  repo,
  api
});

if (typeof window !== 'undefined') {
  window.IluminaCidadao = {
    domain: ReportDomain,
    repo,
    geoService,
    formView,
    gpsView,
    controller: reportController,
    api
  };
}

export { reportController, repo, geoService, formView, gpsView };
