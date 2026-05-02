import { getDB, getEditIdx, setEditIdx, formatSku, getFilters, setFilters, filterProducts, getFiltered } from './db.js';
import { renderList } from './render.js';
import { showToast, closeModalById } from './utils.js';
import { buildFilters } from './filters.js';

export function openAdd() {
  setEditIdx(-1);
  document.getElementById('formTitle').textContent = 'NUEVO PRODUCTO';
  document.getElementById('fSku').value = '';
  document.getElementById('fDesc').value = '';
  document.getElementById('fPisos').value = '';
  document.getElementById('fPacksPiso').value = '';
  document.getElementById('fPacksPaleta').value = '';
  document.getElementById('fPesoPaleta').value = '';
  document.getElementById('fSku').readOnly = false;
  document.getElementById('formModal').classList.add('open');
}

export function openEdit(idx) {
  closeModalById('detailModal');
  const db = getDB();
  const p = db[idx];
  if (!p) return;
  
  setEditIdx(idx);
  document.getElementById('formTitle').textContent = 'EDITAR PRODUCTO';
  document.getElementById('fSku').value = p.sku || '';
  document.getElementById('fDesc').value = p.desc || '';
  document.getElementById('fPisos').value = p.pisos != null ? p.pisos : '';
  document.getElementById('fPacksPiso').value = p.packsPiso != null ? p.packsPiso : '';
  document.getElementById('fPacksPaleta').value = p.packsPaleta != null ? p.packsPaleta : '';
  document.getElementById('fPesoPaleta').value = p.pesoPaleta != null ? p.pesoPaleta.toFixed(3) : '';
  document.getElementById('fSku').readOnly = true;
  document.getElementById('formModal').classList.add('open');
}

export function saveProduct() {
  const sku = document.getElementById('fSku').value.trim();
  const desc = document.getElementById('fDesc').value.trim();
  const pisos = parseInt(document.getElementById('fPisos').value) || null;
  const packsPiso = parseInt(document.getElementById('fPacksPiso').value) || null;
  const packsPaleta = parseInt(document.getElementById('fPacksPaleta').value) || null;
  const pesoPaleta = parseFloat(document.getElementById('fPesoPaleta').value) || null;

  if (!sku || !desc) { showToast('⚠️ SKU y descripción son requeridos'); return; }

  const db = getDB();
  const editIdx = getEditIdx();
  
  if (editIdx >= 0) {
    db[editIdx] = { sku, desc, pisos, packsPiso, packsPaleta, pesoPaleta };
    showToast('✅ Actualizado · Exportá el JSON para guardar');
  } else {
    if (db.find(p => p.sku === sku)) { showToast('⚠️ Ya existe ese SKU'); return; }
    db.unshift({ sku, desc, pisos, packsPiso, packsPaleta, pesoPaleta });
    showToast('✅ Agregado · Exportá el JSON para guardar');
  }
  
  closeModalById('formModal');
  renderList();
  exportFunctions: { exportarJSON };
}

export function deleteProduct(idx) {
  if (!confirm('¿Eliminar este producto?')) return;
  const db = getDB();
  db.splice(idx, 1);
  closeModalById('detailModal');
  showToast('🗑️ Producto eliminado');
  filterProducts();
  renderList();
}

export function exportarJSON() {
  const filters = getFilters();
  const db = getDB();
  const data = { filters, products: db };
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'productos.json';
  a.click();
  URL.revokeObjectURL(url);
  showToast('📥 JSON exportado');
}

export function openFiltros() {
  renderFiltrosPanel();
  document.getElementById('filtrosModal').classList.add('open');
}

export function renderFiltrosPanel() {
  const lista = document.getElementById('filtrosLista');
  lista.innerHTML = '';
  
  const filters = getFilters();
  
  filters.forEach((grupo, gi) => {
    const card = document.createElement('div');
    card.dataset.gi = gi;
    card.style.cssText = 'background:#22222f;border:1.5px solid #2e2e42;border-radius:12px;margin-bottom:10px;overflow:hidden';

    const header = document.createElement('div');
    header.style.cssText = 'display:flex;align-items:center;gap:8px;padding:11px 14px';

    const swatchWrap = document.createElement('div');
    swatchWrap.style.cssText = 'position:relative;width:28px;height:28px;flex-shrink:0;cursor:pointer';
    const swatchDiv = document.createElement('div');
    swatchDiv.style.cssText = 'width:28px;height:28px;border-radius:7px;background:'+grupo.color+';border:2.5px solid rgba(255,255,255,0.18);pointer-events:none';
    const colorPicker = document.createElement('input');
    colorPicker.type = 'color';
    colorPicker.value = grupo.color;
    colorPicker.dataset.field = 'color';
    colorPicker.style.cssText = 'position:absolute;inset:0;opacity:0;width:100%;height:100%;cursor:pointer;border:none;padding:0';
    colorPicker.oninput = e => { 
      swatchDiv.style.background = e.target.value; 
      grupo.color = e.target.value;
    };
    swatchWrap.appendChild(swatchDiv);
    swatchWrap.appendChild(colorPicker);

    const nombreInput = document.createElement('input');
    nombreInput.value = grupo.label;
    nombreInput.dataset.field = 'label';
    nombreInput.style.cssText = 'flex:1;background:#1a1a24;border:1.5px solid #3e3e52;border-radius:7px;color:#e8e8f0;font-family:"Barlow Condensed",sans-serif;font-weight:700;font-size:15px;padding:5px 9px;outline:none;min-width:0';

    const count = document.createElement('span');
    count.textContent = grupo.brands.length + ' marcas';
    count.style.cssText = 'font-size:11px;color:#7878a0;background:#1a1a24;border-radius:5px;padding:2px 7px;flex-shrink:0';

    const btnDel = document.createElement('button');
    btnDel.textContent = '🗑';
    btnDel.title = 'Eliminar grupo';
    btnDel.style.cssText = 'background:rgba(255,96,96,0.12);border:1.5px solid rgba(255,96,96,0.3);border-radius:7px;color:#ff6060;cursor:pointer;font-size:14px;padding:5px 8px;flex-shrink:0';
    btnDel.onclick = () => {
      const idx = parseInt(card.dataset.gi);
      if (!confirm('¿Eliminar el grupo "' + filters[idx].label + '"?')) return;
      filters.splice(idx, 1);
      setFilters([...filters]);
      buildFilters();
      renderList();
      renderFiltrosPanel();
    };

    header.appendChild(swatchWrap);
    header.appendChild(nombreInput);
    header.appendChild(count);
    header.appendChild(btnDel);

    const body = document.createElement('div');
    body.style.cssText = 'padding:0 14px 12px;display:flex;flex-direction:column;gap:5px';

    grupo.brands.forEach((brand, bi) => {
      const row = document.createElement('div');
      row.dataset.bi = bi;
      row.style.cssText = 'display:flex;gap:6px;align-items:center';
      
      const inputLabel = document.createElement('input');
      inputLabel.value = brand.label;
      inputLabel.dataset.field = 'label';
      inputLabel.style.cssText = 'flex:1;background:#1a1a24;border:1.5px solid #3e3e52;border-radius:6px;color:#e8e8f0;font-family:"Barlow Condensed",sans-serif;font-weight:600;font-size:14px;padding:6px 10px;outline:none';
      
      const inputKey = document.createElement('input');
      inputKey.value = brand.key;
      inputKey.dataset.field = 'key';
      inputKey.placeholder = 'key';
      inputKey.style.cssText = 'width:70px;background:#1a1a24;border:1.5px solid #3e3e52;border-radius:6px;color:#e8e8f0;font-family:"Barlow",sans-serif;font-size:13px;padding:6px 8px;text-align:center;outline:none';
      
      const btnRemove = document.createElement('button');
      btnRemove.textContent = '✕';
      btnRemove.style.cssText = 'background:rgba(255,96,96,0.12);border:1px solid rgba(255,96,96,0.3);border-radius:5px;color:#ff6060;font-size:12px;padding:4px 7px;cursor:pointer';
      btnRemove.onclick = () => {
        grupo.brands.splice(bi, 1);
        setFilters([...filters]);
        buildFilters();
        renderFiltrosPanel();
      };
      
      row.appendChild(inputLabel);
      row.appendChild(inputKey);
      row.appendChild(btnRemove);
      body.appendChild(row);
    });

    const addBrandBtn = document.createElement('button');
    addBrandBtn.textContent = '+ Agregar marca';
    addBrandBtn.style.cssText = 'background:rgba(245,166,35,0.1);border:1.5px dashed rgba(245,166,35,0.4);border-radius:8px;color:#f5a623;font-family:"Barlow Condensed",sans-serif;font-weight:600;font-size:14px;padding:8px;cursor:pointer;margin-top:8px';
    addBrandBtn.onclick = () => {
      grupo.brands.push({ label: 'Nueva marca', key: 'NEW' });
      renderFiltrosPanel();
    };
    body.appendChild(addBrandBtn);

    card.appendChild(header);
    card.appendChild(body);
    lista.appendChild(card);
  });
}

export function agregarGrupo() {
  const filters = getFilters();
  filters.push({ label: 'NUEVO GRUPO', color: '#ff00ff', brands: [{ label: 'Marca', key: 'NEW' }] });
  setFilters([...filters]);
  renderFiltrosPanel();
}

export function guardarFiltros() {
  const lista = document.getElementById('filtrosLista');
  const cards = lista.querySelectorAll('[data-gi]');
  const newFilters = [];
  
  cards.forEach(card => {
    const gi = parseInt(card.dataset.gi);
    const inputs = card.querySelectorAll('input[data-field]');
    let color = filters[gi]?.color || '#f5a623';
    let label = filters[gi]?.label || 'NUEVO';
    const brands = [];
    
    card.querySelectorAll('[data-bi]').forEach(row => {
      const bi = parseInt(row.dataset.bi);
      const labelIn = row.querySelector('[data-field="label"]');
      const keyIn = row.querySelector('[data-field="key"]');
      if (labelIn && keyIn) {
        brands.push({ label: labelIn.value, key: keyIn.value });
      }
    });
    
    newFilters.push({ label, color, brands });
  });
  
  if (newFilters.length > 0) {
    setFilters(newFilters);
    buildFilters();
    renderList();
  }
  closeModalById('filtrosModal');
  showToast('✅ Filtros guardados');
}

export default { openAdd, openEdit, saveProduct, deleteProduct, exportarJSON, openFiltros, renderFiltrosPanel, agregarGrupo, guardarFiltros };