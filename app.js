import * as fb from './firebase-config.js';

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

    overlay.querySelector('#confirmCancel').onclick = () => {
        overlay.remove();
        if (onCancel) onCancel();
    };

    overlay.querySelector('#confirmSubmit').onclick = () => {
        overlay.remove();
        if (onConfirm) onConfirm();
    };
}

export function requireAuth(callback) {
    showLoader();
    fb.onAuthStateChanged(fb.auth, async (user) => {
        if (!user) {
            window.location.href = 'login.html';
            return;
        }
        const userData = await fb.getUserData(user.uid);
        if (!userData) {
            window.location.href = 'login.html';
            return;
        }
        if (userData.accountStatus === 'suspended') {
            document.body.innerHTML = `<div class="status-screen"><div class="status-screen__icon status-screen__icon--error"><i class="fa-solid fa-ban"></i></div><h1 class="status-screen__title">Account Suspended</h1><p class="status-screen__message">Your account has been suspended for violating SBA terms. Contact support for details.</p><button class="btn btn--primary" onclick="location.href='login.html'">Back to Login</button></div>`;
            hideLoader();
            return;
        }
        hideLoader();
        callback(user, userData);
    });
}

export function requireAdmin(callback) {
    requireAuth(async (user, userData) => {
        if (userData.role !== 'admin') {
            window.location.href = 'dashboard.html';
            return;
        }
        callback(user, userData);
    });
}

export function redirectIfLoggedIn() {
    fb.onAuthStateChanged(fb.auth, async (user) => {
        if (user) {
            const userData = await fb.getUserData(user.uid);
            if (userData) {
                window.location.href = userData.role === 'admin' ? 'admin-portal.html' : 'dashboard.html';
            }
        }
    });
}

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

export function initNotificationBadge(uid) {
    const q = fb.query(fb.collection(fb.db, 'notifications'), fb.where('uid', '==', uid), fb.where('read', '==', false));
    fb.onSnapshot(q, (snap) => {
        const count = snap.size;
        document.querySelectorAll('.notif-badge').forEach(b => {
            b.textContent = count;
            b.classList.toggle('show', count > 0);
        });
    });
}

export const showLoader = () => document.getElementById('pageLoader')?.classList.add('active');
export const hideLoader = () => document.getElementById('pageLoader')?.classList.remove('active');

export const formatCurrency = (amt) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amt);
export const formatDate = (ts, includeTime = false) => {
    if (!ts) return 'N/A';
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleDateString('en-US', includeTime ? { dateStyle: 'medium', timeStyle: 'short' } : { dateStyle: 'medium' });
};

export const copyToClipboard = (text, msg = 'Copied to clipboard!') => {
    navigator.clipboard.writeText(text).then(() => showToast(msg, 'success'));
};

export function setButtonLoading(btn, isLoading, loadingText = 'Processing...', originalText) {
    if (isLoading) {
        btn.dataset.original = btn.innerHTML;
        btn.disabled = true;
        btn.classList.add('btn--loading');
        btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${loadingText}`;
    } else {
        btn.disabled = false;
        btn.classList.remove('btn--loading');
        btn.innerHTML = originalText || btn.dataset.original;
    }
}

export function buildSidebar({ activeId, userData }) {
    const sidebar = document.getElementById('appSidebar');
    if (!sidebar) return;

    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: 'fa-house', link: 'dashboard.html' },
        { id: 'apply', label: 'Apply for Grant', icon: 'fa-file-contract', link: 'apply.html' },
        { id: 'kyc', label: 'Identity (KYC)', icon: 'fa-id-card', link: 'kyc.html' },
        { id: 'deposit', label: 'Deposit Funds', icon: 'fa-wallet', link: 'deposit.html' },
        { id: 'tax', label: 'Tax Clearance', icon: 'fa-file-invoice-dollar', link: 'tax.html' },
        { id: 'withdraw', label: 'Withdraw Funds', icon: 'fa-money-bill-transfer', link: 'withdraw.html' },
        { id: 'ledger', label: 'History', icon: 'fa-chart-bar', link: 'ledger.html' },
        { id: 'award', label: 'Award Certificate', icon: 'fa-trophy', link: 'award.html' },
        { id: 'support', label: 'Support Chat', icon: 'fa-comments', link: 'support.html', badge: true },
        { id: 'notifications', label: 'Notifications', icon: 'fa-bell', link: 'notifications.html', badge: true },
        { id: 'settings', label: 'Settings', icon: 'fa-gear', link: 'settings.html' }
    ];

    sidebar.innerHTML = `
        <div class="app-sidebar__logo">
            <div class="sba-logo sba-logo--sm">
                <svg class="sba-logo__mark" viewBox="0 0 80 80"><path d="M6 6 H32 V14 H14 V32 H6 Z" fill="#003087"/><path d="M48 66 H66 V48 H74 V74 H48 Z" fill="#c8102e"/><text x="8" y="58" font-family="Arial Black" font-size="36" font-weight="900" fill="#003087">S</text><text x="28" y="58" font-family="Arial Black" font-size="36" font-weight="900" fill="#003087">B</text><text x="50" y="58" font-family="Arial Black" font-size="36" font-weight="900" fill="#003087">A</text></svg>
                <div class="sba-logo__text"><span class="sba-logo__name">U.S. Small Business</span></div>
            </div>
        </div>
        <nav class="app-sidebar__nav">
            ${navItems.map(item => `
                <a href="${item.link}" class="nav-item ${activeId === item.id ? 'active' : ''}">
                    <i class="fa-solid ${item.icon}"></i>
                    <span>${item.label}</span>
                    ${item.badge ? `<span class="nav-item__badge notif-badge">0</span>` : ''}
                </a>
            `).join('')}
        </nav>
        <div class="app-sidebar__footer">
            <div class="flex items-center gap-4 mb-4">
                <div class="avatar-sm" style="background:var(--navy); color:white; width:36px; height:36px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:0.8rem;">
                    ${userData.fullName.split(' ').map(n => n[0]).join('').toUpperCase()}
                </div>
                <div class="flex-col">
                    <div style="font-size:0.85rem; font-weight:700; color:var(--text-primary);">${userData.fullName}</div>
                    <div style="font-size:0.7rem; color:var(--text-muted);">${userData.role.toUpperCase()}</div>
                </div>
            </div>
            <button class="nav-item" id="signOutBtn" style="color:var(--red);"><i class="fa-solid fa-right-from-bracket"></i> Logout</button>
        </div>
    `;

    document.getElementById('signOutBtn').onclick = () => {
        showConfirm({
            title: 'Logout',
            message: 'Are you sure you want to log out of the portal?',
            onConfirm: () => fb.signOut(fb.auth).then(() => window.location.href = 'login.html')
        });
    };

    // Mobile logic
    const overlay = document.getElementById('sidebarOverlay');
    const toggle = () => {
        sidebar.classList.toggle('open');
        overlay?.classList.toggle('show');
    };
    overlay.onclick = toggle;
    document.querySelectorAll('.hamburger').forEach(h => h.onclick = toggle);
}

export function buildDock({ activeId }) {
    const dock = document.getElementById('mobileDock');
    if (!dock) return;
    const items = [
        { id: 'home', icon: 'fa-house', label: 'Home', link: 'dashboard.html' },
        { id: 'apply', icon: 'fa-file-contract', label: 'Apply', link: 'apply.html' },
        { id: 'deposit', icon: 'fa-wallet', label: 'Deposit', link: 'deposit.html' },
        { id: 'support', icon: 'fa-comments', label: 'Support', link: 'support.html' },
        { id: 'more', icon: 'fa-bars', label: 'More', link: '#' }
    ];
    dock.innerHTML = items.map(item => `
        <a href="${item.link}" class="dock-item ${activeId === item.id ? 'active' : ''}" ${item.id === 'more' ? 'onclick="document.getElementById(\'sidebarOverlay\').click(); return false;"' : ''}>
            <i class="fa-solid ${item.icon}"></i>
            <span>${item.label}</span>
        </a>
    `).join('');
}
