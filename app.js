/**
 * SBA GRANT PORTAL — SHARED UTILITIES & SYSTEM BRAIN
 */

import { 
    auth, db, onAuthStateChanged, listenUserData, updateUserData, setUserOnline, 
    isAdmin, query, collection, where, onSnapshot, updateDoc, doc, getDoc, writeBatch 
} from './firebase-config.js';

/**
 * TOAST SYSTEM (Native replacement for alert)
 */
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

/**
 * CONFIRM MODAL (Native replacement for confirm)
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

    const close = () => overlay.remove();

    overlay.querySelector('#confirmCancel').onclick = () => { if (onCancel) onCancel(); close(); };
    overlay.querySelector('#confirmSubmit').onclick = () => { if (onConfirm) onConfirm(); close(); };
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); }, { once: true });
}

/**
 * AUTHENTICATION GUARDS
 */
export function requireAuth(callback) {
    showLoader();
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            window.location.href = 'login.html';
            return;
        }

        // Maintenance Mode Check
        const configSnap = await getDoc(doc(db, 'config', 'platform'));
        const config = configSnap.data();

        listenUserData(user.uid, (userData) => {
            if (!userData) return;

            // Maintenance Mode Logic (Admin bypass)
            if (config?.maintenanceMode && userData.role !== 'admin') {
                document.body.innerHTML = `
                    <div style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;background:var(--bg);padding:40px;text-align:center;">
                        <i class="fa-solid fa-gear fa-spin" style="font-size:3.5rem;color:var(--navy);margin-bottom:24px;"></i>
                        <h1 style="color:var(--navy);margin-bottom:12px;font-weight:900;">System Maintenance</h1>
                        <p style="color:var(--text-secondary);max-width:440px;line-height:1.6;">The SBA portal is temporarily offline for scheduled federal system updates. Please check back shortly.</p>
                    </div>`;
                hideLoader();
                return;
            }

            if (userData.accountStatus === 'suspended') {
                document.body.innerHTML = `
                    <div class="status-screen">
                        <div class="status-screen__icon status-screen__icon--error"><i class="fa-solid fa-ban"></i></div>
                        <h1 class="status-screen__title">Account Suspended</h1>
                        <p class="status-screen__message">Access to this portal has been revoked for compliance reasons. Please contact your Case Officer.</p>
                        <button class="btn btn--primary" onclick="window.location.href='support.html'">Contact Officer</button>
                    </div>`;
                hideLoader();
                return;
            }

            // All clear: Call the page logic
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
            const snap = await getDoc(doc(db, "users", user.uid));
            const data = snap.data();
            if (data?.role === 'admin') window.location.href = 'admin-portal.html';
            else window.location.href = 'dashboard.html';
        }
    });
}

/**
 * THEME SYSTEM
 */
export function initTheme() { applyTheme(localStorage.getItem('sba-theme') || 'system'); }

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

/**
 * UI UTILITIES
 */
export function initNotificationBadge(uid) {
    const q = query(collection(db, "notifications"), where("uid", "==", uid), where("read", "==", false));
    onSnapshot(q, (snap) => {
        const count = snap.size;
        document.querySelectorAll('.notif-badge, .nav-item__badge').forEach(b => {
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

export function copyToClipboard(text, msg = 'Copied to clipboard!') {
    navigator.clipboard.writeText(text).then(() => showToast(msg, 'success'));
}

export function debounce(fn, delay = 300) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn(...args), delay);
    };
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

/**
 * COMPONENT BUILDERS
 */
export function buildPageHeader({ title, subtitle, backUrl }) {
    const header = document.getElementById('pageHeader');
    if (!header) return;
    header.innerHTML = `
        <div class="page-header">
            <a href="${backUrl}" class="page-header__back"><i class="fa-solid fa-arrow-left"></i></a>
            <div style="flex:1">
                <h1 class="page-header__title">${title}</h1>
                ${subtitle ? `<p class="page-header__sub">${subtitle}</p>` : ''}
            </div>
            <div class="sba-logo sba-logo--sm">
                <svg class="sba-logo__mark" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6 6 H32 V14 H14 V32 H6 Z" fill="#003087"/>
                    <path d="M48 66 H66 V48 H74 V74 H48 Z" fill="#c8102e"/>
                    <text x="8" y="58" font-family="Arial Black" font-size="36" font-weight="900" fill="#003087">S</text>
                    <text x="28" y="58" font-family="Arial Black" font-size="36" font-weight="900" fill="#003087">B</text>
                    <text x="50" y="58" font-family="Arial Black" font-size="36" font-weight="900" fill="#003087">A</text>
                </svg>
            </div>
        </div>`;
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
                <div class="sba-logo__text"><span class="sba-logo__name">SBA Portal</span></div>
            </div>
        </div>
        <nav class="app-sidebar__nav">
            <div class="nav-section-label">Command Center</div>
            <a href="dashboard.html" class="nav-item ${activeId==='dashboard'?'active':''}"><i class="fa-solid fa-house"></i> Dashboard</a>
            <a href="apply.html" class="nav-item ${activeId==='apply'?'active':''}"><i class="fa-solid fa-file-contract"></i> Grant Application</a>
            <a href="kyc.html" class="nav-item ${activeId==='kyc'?'active':''}"><i class="fa-solid fa-id-card"></i> Identity (KYC)</a>
            <a href="deposit.html" class="nav-item ${activeId==='deposit'?'active':''}"><i class="fa-solid fa-wallet"></i> Fund Wallet</a>
            <div class="nav-section-label">Treasury</div>
            <a href="tax.html" class="nav-item ${activeId==='tax'?'active':''}"><i class="fa-solid fa-file-invoice-dollar"></i> Tax Clearance</a>
            <a href="withdraw.html" class="nav-item ${activeId==='withdraw'?'active':''}"><i class="fa-solid fa-money-bill-transfer"></i> Payout Funds</a>
            <a href="ledger.html" class="nav-item ${activeId==='ledger'?'active':''}"><i class="fa-solid fa-chart-line"></i> History</a>
            <a href="award.html" class="nav-item ${activeId==='award'?'active':''}"><i class="fa-solid fa-trophy"></i> Grant Award</a>
            <div class="nav-section-label">Account</div>
            <a href="support.html" class="nav-item ${activeId==='support'?'active':''}"><i class="fa-solid fa-comments"></i> Support <span class="nav-item__badge notif-badge">0</span></a>
            <a href="settings.html" class="nav-item ${activeId==='settings'?'active':''}"><i class="fa-solid fa-gear"></i> Settings</a>
        </nav>
        <div class="app-sidebar__footer">
            <div class="flex items-center gap-4 mb-4">
                <div class="nav-user-avatar" style="width:36px;height:36px;border-radius:50%;background:var(--navy);color:white;display:flex;align-items:center;justify-content:center;font-weight:700;border:2px solid var(--surface);">${userData.fullName.charAt(0)}</div>
                <div class="flex-col"><span class="text-navy" style="font-weight:800; font-size:0.85rem">${userData.fullName}</span><span class="text-muted" style="font-size:0.7rem">${userData.role}</span></div>
            </div>
            <button class="nav-item" id="btnLogout" style="width:100%; border:none; background:none; cursor:pointer;"><i class="fa-solid fa-right-from-bracket"></i> Sign Out</button>
        </div>`;
    
    document.getElementById('btnLogout').onclick = () => {
        showConfirm({ title: 'Sign Out', message: 'Are you sure you want to end your secure federal session?', onConfirm: () => auth.signOut().then(() => window.location.href = 'login.html') });
    };
}

export function buildDock({ activeId }) {
    const dock = document.getElementById('mobileDock');
    if (!dock) return;
    dock.innerHTML = `
        <a href="dashboard.html" class="dock-item ${activeId==='home'?'active':''}"><i class="fa-solid fa-house"></i><span>Home</span></a>
        <a href="apply.html" class="dock-item ${activeId==='apply'?'active':''}"><i class="fa-solid fa-file-contract"></i><span>Apply</span></a>
        <a href="deposit.html" class="dock-item ${activeId==='deposit'?'active':''}"><i class="fa-solid fa-wallet"></i><span>Deposit</span></a>
        <a href="support.html" class="dock-item ${activeId==='support'?'active':''}"><i class="fa-solid fa-headset"></i><span>Support</span></a>
        <button class="dock-item" id="dockMore"><i class="fa-solid fa-bars"></i><span>More</span></button>`;
    
    document.getElementById('dockMore').onclick = () => {
        const sb = document.getElementById('appSidebar');
        const open = sb.classList.toggle('open');
        document.getElementById('sidebarOverlay').classList.toggle('show', open);
        document.getElementById('dockMore').querySelector('i').className = open ? 'fa-solid fa-xmark' : 'fa-solid fa-bars';
    };
}
