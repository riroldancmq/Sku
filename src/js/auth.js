import { getIsAdmin, setIsAdmin, getAdminPass } from './db.js';
import { showToast } from './utils.js';

export function toggleAdmin() {
  if (getIsAdmin()) {
    setIsAdmin(false);
    applyAdminUI();
    showToast('🔒 Sesión cerrada');
  } else {
    document.getElementById('loginInput').value = '';
    document.getElementById('loginInput').classList.remove('error');
    document.getElementById('loginIcon').textContent = '🔐';
    document.getElementById('loginTitle').textContent = 'Acceso Admin';
    document.getElementById('loginSub').textContent = 'Ingresá la contraseña para editar';
    document.getElementById('loginModal').classList.add('open');
    setTimeout(() => document.getElementById('loginInput').focus(), 200);
  }
}

export function doLogin() {
  const val = document.getElementById('loginInput').value;
  const title = document.getElementById('loginTitle');
  const inp = document.getElementById('loginInput');
  const icon = document.getElementById('loginIcon');
  const sub = document.getElementById('loginSub');
  
  if (val === getAdminPass()) {
    setIsAdmin(true);
    document.getElementById('loginModal').classList.remove('open');
    applyAdminUI();
    showToast('✅ Modo administrador activo');
  } else {
    inp.classList.add('error');
    inp.value = '';
    icon.textContent = '❌';
    sub.textContent = 'Contraseña incorrecta, intentá de nuevo';
    setTimeout(() => {
      inp.classList.remove('error');
      icon.textContent = '🔐';
      sub.textContent = 'Ingresá la contraseña para editar';
    }, 1500);
  }
}

export function closeLogin() {
  document.getElementById('loginModal').classList.remove('open');
}

export function applyAdminUI() {
  const addBtn = document.getElementById('addBtn');
  const loginBtn = document.getElementById('loginBtn');
  const filtrosBtn = document.getElementById('filtrosBtn');
  const adminActions = document.getElementById('adminActions');
  
  if (getIsAdmin()) {
    addBtn.style.display = 'flex';
    filtrosBtn.style.display = 'flex';
    loginBtn.textContent = '🔓';
    loginBtn.classList.add('active');
    if (adminActions) adminActions.style.display = 'flex';
    
    let expBtn = document.getElementById('exportBtn');
    if (!expBtn) {
      expBtn = document.createElement('button');
      expBtn.id = 'exportBtn';
      expBtn.className = 'add-btn';
      expBtn.style.cssText = 'background:#2dd4a0;font-size:14px;padding:8px 12px;';
      expBtn.textContent = '⬇ JSON';
      expBtn.onclick = () => import('./modals.js').then(m => m.exportarJSON());
      loginBtn.parentElement.insertBefore(expBtn, loginBtn);
    }
    expBtn.style.display = 'flex';
  } else {
    addBtn.style.display = 'none';
    filtrosBtn.style.display = 'none';
    loginBtn.textContent = '🔒';
    loginBtn.classList.remove('active');
    if (adminActions) adminActions.style.display = 'none';
    
    const expBtn = document.getElementById('exportBtn');
    if (expBtn) expBtn.style.display = 'none';
  }
}

export default { toggleAdmin, doLogin, closeLogin, applyAdminUI };