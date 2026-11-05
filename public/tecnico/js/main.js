/**
 * PONTO DE ENTRADA (TÉCNICO) — public/tecnico/js/main.js
 * Instancia as camadas de Apresentação, Aplicação, Domínio e Infraestrutura
 * do painel Técnico / Gestor / Almoxarifado.
 */

import { api } from '../../shared/infrastructure/ApiClient.js';
import { TicketCache } from './infrastructure/TicketCache.js';
import { CloseQueue } from './infrastructure/CloseQueue.js';
import { PhotoCache } from './infrastructure/PhotoCache.js';
import { ListView } from './presentation/ListView.js';
import { MapView } from './presentation/MapView.js';
import { CloseFormView } from './presentation/CloseFormView.js';
import { StockView } from './presentation/StockView.js';
import { TechnicalControllers } from './presentation/Controllers.js';
import * as TicketDomain from './domain/Ticket.js';
import * as CloseDomain from './domain/Close.js';
import * as AttemptDomain from './domain/Attempt.js';
import * as StockItemDomain from './domain/StockItem.js';

const ticketCache = new TicketCache();
const closeQueue = new CloseQueue();
const photoCache = new PhotoCache();

const listView = new ListView();
const mapView = new MapView();
const closeFormView = new CloseFormView();
const stockView = new StockView();

const controllers = new TechnicalControllers({
  listView,
  closeFormView,
  stockView,
  ticketCache,
  closeQueue,
  photoCache,
  api
});

if (typeof window !== 'undefined') {
  window.IluminaTecnico = {
    domain: {
      Ticket: TicketDomain,
      Close: CloseDomain,
      Attempt: AttemptDomain,
      StockItem: StockItemDomain
    },
    infrastructure: {
      ticketCache,
      closeQueue,
      photoCache,
      api
    },
    presentation: {
      listView,
      mapView,
      closeFormView,
      stockView,
      controllers
    }
  };
}

export { controllers, ticketCache, closeQueue, photoCache };
