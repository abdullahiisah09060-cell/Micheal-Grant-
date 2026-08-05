import { 
    auth, db, onAuthStateChanged, listenUserData, getUserData, 
    updateUserData, setUserOnline, markNotificationRead, 
    onSnapshot, query, collection, where, orderBy, doc, getDoc 
} from './firebase-config.js';

// --- Toast System ---
export function showToast(message, type = 'info', duration = 4500) {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    
    const icons = {
        success: 'fa-circle-check',
        error: 'fa-circle-xmark',
        warning: 'fa-triangle-exclamation',
        info: 'fa-circle-info'
    };

    toast.innerHTML = `
        <i class="fa-solid ${icons[type]} toast__icon"></i>
        <div class="toast__content">${message}</div>
        <button class="toast__close"><i class="fa-solid fa-xmark"></i></button>
    `;

    container.appendChild(toast);

    const dismiss = () => {
        toast.classList.add('toast--hiding');
        setTimeout(() => toast.remove(), 300);
    };

    toast.querySelector('.toast__close').onclick = dismiss;
    setTimeout(dismiss, duration);
}

// --- Confirm Modal ---
export function showConfirm({ title, message, confirmText = 'Confirm', cancelText = 'Cancel', onConfirm, onCancel, danger = false }) {
    const overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';
    overlay.innerHTML = `
        <div class="confirm-modal">
            <h3 class="confirm-modal__title">${title}</h3>
            <p class="confirm-modal__message">${message}</p>
            <div class="confirm-modal__actions">
                <button class="btn btn--ghost" id="confirmCancel">${cancelText}</button>
                <button class="btn ${danger ? 'btn--danger' : 'btn--primary'}" id="confirmSubmit">${confirmText}</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    const close = () => overlay.remove();
    
    overlay.querySelector('#confirmCancel').onclick = () => { onCancel?.(); close(); };
    overlay.querySelector('#confirmSubmit').onclick = () => { onConfirm?.(); close(); };
    overlay.addEventListener('click', (e) => { if(e.target === overlay) close(); });
}

// --- Auth Guards ---
export function requireAuth(callback) {
    showLoader();
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            window.location.href = 'login.html';
            return;
        }

        listenUserData(user.uid, async (userData) => {
            if (!userData) return;
            
            // Check Maintenance Mode
            const configSnap = await getDoc(doc(db, 'config', 'platform'));
            const config = configSnap.data();
            if (config?.maintenanceMode && userData.role !== 'admin') {
                document.body.innerHTML = `
                    <div style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;background:var(--bg);padding:40px;text-align:center;">
                        <i class="fa-solid fa-gear fa-spin" style="font-size:3rem;color:var(--navy);margin-bottom:24px;"></i>
                        <h1 style="color:var(--navy);margin-bottom:12px;">Maintenance in Progress</h1>
                        <p style="color:var(--text-secondary);max-width:400px;">The SBA portal is temporarily offline for scheduled maintenance. Please check back soon.</p>
                    </div>
                `;
                return;
            }

            if (userData.accountStatus === 'suspended') {
                document.body.innerHTML = `<div class="status-screen"><div class="status-screen__icon status-screen__icon--error"><i class="fa-solid fa-ban"></i></div><h1 class="status-screen__title">Account Suspended</h1><p class="status-screen__message">Your account has been suspended for violating terms of service. Please contact support.</p><button onclick="signOut(auth).then(()=>location.href='login.html')" class="btn btn--primary">Sign Out</button></div>`;
                hideLoader();
                return;
            }
            hideLoader();
            callback(user, userData);
        });
    });
}

export function requireAdmin(callback) {
    requireAuth((user, userData) => {
        if (userData.role !== 'admin') {
            window.location.href = 'dashboard.html';
            return;
        }
        callback(user, userData);
    });
}

export function redirectIfLoggedIn() {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            const data = await getUserData(user.uid);
            if (data?.role === 'admin') window.location.href = 'admin-portal.html';
            else window.location.href = 'dashboard.html';
        }
    });
}

// --- UI Utilities ---
export const showLoader = () => document.getElementById('pageLoader')?.classList.add('active');
export const hideLoader = () => document.getElementById('pageLoader')?.classList.remove('active');

export function initTheme() {
    const saved = localStorage.getItem('sba-theme') || 'system';
    applyTheme(saved);
}

export function applyTheme(theme) {
    const root = document.documentElement;
    if (theme === 'system') {
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        root.setAttribute('data-theme', isDark ? 'dark' : 'light');
    } else {
        root.setAttribute('data-theme', theme);
    }
    localStorage.setItem('sba-theme', theme);
}

export function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

export function formatDate(ts, includeTime = false) {
    if (!ts) return '---';
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleDateString('en-US', includeTime ? { dateStyle: 'medium', timeStyle: 'short' } : { dateStyle: 'medium' });
}

export function copyToClipboard(text, msg = 'Copied!') {
    navigator.clipboard.writeText(text).then(() => showToast(msg, 'success'));
}

export function setButtonLoading(btn, isLoading, loadingText = 'Processing...', originalText) {
    if (isLoading) {
        btn.setAttribute('data-original', btn.innerHTML);
        btn.disabled = true;
        btn.classList.add('btn--loading');
        btn.innerHTML = `<span style="opacity:0">${btn.innerHTML}</span>`;
    } else {
        btn.disabled = false;
        btn.classList.remove('btn--loading');
        btn.innerHTML = originalText || btn.getAttribute('data-original');
    }
}

// --- Layout Builders ---
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
        <div class="sba-logo sba-logo--sm">
            <svg class="sba-logo__mark" viewBox="0 0 80 80"><path d="M6 6 H32 V14 H14 V32 H6 Z" fill="#003087"/><path d="M48 66 H66 V48 H74 V74 H48 Z" fill="#c8102e"/><text x="8" y="58" font-family="Arial Black" font-size="36" font-weight="900" fill="#003087">S</text><text x="28" y="58" font-family="Arial Black" font-size="36" font-weight="900" fill="#003087">B</text><text x="50" y="58" font-family="Arial Black" font-size="36" font-weight="900" fill="#003087">A</text></svg>
        </div>
    `;
}

export function buildSidebar({ activeId, userData }) {
    const el = document.getElementById('appSidebar');
    if (!el) return;
    
    const items = [
        { id: 'dashboard', icon: 'fa-house', label: 'Dashboard', url: 'dashboard.html' },
        { id: 'apply', icon: 'fa-file-contract', label: 'Apply for Grant', url: 'apply.html' },
        { id: 'kyc', icon: 'fa-id-card', label: 'Identity (KYC)', url: 'kyc.html' },
        { id: 'deposit', icon: 'fa-wallet', label: 'Deposit Funds', url: 'deposit.html' },
        { id: 'tax', icon: 'fa-file-invoice-dollar', label: 'Tax Clearance', url: 'tax.html' },
        { id: 'withdraw', icon: 'fa-money-bill-transfer', label: 'Withdraw Funds', url: 'withdraw.html' },
        { id: 'ledger', icon: 'fa-chart-bar', label: 'History', url: 'ledger.html' },
        { id: 'award', icon: 'fa-trophy', label: 'Award Certificate', url: 'award.html' },
        { id: 'vault', icon: 'fa-folder-open', label: 'Document Vault', url: 'vault.html' },
        { id: 'support', icon: 'fa-comments', label: 'Support Chat', url: 'support.html', badge: true },
        { id: 'notifs', icon: 'fa-bell', label: 'Notifications', url: 'notifications.html', badge: true },
        { id: 'settings', icon: 'fa-gear', label: 'Settings', url: 'settings.html' }
    ];

    el.innerHTML = `
        <div class="app-sidebar__logo">
            <div class="sba-logo">
                <svg class="sba-logo__mark" viewBox="0 0 80 80"><path d="M6 6 H32 V14 H14 V32 H6 Z" fill="#003087"/><path d="M48 66 H66 V48 H74 V74 H48 Z" fill="#c8102e"/><text x="8" y="58" font-family="Arial Black" font-size="36" font-weight="900" fill="#003087">S</text><text x="28" y="58" font-family="Arial Black" font-size="36" font-weight="900" fill="#003087">B</text><text x="50" y="58" font-family="Arial Black" font-size="36" font-weight="900" fill="#003087">A</text></svg>
                <div class="sba-logo__text"><span class="sba-logo__name">U.S. Small Business</span><span class="sba-logo__sub">Administration</span></div>
            </div>
        </div>
        <nav class="app-sidebar__nav">
            ${items.map(item => `
                <a href="${item.url}" class="nav-item ${activeId === item.id ? 'active' : ''}">
                    <i class="fa-solid ${item.icon}"></i>
                    <span>${item.label}</span>
                    ${item.badge ? `<span class="nav-item__badge notif-badge" id="badge-${item.id}"></span>` : ''}
                </a>
            `).join('')}
        </nav>
        <div class="app-sidebar__footer">
            <div class="nav-item" style="cursor:default; hover:none;">
                <div style="width:32px;height:32px;border-radius:50%;background:var(--navy);color:white;display:flex;align-items:center;justify-content:center;font-size:0.7rem;font-weight:800;">${userData.fullName.split(' ').map(n=>n[0]).join('')}</div>
                <div style="overflow:hidden"><div style="font-weight:700;font-size:0.8rem;white-space:nowrap;text-overflow:ellipsis;">${userData.fullName}</div><div style="font-size:0.65rem;color:var(--text-muted)">User ID: ${userData.uid.slice(0,8)}</div></div>
            </div>
            <button class="nav-item" onclick="import('./firebase-config.js').then(m=>m.signOut(m.auth).then(()=>location.href='login.html'))">
                <i class="fa-solid fa-right-from-bracket"></i><span>Sign Out</span>
            </button>
        </div>
    `;

    // Sidebar toggles
    const overlay = document.getElementById('sidebarOverlay');
    const toggle = () => { el.classList.toggle('open'); overlay.classList.toggle('show'); };
    document.querySelectorAll('.hamburger, #sidebarOverlay').forEach(b => b.onclick = toggle);
}

export function buildDock({ activeId }) {
    const el = document.getElementById('mobileDock');
    if (!el) return;
    el.innerHTML = `
        <a href="dashboard.html" class="dock-item ${activeId==='home'?'active':''}"><i class="fa-solid fa-house"></i><span>Home</span></a>
        <a href="apply.html" class="dock-item ${activeId==='apply'?'active':''}"><i class="fa-solid fa-file-contract"></i><span>Apply</span></a>
        <a href="deposit.html" class="dock-item ${activeId==='deposit'?'active':''}"><i class="fa-solid fa-wallet"></i><span>Deposit</span></a>
        <a href="support.html" class="dock-item ${activeId==='support'?'active':''}"><i class="fa-solid fa-comments"></i><span>Support</span></a>
        <button class="dock-item hamburger"><i class="fa-solid fa-bars"></i><span>More</span></button>
    `;
}

export function initNotificationBadge(uid) {
    const q = query(collection(db, "notifications"), where("uid", "==", uid), where("read", "==", false));
    onSnapshot(q, (snap) => {
        const count = snap.size;
        document.querySelectorAll('.notif-badge').forEach(b => {
            b.innerText = count;
            b.classList.toggle('show', count > 0);
        });
    });
}
