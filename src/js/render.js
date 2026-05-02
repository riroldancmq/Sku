import { getFiltered, formatSku, getDB, setCurrentIdx, getIsAdmin } from './db.js';
import { showToast, closeModalById } from './utils.js';

export function renderList() {
  const filtered = getFiltered();
  const resultsText = document.getElementById('resultsText');
  const list = document.getElementById('list');
  
  if (resultsText) {
    resultsText.innerHTML = '<span class="results-count">' + filtered.length + '</span> productos encontrados';
  }
  
  if (!list) return;
  
  if (!filtered.length) {
    list.innerHTML = '<div class="empty"><div class="big">🔍</div><h3>Sin resultados</h3><p>Intentá con otra búsqueda</p></div>';
    return;
  }

  const db = getDB();
  list.innerHTML = filtered.map(p => {
    const dbIdx = db.indexOf(p);
    const pisos = p.pisos != null ? p.pisos : '—';
    const packsPiso = p.packsPiso != null ? p.packsPiso : '—';
    const packsPaleta = p.packsPaleta != null ? p.packsPaleta : '—';
    return `<div class="card" onclick="openDetail(${dbIdx})">
      <div class="card-sku">
        <div class="sku-label">SKU</div>
        <div class="sku-val">${formatSku(p.sku)}</div>
      </div>
      <div class="card-body">
        <div class="card-desc">${p.desc || 'Sin descripción'}</div>
        <div class="card-pills">
          <div class="pill"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#2dd4a0;margin-right:4px;vertical-align:middle"></span>Pisos <span class="val">${pisos}</span></div>
          <div class="pill"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#378add;margin-right:4px;vertical-align:middle"></span>Bultos <span class="val">${packsPiso}</span></div>
          <div class="pill">📦 Total <span class="val">${packsPaleta}</span></div>
          ${p.pesoPaleta ? `<div class="pill">⚖️ Peso <span class="val">${p.pesoPaleta.toFixed(3)} kg</span></div>` : ''}
        </div>
      </div>
      <div class="card-arrow">›</div>
    </div>`;
  }).join('');
}

export function openDetail(idx) {
  setCurrentIdx(idx);
  window.currentDetailIdx = idx;
  const db = getDB();
  const p = db[idx];
  if (!p) return;
  
  document.getElementById('mSku').textContent = 'SKU ' + formatSku(p.sku);
  document.getElementById('mDesc').textContent = p.desc || 'Sin descripción';
  document.getElementById('mPisos').textContent = p.pisos != null ? p.pisos : '—';
  document.getElementById('mPacksPiso').textContent = p.packsPiso != null ? p.packsPiso : '—';
  document.getElementById('mPacksPaleta').textContent = p.packsPaleta != null ? p.packsPaleta : '—';
  
  const pesoContainer = document.getElementById('statPesoContainer');
  if (p.pesoPaleta != null) {
    document.getElementById('mPesoPaleta').textContent = p.pesoPaleta.toFixed(3) + ' kg';
    pesoContainer.style.display = 'block';
  } else {
    pesoContainer.style.display = 'none';
  }

  renderVisualPaleta(p);
  document.getElementById('detailModal').classList.add('open');
  document.getElementById('adminActions').style.display = getIsAdmin() ? 'flex' : 'none';
}

function renderVisualPaleta(p) {
  const vp = document.getElementById('visualPaleta');
  if (!p.pisos || p.pisos <= 0) {
    vp.innerHTML = '';
    return;
  }

  const pisos = p.pisos;
  const MAX_PISOS_SHOWN = 20;
  const clampedPisos = Math.min(pisos, MAX_PISOS_SHOWN);

  const W = 160, baseH = 18, pisoH = 14, palletH = 12;
  const svgH = clampedPisos * pisoH + palletH + baseH + 10;

  const colors = {
    boxTop:    '#f5a623',
    boxFront:  '#c47f0d',
    boxSide:   '#e0941a',
    palletTop: '#8b6914',
    palletFront:'#5a420d',
    palletSide:'#7a5810',
  };

  const depth = 18;
  const boxW = W - depth;
  const startY = 8;

  let layers = '';
  for (let i = 0; i < clampedPisos; i++) {
    const y = startY + (clampedPisos - 1 - i) * pisoH;
    const isTop = (i === clampedPisos - 1);
    layers += `<rect x="${depth}" y="${y + 2}" width="${boxW}" height="${pisoH - 1}" fill="${colors.boxFront}" rx="1"/>`;
    if (isTop) {
      layers += `<polygon points="${depth},${y + 2} ${W},${y + 2} ${W - depth + depth/2},${y + 2 - depth/2 + 2} ${depth/2},${y + 2 - depth/2 + 2}" fill="${colors.boxTop}"/>`;
    }
    layers += `<polygon points="${W},${y + 2} ${W},${y + pisoH} ${W - depth + depth},${y + pisoH} ${W - depth + depth},${y + 2}" fill="${colors.boxSide}" opacity="0.7"/>`;
    layers += `<line x1="${depth}" y1="${y + 2}" x2="${W}" y2="${y + 2}" stroke="#0f0f14" stroke-width="0.5" opacity="0.4"/>`;
  }

  const palletY = startY + clampedPisos * pisoH;
  layers += `<rect x="${depth}" y="${palletY}" width="${boxW}" height="${palletH}" fill="${colors.palletFront}" rx="1"/>`;
  layers += `<polygon points="${depth},${palletY} ${W},${palletY} ${W},${palletY} ${depth},${palletY}" fill="${colors.palletTop}"/>`;
  for (let s = 0; s < 3; s++) {
    const sx = depth + (boxW / 4) * (s + 0.8);
    layers += `<rect x="${sx}" y="${palletY}" width="6" height="${palletH}" fill="#3a2000" opacity="0.25"/>`;
  }
  layers += `<polygon points="${depth},${palletY} ${W},${palletY} ${W - depth/2},${palletY - palletH/2 + 2} ${depth/2},${palletY - palletH/2 + 2}" fill="${colors.palletTop}"/>`;

  let floorLabels = '';
  if (pisos <= MAX_PISOS_SHOWN) {
    for (let i = 0; i < pisos; i++) {
      const y = startY + (pisos - 1 - i) * pisoH + pisoH / 2 + 2;
      floorLabels += `<text x="${depth - 4}" y="${y}" text-anchor="end" font-size="8" fill="#7878a0" font-family="Barlow Condensed, sans-serif" font-weight="600">${i + 1}</text>`;
    }
  } else {
    [1, Math.ceil(pisos/2), pisos].forEach(n => {
      const idx = n - 1;
      const y = startY + (clampedPisos - 1 - Math.min(idx, clampedPisos - 1)) * pisoH + pisoH / 2 + 2;
      floorLabels += `<text x="${depth - 4}" y="${y}" text-anchor="end" font-size="8" fill="#7878a0" font-family="Barlow Condensed, sans-serif" font-weight="600">${n}</text>`;
    });
  }

  const truncNote = pisos > MAX_PISOS_SHOWN ? `<div style="font-size:11px;color:var(--muted);margin-top:4px;font-family:'Barlow Condensed',sans-serif">(mostrando ${MAX_PISOS_SHOWN} de ${pisos} pisos)</div>` : '';

  vp.innerHTML = `
    <div class="modal-section-title" style="padding:0 0 10px">VISTA DE PALETA</div>
    <div class="paleta-drawing">
      <div class="paleta-svg-wrap">
        <svg width="${W + 10}" height="${svgH}" viewBox="0 0 ${W + 10} ${svgH}" xmlns="http://www.w3.org/2000/svg">
          ${layers}
          ${floorLabels}
        </svg>
        ${truncNote}
      </div>
      <div class="paleta-legend">
        <div class="paleta-legend-item">
          <div class="paleta-legend-dot" style="background:${colors.boxFront}"></div>
          <div>
            <div style="font-size:14px">Pisos</div>
            <div class="paleta-legend-val">${pisos}</div>
          </div>
        </div>
        ${p.packsPiso ? `<div class="paleta-legend-item">
          <div class="paleta-legend-dot" style="background:var(--green)"></div>
          <div>
            <div style="font-size:14px">Bultos/piso</div>
            <div class="paleta-legend-val">${p.packsPiso}</div>
          </div>
        </div>` : ''}
        ${p.packsPaleta ? `<div class="paleta-legend-item">
          <div class="paleta-legend-dot" style="background:var(--accent)"></div>
          <div>
            <div style="font-size:14px">Total paleta</div>
            <div class="paleta-legend-val">${p.packsPaleta}</div>
          </div>
        </div>` : ''}
        ${p.pesoPaleta ? `<div class="paleta-legend-item">
          <div class="paleta-legend-dot" style="background:#378add"></div>
          <div>
            <div style="font-size:14px">Peso paleta</div>
            <div class="paleta-legend-val">${p.pesoPaleta.toFixed(3)} kg</div>
          </div>
        </div>` : ''}
      </div>
    </div>`;
}

export default { renderList, openDetail, renderVisualPaleta };