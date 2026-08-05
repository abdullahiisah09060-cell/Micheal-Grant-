import { 
    auth, db, onAuthStateChanged, listenUserData, getUserData, setUserOnline, isAdmin
} from './firebase-config.js';

/**
 * UI COMPONENTS & SYSTEMS
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

    overlay.querySelector('#confirmCancel').onclick = () => {
        if (onCancel) onCancel();
        close();
    };

    overlay.querySelector('#confirmSubmit').onclick = () => {
        if (onConfirm) onConfirm();
        close();
    };
}

/**
 * AUTH GUARDS
 */

export function requireAuth(callback) {
    showLoader();
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            window.location.href = 'login.html';
            return;
        }

        // Maintenance Mode Check
        const configSnap = await getUserData('config/platform'); // This is a specific path helper logic
        // For simplicity in this prompt, we fetch config/platform doc
        const db_ref = doc(db, 'config', 'platform');
        const configDoc = await getDoc(db_ref);
        const config = configDoc.data();

        listenUserData(user.uid, (userData) => {
            if (!userData) return;

            if (config?.maintenanceMode && userData.role !== 'admin') {
                document.body.innerHTML = `
                    <div style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;background:var(--bg);padding:40px;text-align:center;font-family:var(--font);">
                        <i class="fa-solid fa-gear fa-spin" style="font-size:3rem;color:var(--navy);margin-bottom:24px;"></i>
                        <h1 style="color:var(--navy);margin-bottom:12px;">Maintenance in Progress</h1>
                        <p style="color:var(--text-secondary);max-width:400px;margin:0 auto;">The SBA portal is temporarily offline for scheduled maintenance. Please check back soon.</p>
                    </div>
                `;
                return;
            }

            if (userData.accountStatus === 'suspended') {
                document.body.innerHTML = `
                    <div style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;background:var(--bg);padding:40px;text-align:center;font-family:var(--font);">
                        <div class="status-screen__icon status-screen__icon--error"><i class="fa-solid fa-ban"></i></div>
                        <h1 style="color:var(--navy);margin-bottom:12px;">Account Suspended</h1>
                        <p style="color:var(--text-secondary);max-width:400px;margin: 0 auto 24px;">Your account has been suspended for violating federal guidelines. Please contact support if you believe this is an error.</p>
                        <button class="btn btn--primary" onclick="location.href='support.html'">Contact Support</button>
                    </div>
                `;
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
            const userData = await getUserData(user.uid);
            if (userData?.role === 'admin') {
                window.location.href = 'admin-portal.html';
            } else {
                window.location.href = 'dashboard.html';
            }
        }
    });
}

/**
 * THEME SYSTEM
 */

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

export function initTheme() {
    const saved = localStorage.getItem('sba-theme') || 'system';
    applyTheme(saved);
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (localStorage.getItem('sba-theme') === 'system') applyTheme('system');
    });
}

/**
 * UI BUILDERS
 */

export function buildPageHeader({ title, subtitle, backUrl }) {
    const container = document.getElementById('pageHeader');
    if (!container) return;
    container.className = 'page-header';
    container.innerHTML = `
        ${backUrl ? `<a href="${backUrl}" class="page-header__back"><i class="fa-solid fa-arrow-left"></i></a>` : ''}
        <div class="sba-logo sba-logo--sm">
            <svg class="sba-logo__mark" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 6 H32 V14 H14 V32 H6 Z" fill="#003087"/>
                <path d="M48 66 H66 V48 H74 V74 H48 Z" fill="#c8102e"/>
                <text x="8" y="58" font-family="Arial Black, sans-serif" font-size="36" font-weight="900" fill="#003087">S</text>
                <text x="28" y="58" font-family="Arial Black, sans-serif" font-size="36" font-weight="900" fill="#003087">B</text>
                <text x="50" y="58" font-family="Arial Black, sans-serif" font-size="36" font-weight="900" fill="#003087">A</text>
            </svg>
        </div>
        <div class="page-header__content">
            <h1 class="page-header__title">${title}</h1>
            ${subtitle ? `<span class="page-header__sub">${subtitle}</span>` : ''}
        </div>
    `;
}

export function buildSidebar({ activeId, userData }) {
    const container = document.getElementById('appSidebar');
    if (!container) return;
    
    const items = [
        { id: 'dashboard', label: 'Dashboard', icon: 'fa-house', link: 'dashboard.html' },
        { id: 'apply', label: 'Apply for Grant', icon: 'fa-file-contract', link: 'apply.html' },
        { id: 'kyc', label: 'Identity (KYC)', icon: 'fa-id-card', link: 'kyc.html' },
        { id: 'deposit', label: 'Deposit Funds', icon: 'fa-wallet', link: 'deposit.html' },
        { id: 'tax', label: 'Tax Clearance', icon: 'fa-file-invoice-dollar', link: 'tax.html' },
        { id: 'withdraw', label: 'Withdraw Funds', icon: 'fa-money-bill-transfer', link: 'withdraw.html' },
        { id: 'ledger', label: 'Transaction History', icon: 'fa-chart-bar', link: 'ledger.html' },
        { id: 'award', label: 'Award Certificate', icon: 'fa-trophy', link: 'award.html' },
        { id: 'vault', label: 'Document Vault', icon: 'fa-folder-open', link: 'vault.html' },
        { id: 'support', label: 'Support Chat', icon: 'fa-comments', link: 'support.html', badgeId: 'chat-badge' },
        { id: 'notifications', label: 'Notifications', icon: 'fa-bell', link: 'notifications.html', badgeId: 'notif-badge' },
        { id: 'settings', label: 'Settings', icon: 'fa-gear', link: 'settings.html' }
    ];

    container.innerHTML = `
        <div class="app-sidebar__logo">
            <div class="sba-logo">
                <svg class="sba-logo__mark" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6 6 H32 V14 H14 V32 H6 Z" fill="#003087"/>
                    <path d="M48 66 H66 V48 H74 V74 H48 Z" fill="#c8102e"/>
                    <text x="8" y="58" font-family="Arial Black, sans-serif" font-size="36" font-weight="900" fill="#003087">S</text>
                    <text x="28" y="58" font-family="Arial Black, sans-serif" font-size="36" font-weight="900" fill="#003087">B</text>
                    <text x="50" y="58" font-family="Arial Black, sans-serif" font-size="36" font-weight="900" fill="#003087">A</text>
                </svg>
                <div class="sba-logo__text">
                    <span class="sba-logo__name">U.S. Small Business</span>
                    <span class="sba-logo__sub">Administration</span>
                </div>
            </div>
        </div>
        <nav class="app-sidebar__nav">
            ${items.map(item => `
                <a href="${item.link}" class="nav-item ${activeId === item.id ? 'active' : ''}">
                    <i class="fa-solid ${item.icon}"></i>
                    <span>${item.label}</span>
                    <span class="nav-item__badge" id="${item.badgeId || ''}"></span>
                </a>
            `).join('')}
        </nav>
        <div class="app-sidebar__footer">
            <div class="nav-item" style="cursor:default; background:none;">
                <div class="avatar" style="width:32px;height:32px;background:var(--navy);color:white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:0.8rem;font-weight:700;">
                    ${userData.avatarBase64 ? `<img src="${userData.avatarBase64}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">` : userData.fullName.charAt(0)}
                </div>
                <div style="display:flex;flex-direction:column;overflow:hidden;">
                    <span style="font-size:0.85rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${userData.fullName}</span>
                    <span style="font-size:0.7rem;color:var(--text-muted);">ID: ${userData.uid.substring(0,8).toUpperCase()}</span>
                </div>
            </div>
            <button class="nav-item" id="sidebarSignOut" style="margin-top:10px; color:var(--red);">
                <i class="fa-solid fa-right-from-bracket"></i>
                <span>Sign Out</span>
            </button>
        </div>
    `;

    document.getElementById('sidebarSignOut').onclick = () => {
        showConfirm({
            title: 'Sign Out',
            message: 'Are you sure you want to log out of your SBA account?',
            onConfirm: () => {
                setUserOnline(userData.uid, false);
                auth.signOut();
            },
            danger: true
        });
    };
}

export function buildDock({ activeId }) {
    const container = document.getElementById('mobileDock');
    if (!container) return;
    const items = [
        { id: 'home', label: 'Home', icon: 'fa-house', link: 'dashboard.html' },
        { id: 'apply', label: 'Apply', icon: 'fa-file-contract', link: 'apply.html' },
        { id: 'deposit', label: 'Deposit', icon: 'fa-wallet', link: 'deposit.html' },
        { id: 'support', label: 'Support', icon: 'fa-comments', link: 'support.html' },
        { id: 'more', label: 'More', icon: 'fa-bars', action: () => document.getElementById('appSidebar').classList.add('open') }
    ];

    container.innerHTML = items.map(item => `
        <${item.link ? 'a href="'+item.link+'"' : 'button id="dockMore"'} class="dock-item ${activeId === item.id ? 'active' : ''}">
            <i class="fa-solid ${item.icon}"></i>
            <span>${item.label}</span>
        </${item.link ? 'a' : 'button'}>
    `).join('');

    if (document.getElementById('dockMore')) {
        document.getElementById('dockMore').onclick = () => {
            document.getElementById('appSidebar').classList.add('open');
            document.getElementById('sidebarOverlay').classList.add('show');
        };
    }
}

/**
 * UTILITIES
 */

export const showLoader = () => document.getElementById('pageLoader')?.classList.add('active');
export const hideLoader = () => document.getElementById('pageLoader')?.classList.remove('active');

export function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

export function formatDate(ts, includeTime = false) {
    if (!ts) return 'N/A';
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return includeTime ? date.toLocaleString() : date.toLocaleDateString();
}

export function timeAgo(ts) {
    if (!ts) return '';
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    const seconds = Math.floor((new Date() - date) / 1000);
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

export function copyToClipboard(text, msg = 'Copied to clipboard!') {
    navigator.clipboard.writeText(text).then(() => showToast(msg, 'success'));
}

export function setButtonLoading(btn, isLoading, loadingText = 'Processing...', originalText) {
    if (isLoading) {
        btn.setAttribute('data-original', btn.innerHTML);
        btn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> ${loadingText}`;
        btn.disabled = true;
        btn.classList.add('btn--loading');
    } else {
        btn.innerHTML = originalText || btn.getAttribute('data-original');
        btn.disabled = false;
        btn.classList.remove('btn--loading');
    }
}

export function renderStatusBadge(status) {
    const config = {
        IDLE: { class: 'badge--idle', icon: 'fa-clock', label: 'Pending' },
        PENDING: { class: 'badge--pending', icon: 'fa-hourglass-half', label: 'Processing' },
        UNDER_REVIEW: { class: 'badge--review', icon: 'fa-magnifying-glass', label: 'Review' },
        APPROVED: { class: 'badge--approved', icon: 'fa-circle-check', label: 'Approved' },
        REJECTED: { class: 'badge--rejected', icon: 'fa-circle-xmark', label: 'Rejected' },
        active: { class: 'badge--active', icon: 'fa-shield-check', label: 'Active' },
        suspended: { class: 'badge--suspended', icon: 'fa-ban', label: 'Suspended' }
    };
    const s = config[status] || config.IDLE;
    return `<span class="badge ${s.class}"><i class="fa-solid ${s.icon}"></i> ${s.label}</span>`;
}
