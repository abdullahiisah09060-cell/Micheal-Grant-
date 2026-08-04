import { auth, db, isAdmin } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- AUTH GUARDS ---
export const requireAuth = (callback) => {
    document.getElementById('pageLoader')?.classList.add('active');
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            window.location.href = 'login.html';
        } else {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists()) {
                callback(user, userDoc.data());
            }
        }
        document.getElementById('pageLoader')?.classList.remove('active');
    });
};

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

// --- MOBILE UI ENGINE ---
export const initMobileNav = () => {
    if (!document.getElementById('mobile-hamburger')) {
        const ham = document.createElement('button');
        ham.id = 'mobile-hamburger';
        ham.className = 'btn btn-primary';
        ham.style.cssText = 'position:fixed; bottom:20px; right:20px; z-index:2001; border-radius:50%; width:60px; height:60px; box-shadow: 0 10px 25px rgba(0,0,0,0.3); display:none;';
        ham.innerHTML = '<i class="fa-solid fa-bars" style="font-size:20px;"></i>';
        
        if (window.innerWidth <= 1024) ham.style.display = 'flex';
        document.body.appendChild(ham);

        const overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        document.body.appendChild(overlay);

        ham.addEventListener('click', () => {
            document.body.classList.toggle('mobile-nav-active');
            ham.innerHTML = document.body.classList.contains('mobile-nav-active') 
                ? '<i class="fa-solid fa-xmark"></i>' : '<i class="fa-solid fa-bars"></i>';
        });

        overlay.addEventListener('click', () => {
            document.body.classList.remove('mobile-nav-active');
            ham.innerHTML = '<i class="fa-solid fa-bars"></i>';
        });
    }
};

// --- VALIDATORS ---
export const validators = {
    ssn: (val) => /^\d{4}$/.test(val),
    ein: (val) => /^\d{2}-\d{7}$/.test(val),
    amount: (val, min) => parseFloat(val) >= min
};

export const markField = (el, isValid, msg = "") => {
    el.style.borderColor = isValid ? 'var(--success)' : 'var(--error)';
    const existing = el.parentNode.querySelector('.err');
    if (existing) existing.remove();
    if (!isValid) {
        const span = document.createElement('small');
        span.className = 'err';
        span.style.color = 'var(--error)';
        span.innerText = msg;
        el.parentNode.appendChild(span);
    }
};

export const toggleSubmit = (btn, state) => {
    btn.disabled = state;
    btn.innerHTML = state ? '<i class="fa-solid fa-circle-notch fa-spin"></i> Processing...' : btn.dataset.originalText;
};

export const showToast = (msg, type = 'success') => {
    const t = document.createElement('div');
    t.style.cssText = `position:fixed; bottom:80px; left:50%; transform:translateX(-50%); padding:12px 24px; border-radius:8px; background:${type==='success'?'#15803d':'#b91c1c'}; color:white; z-index:10000; font-weight:600; box-shadow:0 10px 20px rgba(0,0,0,0.2);`;
    t.innerText = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
};
