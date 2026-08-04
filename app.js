import { 
    auth, db, onAuthStateChanged, getUserData, listenUserData, setUserOnline, 
    onSnapshot, collection, query, where, orderBy
} from './firebase-config.js';

/**
 * Toast Notification System
 */
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

/**
 * Custom Confirmation Modal
 */
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
    document.body.style.overflow = 'hidden';

    const close = () => {
        overlay.remove();
        document.body.style.overflow = '';
    };

    overlay.querySelector('#confirmCancel').onclick = () => { close(); if (onCancel) onCancel(); };
    overlay.querySelector('#confirmSubmit').onclick = () => { close(); if (onConfirm) onConfirm(); };
}

/**
 * Auth Guards
 */
export function requireAuth(callback) {
    showLoader();
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            window.location.href = 'login.html';
            return;
        }
        listenUserData(user.uid, (userData) => {
            if (!userData) return;
            if (userData.accountStatus === 'suspended') {
                document.body.innerHTML = `
                    <div class="status-screen">
                        <div class="status-screen__icon status-screen__icon--error"><i class="fa-solid fa-ban"></i></div>
                        <h1 class="status-screen__title">Account Suspended</h1>
                        <p class="status-screen__message">Your access has been restricted. Please contact support.</p>
                        <button class="btn btn--primary" onclick="location.href='login.html'">Back to Login</button>
                    </div>`;
                hideLoader();
                return;
            }
            setUserOnline(user.uid, true);
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
            window.location.href = (data?.role === 'admin') ? 'admin-portal.html' : 'dashboard.html';
        }
    });
}

/**
 * Page Components
 */
export function buildPageHeader({ title, subtitle, backUrl }) {
    const header = document.getElementById('pageHeader');
    if (!header) return;
    header.innerHTML = `
        <div class="page-header">
            ${backUrl ? `<a href="${backUrl}" class="page-header__back"><i class="fa-solid fa-arrow-left"></i></a>` : ''}
            <div class="sba-logo sba-logo--sm">
                <svg class="sba-logo__mark" viewBox="0 0 80 80">
                    <path d="M6 6 H32 V14 H14 V32 H6 Z" fill="#003087"/><path d="M48 66 H66 V48 H74 V74 H48 Z" fill="#c8102e"/>
                    <text x="8" y="58" font-family="Arial Black" font-size="36" font-weight="900" fill="#003087">S</text>
                    <text x="28" y="58" font-family="Arial Black" font-size="36" font-weight="900" fill="#003087">B</text>
                    <text x="50" y="58" font-family="Arial Black" font-size="36" font-weight="900" fill="#003087">A</text>
                </svg>
            </div>
            <div class="page-header__title">${title} ${subtitle ? `<span class="page-header__sub">/ ${subtitle}</span>` : ''}</div>
        </div>`;
}

export function buildSidebar({ activeId, userData }) {
    const sidebar = document.getElementById('appSidebar');
    if (!sidebar) return;

    const navItems = [
        { id: 'dashboard', icon: 'fa-house', label: 'Dashboard', url: 'dashboard.html' },
        { id: 'apply', icon: 'fa-file-contract', label: 'Apply', url: 'apply.html' },
        { id: 'kyc', icon: 'fa-id-card', label: 'Identity', url: 'kyc.html' },
        { id: 'deposit', icon: 'fa-wallet', label: 'Deposit', url: 'deposit.html' },
        { id: 'tax', icon: 'fa-file-invoice-dollar', label: 'Tax', url: 'tax.html' },
        { id: 'withdraw', icon: 'fa-money-bill-transfer', label: 'Withdraw', url: 'withdraw.html' },
        { id: 'ledger', icon: 'fa-chart-bar', label: 'History', url: 'ledger.html' },
        { id: 'award', icon: 'fa-trophy', label: 'Award', url: 'award.html' },
        { id: 'support', icon: 'fa-comments', label: 'Support', url: 'support.html' },
        { id: 'settings', icon: 'fa-gear', label: 'Settings', url: 'settings.html' }
    ];

    sidebar.innerHTML = `
        <div class="app-sidebar__logo">
            <div class="sba-logo">
                <svg class="sba-logo__mark" viewBox="0 0 80 80"><path d="M6 6 H32 V14 H14 V32 H6 Z" fill="#003087"/><path d="M48 66 H66 V48 H74 V74 H48 Z" fill="#c8102e"/><text x="8" y="58" font-family="Arial Black" font-size="36" font-weight="900" fill="#003087">S</text><text x="28" y="58" font-family="Arial Black" font-size="36" font-weight="900" fill="#003087">B</text><text x="50" y="58" font-family="Arial Black" font-size="36" font-weight="900" fill="#003087">A</text></svg>
                <div class="sba-logo__text"><span class="sba-logo__name">U.S. Small Business</span><span class="sba-logo__sub">Administration</span></div>
            </div>
        </div>
        <nav class="app-sidebar__nav">
            ${navItems.map(item => `
                <a href="${item.url}" class="nav-item ${activeId === item.id ? 'active' : ''}">
                    <i class="fa-solid ${item.icon}"></i> <span>${item.label}</span>
                </a>`).join('')}
        </nav>
        <div class="app-sidebar__footer">
            <div class="flex items-center gap-4 mb-4">
                <div style="width:36px; height:36px; border-radius:50%; background:var(--navy); color:white; display:flex; align-items:center; justify-content:center; font-weight:700; overflow:hidden;">
                    ${userData.avatarBase64 ? `<img src="${userData.avatarBase64}" style="width:100%; height:100%; object-fit:cover;">` : userData.fullName.charAt(0)}
                </div>
                <div style="font-size:0.8rem; font-weight:600; line-height:1.2;">
                    ${userData.fullName}<br><span style="font-weight:400; color:var(--text-muted);">${userData.email}</span>
                </div>
            </div>
            <button class="nav-item" style="color:var(--red); border:none; background:none; padding:0; width:auto;" id="btnSignOut">
                <i class="fa-solid fa-right-from-bracket"></i> <span>Sign Out</span>
            </button>
        </div>`;

    document.getElementById('btnSignOut').onclick = () => {
        showConfirm({ title: 'Sign Out', message: 'Confirm logout?', onConfirm: () => auth.signOut().then(() => location.href = 'login.html') });
    };
}

export function buildDock({ activeId }) {
    const dock = document.getElementById('mobileDock');
    if (!dock) return;
    const items = [
        { id: 'home', icon: 'fa-house', label: 'Home', url: 'dashboard.html' },
        { id: 'apply', icon: 'fa-file-contract', label: 'Apply', url: 'apply.html' },
        { id: 'deposit', icon: 'fa-wallet', label: 'Deposit', url: 'deposit.html' },
        { id: 'support', icon: 'fa-comments', label: 'Support', url: 'support.html' },
        { id: 'more', icon: 'fa-bars', label: 'More', url: '#' }
    ];
    dock.innerHTML = items.map(item => `
        <a href="${item.url}" class="dock-item ${activeId === item.id ? 'active' : ''}" ${item.id === 'more' ? 'id="dockMoreBtn"' : ''}>
            <i class="fa-solid ${item.icon}"></i><span>${item.label}</span>
        </a>`).join('');
    
    document.getElementById('dockMoreBtn')?.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('appSidebar').classList.toggle('open');
        document.getElementById('sidebarOverlay').classList.toggle('show');
    });
}

/**
 * Global Logic
 */
export const formatCurrency = (amt) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amt);
export const showLoader = () => document.getElementById('pageLoader')?.classList.add('active');
export const hideLoader = () => document.getElementById('pageLoader')?.classList.remove('active');

export function initTheme() {
    const theme = localStorage.getItem('sba-theme') || 'light';
    document.documentElement.setAttribute('data-theme', theme);
}

export function setButtonLoading(btn, isLoading, loadingText = 'Processing...') {
    if (isLoading) {
        btn.dataset.original = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> ${loadingText}`;
    } else {
        btn.disabled = false;
        btn.innerHTML = btn.dataset.original || 'Submit';
    }
}

export function initNotificationBadge(uid) {
    const q = query(collection(db, "notifications"), where("uid", "==", uid), where("read", "==", false));
    onSnapshot(q, (snap) => {
        const count = snap.size;
        document.querySelectorAll('.notif-badge').forEach(b => {
            b.innerText = count > 0 ? (count > 9 ? '9+' : count) : '';
            b.style.display = count > 0 ? 'flex' : 'none';
        });
    });
}
