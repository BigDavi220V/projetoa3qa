/**
 * CAMADA DE APRESENTAÇÃO (TÉCNICO) — MapView.js
 * Gerencia a visualização do mapa Leaflet para localização do chamado em campo.
 */

export class MapView {
  constructor(leaflet = typeof window !== 'undefined' ? window.L : null) {
    this.L = leaflet;
    this.map = null;
    this.marker = null;
  }

  renderizarPonto(containerId, lat, lng, titulo = '') {
    if (!this.L || !Number.isFinite(lat) || !Number.isFinite(lng)) return;
    if (!this.map) {
      this.map = this.L.map(containerId).setView([lat, lng], 17);
      this.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap'
      }).addTo(this.map);
    } else {
      this.map.setView([lat, lng], 17);
    }
    if (this.marker) {
      this.marker.setLatLng([lat, lng]);
    } else {
      this.marker = this.L.marker([lat, lng]).addTo(this.map);
    }
    if (titulo && this.marker.bindPopup) {
      this.marker.bindPopup(titulo);
    }
  }
}
