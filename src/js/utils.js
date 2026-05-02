export function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

export function closeModal(e, id) {
  if (e.target.classList.contains('modal-overlay')) closeModalById(id);
}

export function closeModalById(id) {
  document.getElementById(id).classList.remove('open');
}

export function formatSku(sku) {
  if (!sku || sku === 'NaN' || sku === 'nan') return '—';
  return String(sku).replace(/\./g, '');
}

export function ready(fn) {
  if (document.readyState !== 'loading') {
    fn();
  } else {
    document.addEventListener('DOMContentLoaded', fn);
  }
}

export default { showToast, closeModal, closeModalById, formatSku, ready };