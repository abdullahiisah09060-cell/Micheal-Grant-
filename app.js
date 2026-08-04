import * as fb from './firebase-config.js';

export function showToast(message, type = 'info', duration = 4500) {
    let container = document.querySelector('.toast-container') || document.createElement('div');
    if (!container.parentElement) { container.className = 'toast-container'; document.body.appendChild(container); }
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    const icons = { success:'fa-circle-check', error:'fa-circle-xmark', warning:'fa-triangle-exclamation', info:'fa-circle-info' };
    toast.innerHTML = `<i class="fa-solid ${icons[type]} toast__icon"></i><div class="toast__content">${message}</div><button class="toast__close"><i class="fa-solid fa-xmark"></i></button>`;
    container.appendChild(toast);
    const hide = () => { toast.classList.add('toast--hiding'); setTimeout(() => toast.remove(), 300); };
    toast.querySelector('.toast__close').onclick = hide;
    setTimeout(hide, duration);
}

export function showConfirm({ title, message, confirmText='Confirm', cancelText='Cancel', onConfirm, onCancel, danger=false }) {
    const div = document.createElement('div');
    div.className = 'confirm-overlay';
    div.innerHTML = `<div class="confirm-modal"><h3 class="confirm-modal__title">${title}</h3><p class="confirm-modal__message">${message}</p><div class="confirm-modal__actions"><button class="btn btn--ghost" id="cCan">${cancelText}</button><button class="btn ${danger?'btn--danger':'btn--primary'}" id="cSub">${confirmText}</button></div></div>`;
    document.body.appendChild(div);
    div.querySelector('#cCan').onclick = () => { div.remove(); if(onCancel) onCancel(); };
    div.querySelector('#cSub').onclick = () => { div.remove(); if(onConfirm) onConfirm(); };
}

export function requireAuth(callback) {
    showLoader();
    fb.onAuthStateChanged(fb.auth, async (user) => {
        if (!user) { window.location.href = 'login.html'; return; }
        const userData = await fb.getUserData(user.uid);
        if (!userData) { window.location.href = 'login.html'; return; }
        if (userData.accountStatus === 'suspended') {
            document.body.innerHTML = `<div class="status-screen"><div class="status-screen__icon status-screen__icon--error"><i class="fa-solid fa-ban"></i></div><h1 class="status-screen__title">Account Suspended</h1><p class="status-screen__message">Contact support for details.</p></div>`;
            hideLoader(); return;
        }
        hideLoader(); // CRITICAL: Called before callback
        callback(user, userData);
    });
}

export function requireAdmin(callback) {
    requireAuth((user, userData) => {
        if (userData.role !== 'admin') { window.location.href = 'dashboard.html'; return; }
        callback(user, userData);
    });
}

export function redirectIfLoggedIn() {
    fb.onAuthStateChanged(fb.auth, async (user) => {
        if (user) {
            const data = await fb.getUserData(user.uid);
            if (data) window.location.href = data.role === 'admin' ? 'admin-portal.html' : 'dashboard.html';
        }
    });
}

export function initTheme() { applyTheme(localStorage.getItem('sba-theme') || 'system'); }
export function applyTheme(t) {
    localStorage.setItem('sba-theme', t);
    const isDark = t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
}

export function initNotificationBadge(uid) {
    const q = fb.query(fb.collection(fb.db, 'notifications'), fb.where('uid', '==', uid), fb.where('read', '==', false));
    fb.onSnapshot(q, (s) => {
        document.querySelectorAll('.notif-badge').forEach(b => {
            b.textContent = s.size; b.classList.toggle('show', s.size > 0);
        });
    });
}

export const showLoader = () => document.getElementById('pageLoader')?.classList.add('active');
export const hideLoader = () => document.getElementById('pageLoader')?.classList.remove('active');

export function buildPageHeader({ title, subtitle, backUrl }) {
    const el = document.getElementById('pageHeader');
    if (!el) return;
    el.className = 'page-header';
    el.innerHTML = `
        <a href="${backUrl}" class="page-header__back"><i class="fa-solid fa-arrow-left"></i></a>
        <div class="page-header__title">
            <div>${title}</div>
            ${subtitle ? `<div class="page-header__sub">${subtitle}</div>` : ''}
        </div>
        <div class="sba-logo sba-logo--sm"><svg class="sba-logo__mark" viewBox="0 0 80 80"><path d="M6 6 H32 V14 H14 V32 H6 Z" fill="#003087"/><path d="M48 66 H66 V48 H74 V74 H48 Z" fill="#c8102e"/><text x="8" y="58" font-family="Arial Black" font-size="36" font-weight="900" fill="#003087">S</text><text x="28" y="58" font-family="Arial Black" font-size="36" font-weight="900" fill="#003087">B</text><text x="50" y="58" font-family="Arial Black" font-size="36" font-weight="900" fill="#003087">A</text></svg></div>
    `;
}

export function renderStatusBadge(status) {
    const map = {
        IDLE: { c:'idle', i:'fa-clock', l:'Pending' },
        PENDING: { c:'pending', i:'fa-hourglass-half', l:'In Review' },
        UNDER_REVIEW: { c:'review', i:'fa-magnifying-glass', l:'Reviewing' },
        APPROVED: { c:'approved', i:'fa-circle-check', l:'Approved' },
        REJECTED: { c:'rejected', i:'fa-circle-xmark', l:'Declined' }
    };
    const s = map[status] || map.IDLE;
    return `<span class="badge badge--${s.c}"><i class="fa-solid ${s.i}"></i> ${s.l}</span>`;
}

export const formatCurrency = (n) => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n);
export const formatDate = (ts) => ts ? new Date(ts.seconds*1000).toLocaleDateString() : 'N/A';
export function timeAgo(ts) {
    if (!ts) return '';
    const seconds = Math.floor((new Date() - new Date(ts.seconds*1000)) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + "y ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + "mo ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "d ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "h ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "m ago";
    return "just now";
}

export const copyToClipboard = (t, m='Copied!') => navigator.clipboard.writeText(t).then(()=>showToast(m,'success'));
export const debounce = (fn, d=300) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(()=>fn(...a), d); }; };

export function setButtonLoading(btn, isL, text='Processing...') {
    if (isL) { btn.dataset.orig = btn.innerHTML; btn.disabled = true; btn.classList.add('btn--loading'); btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${text}`; }
    else { btn.disabled = false; btn.classList.remove('btn--loading'); btn.innerHTML = btn.dataset.orig; }
}

export function buildSidebar({ activeId, userData }) {
    const el = document.getElementById('appSidebar'); if (!el) return;
    const nav = [
        { id:'dashboard', l:'Dashboard', i:'fa-house', a:'dashboard.html' },
        { id:'apply', l:'Apply', i:'fa-file-contract', a:'apply.html' },
        { id:'kyc', l:'KYC', i:'fa-id-card', a:'kyc.html' },
        { id:'deposit', l:'Deposit', i:'fa-wallet', a:'deposit.html' },
        { id:'tax', l:'Tax', i:'fa-file-invoice-dollar', a:'tax.html' },
        { id:'withdraw', l:'Withdraw', i:'fa-money-bill-transfer', a:'withdraw.html' },
        { id:'support', l:'Support', i:'fa-comments', a:'support.html', b:true },
        { id:'notifications', l:'Inbox', i:'fa-bell', a:'notifications.html', b:true },
        { id:'settings', l:'Settings', i:'fa-gear', a:'settings.html' }
    ];
    el.innerHTML = `
        <div class="app-sidebar__logo"><div class="sba-logo sba-logo--sm"><svg class="sba-logo__mark" viewBox="0 0 80 80"><path d="M6 6 H32 V14 H14 V32 H6 Z" fill="#003087"/><path d="M48 66 H66 V48 H74 V74 H48 Z" fill="#c8102e"/><text x="8" y="58" font-family="Arial Black" font-size="36" font-weight="900" fill="#003087">S</text><text x="28" y="58" font-family="Arial Black" font-size="36" font-weight="900" fill="#003087">B</text><text x="50" y="58" font-family="Arial Black" font-size="36" font-weight="900" fill="#003087">A</text></svg></div></div>
        <nav class="app-sidebar__nav">${nav.map(n=>`<a href="${n.a}" class="nav-item ${activeId===n.id?'active':''}"><i class="fa-solid ${n.i}"></i><span>${n.l}</span>${n.b?`<span class="nav-item__badge notif-badge">0</span>`:''}</a>`).join('')}</nav>
        <div class="app-sidebar__footer"><div class="nav-user"><div class="avatar-sm">${userData.fullName[0]}</div><div><div class="nav-user__name">${userData.fullName}</div><div class="nav-user__role">${userData.role}</div></div></div><button class="nav-item" id="logoutBtn" style="color:var(--red)"><i class="fa-solid fa-right-from-bracket"></i> Logout</button></div>
    `;
    const overlay = document.getElementById('sidebarOverlay');
    const toggle = () => { el.classList.toggle('open'); overlay.classList.toggle('show'); document.querySelector('.hamburger i')?.classList.toggle('fa-bars'); document.querySelector('.hamburger i')?.classList.toggle('fa-xmark'); };
    overlay.onclick = toggle; document.querySelectorAll('.hamburger').forEach(h=>h.onclick=toggle);
    document.getElementById('logoutBtn').onclick = () => showConfirm({ title:'Logout', message:'Exit portal?', onConfirm:()=>fb.signOut(fb.auth).then(()=>window.location.href='login.html') });
}

export function buildDock({ activeId }) {
    const el = document.getElementById('mobileDock'); if(!el) return;
    const items = [ {id:'home',i:'fa-house',l:'Home',a:'dashboard.html'}, {id:'apply',i:'fa-file-contract',l:'Apply',a:'apply.html'}, {id:'deposit',i:'fa-wallet',l:'Deposit',a:'deposit.html'}, {id:'support',i:'fa-comments',l:'Support',a:'support.html'}, {id:'more',i:'fa-bars',l:'More',a:'#'} ];
    el.innerHTML = items.map(n=>`<a href="${n.a}" class="dock-item ${activeId===n.id?'active':''}" ${n.id==='more'?'onclick="document.getElementById(\'sidebarOverlay\').click(); return false;"':''}><i class="fa-solid ${n.i}"></i><span>${n.l}</span></a>`).join('');
}
