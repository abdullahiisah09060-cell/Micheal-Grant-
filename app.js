import { auth, db, isAdmin } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/**
 * AUTH GUARD: Ensures only logged-in users see protected pages.
 * @param {Function} callback - Code to run if authenticated.
 */
export const requireAuth = (callback) => {
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            window.location.href = 'login.html';
        } else {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists()) {
                callback(user, userDoc.data());
            } else {
                console.error("User document not found in Firestore.");
            }
        }
    });
};

/**
 * ADMIN GUARD: Ensures only admins see the control panel.
 */
export const requireAdmin = (callback) => {
    onAuthStateChanged(auth, async (user) => {
        if (user && isAdmin(user.email)) {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            callback(user, userDoc.data());
        } else {
            window.location.href = 'dashboard.html';
        }
    });
};

/**
 * TOAST NOTIFICATION: Professional non-blocking alerts.
 */
export const showToast = (message, type = 'success') => {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.style.cssText = `
        position: fixed; bottom: 20px; right: 20px; 
        padding: 15px 25px; border-radius: 8px; 
        background: ${type === 'success' ? '#15803d' : '#b91c1c'};
        color: white; font-weight: 600; box-shadow: 0 10px 15px rgba(0,0,0,0.2);
        z-index: 10000; animation: slideIn 0.3s ease;
    `;
    toast.innerText = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
};

// Global Initialization
document.addEventListener('DOMContentLoaded', () => {
    // Shared Theme Toggle Logic
    const theme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', theme);
});
