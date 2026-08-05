import { 
    auth, db, onAuthStateChanged, listenUserData, updateUserData, setUserOnline, 
    isAdmin, query, collection, where, onSnapshot, updateDoc, doc, writeBatch 
} from './firebase-config.js';

export function showToast(message, type = 'info', duration = 4500) {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const icons = {
        success: 'fa-circle-check',
        error: 'fa-circle-xmark',
        warning: 'fa-triangle-exclamation',
        info: 'fa-circle-info'
    };

    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
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

    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
}

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
                        <p class="status-screen__message">Your access to the SBA portal has been suspended. Please contact support for assistance.</p>
                        <button class="btn btn--primary" onclick="window.location.href='support.html'">Contact Support</button>
                    </div>`;
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
    onAuthStateChanged(auth, (user) => {
        if (user) {
            onSnapshot(doc(db, "users", user.uid), (snap) => {
                const data = snap.data();
                if (data.role === 'admin') window.location.href = 'admin-portal.html';
                else window.location.href = 'dashboard.html';
            });
        }
    });
}

export function initTheme() {
    const saved = localStorage.getItem('sba-theme') || 'system';
    applyTheme(saved);
}

export function applyTheme(theme) {
    const html = document.documentElement;
    if (theme === 'system') {
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        html.setAttribute('data-theme', isDark ? 'dark' : 'light');
    } else {
        html.setAttribute('data-theme', theme);
    }
    localStorage.setItem('sba-theme', theme);
}

export function initNotificationBadge(uid) {
    const q = query(collection(db, "notifications"), where("uid", "==", uid), where("read", "==", false));
    onSnapshot(q, (snap) => {
        const count = snap.size;
        document.querySelectorAll('.notif-badge').forEach(b => {
            b.textContent = count;
            b.classList.toggle('show', count > 0);
        });
    });
}

export const showLoader = () => document.getElementById('pageLoader')?.classList.add('active');
export const hideLoader = () => document.getElementById('pageLoader')?.classList.remove('active');

export const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

export const formatDate = (ts, includeTime = false) => {
    if (!ts) return 'N/A';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return includeTime ? d.toLocaleString() : d.toLocaleDateString();
};

export function copyToClipboard(text, msg = 'Copied!') {
    navigator.clipboard.writeText(text).then(() => showToast(msg, 'success'));
}

export function statusLabel(status) {
    const map = {
        'IDLE': 'Pending Action',
        'PENDING': 'Processing',
        'UNDER_REVIEW': 'Under Review',
        'APPROVED': 'Approved',
        'REJECTED': 'Declined',
        'CONFIRMED': 'Confirmed'
    };
    return map[status] || status;
}

export function renderStatusBadge(status) {
    const cls = status.toLowerCase().replace('_', '-');
    return `<span class="badge badge--${cls}">${statusLabel(status)}</span>`;
}

export function setButtonLoading(btn, isLoading, loadingText = 'Processing...', originalText = '') {
    if (isLoading) {
        btn.dataset.original = originalText || btn.innerHTML;
        btn.classList.add('btn--loading');
        btn.disabled = true;
        btn.innerHTML = loadingText;
    } else {
        btn.classList.remove('btn--loading');
        btn.disabled = false;
        btn.innerHTML = btn.dataset.original || originalText;
    }
}

export function buildSidebar({ activeId, userData }) {
    const sidebar = document.getElementById('appSidebar');
    if (!sidebar) return;

    sidebar.innerHTML = `
        <div class="app-sidebar__logo">
            <div class="sba-logo sba-logo--sm">
                <svg class="sba-logo__mark" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6 6 H32 V14 H14 V32 H6 Z" fill="#003087"/>
                    <path d="M48 66 H66 V48 H74 V74 H48 Z" fill="#c8102e"/>
                    <text x="8" y="58" font-family="Arial Black" font-size="36" font-weight="900" fill="#003087">S</text>
                    <text x="28" y="58" font-family="Arial Black" font-size="36" font-weight="900" fill="#003087">B</text>
                    <text x="50" y="58" font-family="Arial Black" font-size="36" font-weight="900" fill="#003087">A</text>
                </svg>
                <div class="sba-logo__text">
                    <span class="sba-logo__name">U.S. Small Business</span>
                </div>
            </div>
        </div>
        <nav class="app-sidebar__nav">
            <div class="nav-section-label">Main Menu</div>
            <a href="dashboard.html" class="nav-item ${activeId === 'dashboard' ? 'active' : ''}"><i class="fa-solid fa-house"></i> Dashboard</a>
            <a href="apply.html" class="nav-item ${activeId === 'apply' ? 'active' : ''}"><i class="fa-solid fa-file-contract"></i> Apply for Grant</a>
            <a href="kyc.html" class="nav-item ${activeId === 'kyc' ? 'active' : ''}"><i class="fa-solid fa-id-card"></i> Identity (KYC)</a>
            <a href="deposit.html" class="nav-item ${activeId === 'deposit' ? 'active' : ''}"><i class="fa-solid fa-wallet"></i> Deposit Funds</a>
            
            <div class="nav-section-label">Treasury</div>
            <a href="tax.html" class="nav-item ${activeId === 'tax' ? 'active' : ''}"><i class="fa-solid fa-file-invoice-dollar"></i> Tax Clearance</a>
            <a href="withdraw.html" class="nav-item ${activeId === 'withdraw' ? 'active' : ''}"><i class="fa-solid fa-money-bill-transfer"></i> Withdraw Funds</a>
            <a href="ledger.html" class="nav-item ${activeId === 'ledger' ? 'active' : ''}"><i class="fa-solid fa-chart-bar"></i> Transactions</a>
            <a href="award.html" class="nav-item ${activeId === 'award' ? 'active' : ''}"><i class="fa-solid fa-trophy"></i> Grant Award</a>
            
            <div class="nav-section-label">Account</div>
            <a href="vault.html" class="nav-item ${activeId === 'vault' ? 'active' : ''}"><i class="fa-solid fa-folder-open"></i> Doc Vault</a>
            <a href="support.html" class="nav-item ${activeId === 'support' ? 'active' : ''}"><i class="fa-solid fa-comments"></i> Support <span class="nav-item__badge notif-badge">0</span></a>
            <a href="settings.html" class="nav-item ${activeId === 'settings' ? 'active' : ''}"><i class="fa-solid fa-gear"></i> Settings</a>
        </nav>
        <div class="app-sidebar__footer">
            <button class="nav-item" id="sidebarLogout"><i class="fa-solid fa-right-from-bracket"></i> Sign Out</button>
        </div>
    `;

    document.getElementById('sidebarLogout').onclick = () => {
        showConfirm({
            title: 'Sign Out',
            message: 'Are you sure you want to log out of your SBA account?',
            onConfirm: () => auth.signOut().then(() => window.location.href = 'login.html')
        });
    };
}

export function buildDock({ activeId }) {
    const dock = document.getElementById('mobileDock');
    if (!dock) return;
    dock.innerHTML = `
        <a href="dashboard.html" class="dock-item ${activeId === 'home' ? 'active' : ''}"><i class="fa-solid fa-house"></i><span>Home</span></a>
        <a href="apply.html" class="dock-item ${activeId === 'apply' ? 'active' : ''}"><i class="fa-solid fa-file-contract"></i><span>Apply</span></a>
        <a href="deposit.html" class="dock-item ${activeId === 'deposit' ? 'active' : ''}"><i class="fa-solid fa-wallet"></i><span>Deposit</span></a>
        <a href="support.html" class="dock-item ${activeId === 'support' ? 'active' : ''}"><i class="fa-solid fa-headset"></i><span>Support</span></a>
        <button class="dock-item" id="dockMore"><i class="fa-solid fa-bars"></i><span>More</span></button>
    `;
    document.getElementById('dockMore').onclick = () => document.getElementById('appSidebar').classList.toggle('open');
}
