import { 
    auth, db, onAuthStateChanged, getUserData, listenUserData, setUserOnline, isAdmin
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
        <div class="confirm-modal" role="dialog" aria-modal="true">
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

    overlay.querySelector('#confirmCancel').onclick = () => {
        close();
        if (onCancel) onCancel();
    };

    overlay.querySelector('#confirmSubmit').onclick = () => {
        close();
        if (onConfirm) onConfirm();
    };

    // ESC to close
    const handleKey = (e) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', handleKey, { once: true });
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
                        <p class="status-screen__message">Your access to the SBA Grant Portal has been suspended. Please contact support if you believe this is an error.</p>
                        <button class="btn btn--primary" onclick="auth.signOut().then(()=>window.location.reload())">Sign Out</button>
                    </div>
                `;
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
            if (data?.role === 'admin') window.location.href = 'admin-portal.html';
            else window.location.href = 'dashboard.html';
        }
    });
}

/**
 * UI Builders
 */
export function buildPageHeader({ title, subtitle, backUrl }) {
    const header = document.getElementById('pageHeader');
    if (!header) return;

    header.className = 'page-header';
    header.innerHTML = `
        ${backUrl ? `<a href="${backUrl}" class="page-header__back"><i class="fa-solid fa-arrow-left"></i></a>` : ''}
        <div class="sba-logo sba-logo--sm">
            <svg class="sba-logo__mark" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 6 H32 V14 H14 V32 H6 Z" fill="#003087"/>
                <path d="M48 66 H66 V48 H74 V74 H48 Z" fill="#c8102e"/>
                <text x="8" y="58" font-family="Arial Black" font-size="36" font-weight="900" fill="#003087">S</text>
                <text x="28" y="58" font-family="Arial Black" font-size="36" font-weight="900" fill="#003087">B</text>
                <text x="50" y="58" font-family="Arial Black" font-size="36" font-weight="900" fill="#003087">A</text>
            </svg>
        </div>
        <div class="page-header__content">
            <h1 class="page-header__title">${title}</h1>
            ${subtitle ? `<p class="page-header__sub">${subtitle}</p>` : ''}
        </div>
    `;
}

export function buildSidebar({ activeId, userData }) {
    const sidebar = document.getElementById('appSidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (!sidebar) return;

    const navItems = [
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
        { id: 'notifications', icon: 'fa-bell', label: 'Notifications', url: 'notifications.html', badge: true },
        { id: 'settings', icon: 'fa-gear', label: 'Settings', url: 'settings.html' }
    ];

    sidebar.innerHTML = `
        <div class="app-sidebar__logo">
            <div class="sba-logo">
                <svg class="sba-logo__mark" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6 6 H32 V14 H14 V32 H6 Z" fill="#003087"/>
                    <path d="M48 66 H66 V48 H74 V74 H48 Z" fill="#c8102e"/>
                    <text x="8" y="58" font-family="Arial Black" font-size="36" font-weight="900" fill="#003087">S</text>
                    <text x="28" y="58" font-family="Arial Black" font-size="36" font-weight="900" fill="#003087">B</text>
                    <text x="50" y="58" font-family="Arial Black" font-size="36" font-weight="900" fill="#003087">A</text>
                </svg>
                <div class="sba-logo__text">
                    <span class="sba-logo__name">U.S. Small Business</span>
                    <span class="sba-logo__sub">Administration</span>
                </div>
            </div>
        </div>
        <nav class="app-sidebar__nav">
            ${navItems.map(item => `
                <a href="${item.url}" class="nav-item ${activeId === item.id ? 'active' : ''}">
                    <i class="fa-solid ${item.icon}"></i>
                    <span>${item.label}</span>
                    ${item.badge ? `<span class="nav-item__badge" id="badge-${item.id}"></span>` : ''}
                </a>
            `).join('')}
        </nav>
        <div class="app-sidebar__footer">
            <div class="nav-user">
                <div class="nav-user__avatar" style="background-color: var(--navy)">
                    ${userData.avatarBase64 ? `<img src="${userData.avatarBase64}">` : userData.fullName.charAt(0)}
                </div>
                <div class="nav-user__info">
                    <div class="nav-user__name">${userData.fullName}</div>
                    <div class="nav-user__role">${userData.role.toUpperCase()}</div>
                </div>
            </div>
            <button class="nav-item" style="margin-top: 12px; color: var(--red)" id="sidebarSignOut">
                <i class="fa-solid fa-right-from-bracket"></i>
                <span>Sign Out</span>
            </button>
        </div>
    `;

    document.getElementById('sidebarSignOut').onclick = () => {
        showConfirm({
            title: 'Sign Out',
            message: 'Are you sure you want to log out of your SBA account?',
            onConfirm: () => auth.signOut().then(() => window.location.href = 'login.html')
        });
    };

    // Mobile interactions
    if (overlay) {
        overlay.onclick = () => {
            sidebar.classList.remove('open');
            overlay.classList.remove('show');
        };
    }
}

export function buildDock({ activeId }) {
    const dock = document.getElementById('mobileDock');
    if (!dock) return;

    const dockItems = [
        { id: 'home', icon: 'fa-house', label: 'Home', url: 'dashboard.html' },
        { id: 'apply', icon: 'fa-file-contract', label: 'Apply', url: 'apply.html' },
        { id: 'deposit', icon: 'fa-wallet', label: 'Deposit', url: 'deposit.html' },
        { id: 'support', icon: 'fa-comments', label: 'Support', url: 'support.html' },
        { id: 'more', icon: 'fa-bars', label: 'More', url: '#' }
    ];

    dock.innerHTML = dockItems.map(item => `
        <a href="${item.url}" class="dock-item ${activeId === item.id ? 'active' : ''}" id="${item.id === 'more' ? 'dockMore' : ''}">
            <i class="fa-solid ${item.icon}"></i>
            <span>${item.label}</span>
        </a>
    `).join('');

    const moreBtn = document.getElementById('dockMore');
    if (moreBtn) {
        moreBtn.onclick = (e) => {
            e.preventDefault();
            document.getElementById('appSidebar').classList.toggle('open');
            document.getElementById('sidebarOverlay').classList.toggle('show');
        };
    }
}

/**
 * Theme Engine
 */
export function initTheme() {
    const saved = localStorage.getItem('sba-theme') || 'system';
    applyTheme(saved);
}

export function applyTheme(theme) {
    localStorage.setItem('sba-theme', theme);
    const root = document.documentElement;
    
    if (theme === 'system') {
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        root.setAttribute('data-theme', isDark ? 'dark' : 'light');
    } else {
        root.setAttribute('data-theme', theme);
    }
}

/**
 * Utilities
 */
export const formatCurrency = (amt) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amt);
export const showLoader = () => document.getElementById('pageLoader')?.classList.add('active');
export const hideLoader = () => document.getElementById('pageLoader')?.classList.remove('active');

export function setButtonLoading(btn, isLoading, loadingText = 'Processing...') {
    if (isLoading) {
        btn.dataset.originalText = btn.innerHTML;
        btn.disabled = true;
        btn.classList.add('btn--loading');
        btn.innerHTML = loadingText;
    } else {
        btn.innerHTML = btn.dataset.originalText || 'Submit';
        btn.disabled = false;
        btn.classList.remove('btn--loading');
    }
}

export function initNotificationBadge(uid) {
    const q = query(collection(db, "notifications"), where("uid", "==", uid), where("read", "==", false));
    onSnapshot(q, (snap) => {
        const count = snap.size;
        document.querySelectorAll('.nav-item__badge, .notif-badge').forEach(b => {
            if (count > 0) {
                b.textContent = count > 9 ? '9+' : count;
                b.classList.add('show');
            } else {
                b.classList.remove('show');
            }
        });
    });
}
