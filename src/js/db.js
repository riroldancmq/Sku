const STORAGE_KEY = 'catalogo_sku_v2';
const ADMIN_PASS = 'cdmercado26';

let db = [];
let FILTER_GROUPS = [];
let query = '';
let activeFilter = 'TODOS';
let activeGroup = null;
let currentIdx = -1;
let editIdx = -1;
let filtered = [];
let isAdmin = false;

export function getDB() { return db; }
export function getFilters() { return FILTER_GROUPS; }
export function setFilters(filters) { FILTER_GROUPS = filters; }
export function getQuery() { return query; }
export function setQuery(q) { query = q; }
export function getActiveFilter() { return activeFilter; }
export function setActiveFilter(f) { activeFilter = f; }
export function getActiveGroup() { return activeGroup; }
export function setActiveGroup(g) { activeGroup = g; }
export function getCurrentIdx() { return currentIdx; }
export function setCurrentIdx(i) { currentIdx = i; }
export function getEditIdx() { return editIdx; }
export function setEditIdx(i) { editIdx = i; }
export function getFiltered() { return filtered; }
export function setFiltered(f) { filtered = f; }
export function getIsAdmin() { return isAdmin; }
export function setIsAdmin(a) { isAdmin = a; }
export function getAdminPass() { return ADMIN_PASS; }
export function getStorageKey() { return STORAGE_KEY; }

export function formatSku(sku) {
  if (!sku || sku === 'NaN' || sku === 'nan') return '—';
  return String(sku).replace(/\./g, '');
}

export function loadData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch(e) {}
  return [
    { sku: "352", desc: "BIB 7UP 20LTS", pisos: 4, packsPiso: 6, packsPaleta: 24 },
    { sku: "353", desc: "BIB PEPSI 20L", pisos: 4, packsPiso: 6, packsPaleta: 24 },
    { sku: "808", desc: "PEPSI MED 350cc", pisos: 6, packsPiso: 10, packsPaleta: 60 },
    { sku: "822", desc: "7 UP 2,25X8 PET", pisos: 4, packsPiso: 15, packsPaleta: 60 }
  ];
}

export function saveData() {}

export async function initDB() {
  try {
    const res = await fetch('productos.json?_=' + Date.now());
    if (res.ok) {
      const data = await res.json();
      if (data.products && data.filters) {
        db = data.products;
        FILTER_GROUPS = data.filters;
      } else {
        db = Array.isArray(data) ? data : loadData();
      }
    } else {
      db = loadData();
    }
  } catch(e) {
    db = loadData();
  }
}

export function filterProducts(searchQuery) {
  if (searchQuery !== undefined) query = searchQuery;
  const search = query.toLowerCase().trim();
  filtered = db.filter(p => {
    const desc = (p.desc || '').toUpperCase();
    const sku = formatSku(p.sku || '');
    const matchQ = !search || desc.toLowerCase().includes(search) || sku.includes(search);
    const matchF = activeFilter === 'TODOS' || desc.includes(activeFilter);
    return matchQ && matchF;
  });
}

export default {
  getDB,
  getFilters,
  setFilters,
  getQuery,
  setQuery,
  getActiveFilter,
  setActiveFilter,
  getActiveGroup,
  setActiveGroup,
  getCurrentIdx,
  setCurrentIdx,
  getEditIdx,
  setEditIdx,
  getFiltered,
  setFiltered,
  getIsAdmin,
  setIsAdmin,
  getAdminPass,
  getStorageKey,
  formatSku,
  loadData,
  saveData,
  initDB,
  filterProducts
};