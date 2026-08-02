import { auth, db, listenUserData, setUserOnline } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { collection, query, where, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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
    toast.innerHTML = `
        <div class="toast__content">${message}</div>
        <button class="toast__close">&times;</button>
    `;

    container.appendChild(toast);
    
    const dismiss = () => {
        toast.classList.add('toast--hiding');
        setTimeout(() => toast.remove(), 400);
    };

    toast.querySelector('.toast__close').onclick = dismiss;
    setTimeout(dismiss, duration);
}

// --- Custom Confirm Modal ---
export function showConfirm({ title, message, confirmText = 'Confirm', cancelText = 'Cancel', onConfirm, onCancel, danger = false }) {
    const overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';
    overlay.innerHTML = `
        <div class="confirm-modal">
            <h3 class="confirm-modal__title">${title}</h3>
            <p class="confirm-modal__message">${message}</p>
            <div class="confirm-modal__actions">
                <button class="btn btn--ghost btn--cancel">${cancelText}</button>
                <button class="btn ${danger ? 'btn--danger' : 'btn--primary'} btn--confirm">${confirmText}</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    overlay.querySelector('.btn--cancel').onclick = () => {
        overlay.remove();
        if (onCancel) onCancel();
    };
    overlay.querySelector('.btn--confirm').onclick = () => {
        overlay.remove();
        if (onConfirm) onConfirm();
    };
}

// --- Auth Guards ---
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
                document.body.innerHTML = '<div class="error-screen"><h1>Account Suspended</h1><p>Contact support for details.</p></div>';
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
        if (user) window.location.href = 'dashboard.html';
    });
}

// --- Theme System ---
export function initTheme() {
    const saved = localStorage.getItem('sba-theme') || 'system';
    setTheme(saved);
}

export function setTheme(theme) {
    localStorage.setItem('sba-theme', theme);
    const root = document.documentElement;
    if (theme === 'system') {
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        root.setAttribute('data-theme', isDark ? 'dark' : 'light');
    } else {
        root.setAttribute('data-theme', theme);
    }
}

// --- Notification Badge ---
export function initNotificationBadge(uid) {
    const q = query(collection(db, 'notifications'), where('uid', '==', uid), where('read', '==', false));
    onSnapshot(q, (snap) => {
        const badges = document.querySelectorAll('.notif-badge');
        const count = snap.size;
        badges.forEach(b => {
            b.innerText = count > 99 ? '99+' : count;
            b.style.display = count > 0 ? 'flex' : 'none';
        });
    });
}

// --- Utilities ---
export const showLoader = () => document.getElementById('pageLoader')?.classList.add('active');
export const hideLoader = () => document.getElementById('pageLoader')?.classList.remove('active');
export const formatCurrency = (amount) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);
export const formatDate = (ts) => ts ? new Date(ts.seconds * 1000).toLocaleDateString() : '---';

export function copyToClipboard(text, msg = 'Copied to clipboard') {
    navigator.clipboard.writeText(text).then(() => showToast(msg, 'success'));
}

export function initInstallPrompt() {
    let deferredPrompt;
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        setTimeout(() => {
            if (!localStorage.getItem('pwa-dismissed')) {
                showToast('Install SBA Portal for faster access!', 'info', 10000);
            }
        }, 30000);
    });
}
