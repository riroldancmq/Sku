import { showToast, closeModalById, ready } from './utils.js';
import { initDB, getFilters, setFilters, filterProducts, getDB, setQuery, getFiltered } from './db.js';
import { buildFilters, onSearch, clearSearch } from './filters.js';
import { renderList, openDetail } from './render.js';
import { toggleAdmin, doLogin, closeLogin, applyAdminUI } from './auth.js';
import { openAdd, openEdit, saveProduct, deleteProduct, exportarJSON, openFiltros, renderFiltrosPanel, agregarGrupo, guardarFiltros } from './modals.js';

function init() {
  document.getElementById('searchInput').addEventListener('input', onSearch);
  document.getElementById('clearBtn').addEventListener('click', clearSearch);
  document.getElementById('loginBtn').addEventListener('click', toggleAdmin);
  document.getElementById('loginInput').addEventListener('keydown', e => { if(e.key==='Enter') doLogin(); });
  document.getElementById('loginCancelBtn').addEventListener('click', closeLogin);
  document.getElementById('addBtn').addEventListener('click', openAdd);
  document.getElementById('filtrosBtn').addEventListener('click', openFiltros);

  ['fPisos','fPacksPiso'].forEach(id => {
    document.getElementById(id).addEventListener('input', () => {
      const p = parseInt(document.getElementById('fPisos').value) || 0;
      const pp = parseInt(document.getElementById('fPacksPiso').value) || 0;
      document.getElementById('fPacksPaleta').value = p && pp ? p * pp : '';
    });
  });

  document.getElementById('detailModal').addEventListener('click', e => { if(e.target.classList.contains('modal-overlay')) closeModalById('detailModal'); });
  document.getElementById('formModal').addEventListener('click', e => { if(e.target.classList.contains('modal-overlay')) closeModalById('formModal'); });
  document.getElementById('filtrosModal').addEventListener('click', e => { if(e.target.classList.contains('modal-overlay')) closeModalById('filtrosModal'); });

  initDB().then(() => {
    buildFilters();
    filterProducts();
    renderList();
  });
}

window.openDetail = openDetail;
window.closeModal = (e, id) => closeModalById(id);
window.closeModalById = closeModalById;
window.openAdd = openAdd;
window.openEdit = openEdit;
window.saveProduct = saveProduct;
window.deleteProduct = deleteProduct;
window.toggleAdmin = toggleAdmin;
window.doLogin = doLogin;
window.closeLogin = closeLogin;
window.onSearch = onSearch;
window.clearSearch = clearSearch;
window.openFiltros = openFiltros;
window.agregarGrupo = agregarGrupo;
window.guardarFiltros = guardarFiltros;
window.exportarJSON = exportarJSON;
window.showToast = showToast;

ready(init);