/**
 * CAMADA DE APRESENTAÇÃO (CIDADÃO) — GpsView.js
 * Renderiza o indicador visual de precisão do GPS no formulário do cidadão.
 */

import { classificarPrecisao } from '../infrastructure/GeolocationService.js';

const LABELS = {
  excellent: 'Excelente',
  good: 'Boa',
  poor: 'Imprecisa'
};

const ICONS = {
  excellent: '✓',
  good: '~',
  poor: '!'
};

export class GpsView {
  constructor(doc = typeof document !== 'undefined' ? document : null) {
    this.doc = doc;
  }

  $(id) {
    return this.doc ? this.doc.getElementById(id) : null;
  }

  renderizarCoordenadas(gps) {
    if (!gps || gps.lat == null || gps.lng == null) return;
    const qualidade = classificarPrecisao(gps.acc);

    const empty = this.$('gps-empty-state');
    const result = this.$('gps-result');
    const bar = this.$('gps-accuracy-bar');
    const icon = this.$('gps-accuracy-icon');
    const label = this.$('gps-accuracy-label');
    const val = this.$('gps-accuracy-value');
    const coords = this.$('gps-coords');
    const useAnyway = this.$('use-anyway-btn');

    if (empty) empty.style.display = 'none';
    if (result) result.classList.add('show');
    if (bar) bar.dataset.quality = qualidade;
    if (icon) icon.textContent = ICONS[qualidade];
    if (label) label.textContent = LABELS[qualidade];
    if (val) val.textContent = `±${Math.round(gps.acc)} m`;
    if (coords) coords.textContent = `${Number(gps.lat).toFixed(6)}, ${Number(gps.lng).toFixed(6)}`;
    if (useAnyway) useAnyway.style.display = qualidade === 'poor' ? 'block' : 'none';
  }
}
