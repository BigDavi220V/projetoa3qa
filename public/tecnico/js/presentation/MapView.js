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

  criarLinksDaRota(rota) {
    const links = [];
    let origem = `${rota.startLat},${rota.startLng}`;
    // URLs do Maps aceitam até três pontos intermediários no navegador móvel.
    for (let i = 0; i < rota.stops.length; i += 4) {
      const trecho = rota.stops.slice(i, i + 4);
      const destino = trecho[trecho.length - 1];
      const coordenadaDestino = `${destino.lat},${destino.lng}`;
      const parametros = new URLSearchParams({ api: '1', origin: origem, destination: coordenadaDestino, travelmode: 'driving' });
      if (trecho.length > 1) parametros.set('waypoints', trecho.slice(0, -1).map(parada => `${parada.lat},${parada.lng}`).join('|'));
      links.push(`https://www.google.com/maps/dir/?${parametros}`);
      origem = coordenadaDestino;
    }
    return links;
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
