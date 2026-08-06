import {
    auth, db, getUserData, updateUserData, setUserOnline,
    onAuthStateChanged, signOut, notify, notifyAdmins
} from './firebase-config.js';

window.addEventListener('DOMContentLoaded', () => {
    // Inject EmailJS CDN if not present
    if (!window.emailjs) {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js';
        script.onload = () => {
            if (window.emailjs && typeof emailjs.init === 'function') {
                emailjs.init('YOUR_EMAILJS_PUBLIC_KEY');
            }
        };
        document.head.appendChild(script);
    }

    // Global Tooltips & Modals initialization
    initGlobalUI();

    // Auth state observer for app pages
    onAuthStateChanged(auth, async (user) => {
        const path = window.location.pathname;
        const isAuthPage = ['/login.html', '/register.html', '/verify.html', '/welcome.html', '/forgot-password.html', '/terms.html'].some(p => path.endsWith(p)) || path === '/' || path.endsWith('/index.html');

        if (user) {
            setUserOnline(user.uid, true);
            const userData = await getUserData(user.uid);

            if (userData && userData.accountStatus === 'suspended') {
                if (!path.endsWith('support.html') && !path.endsWith('login.html')) {
                    alert('Your account has been suspended. Please contact support.');
                    signOut(auth);
                    window.location.href = 'login.html';
                    return;
                }
            }

            if (isAuthPage && !path.endsWith('terms.html')) {
                // If logged in and on auth pages, redirect to dashboard or admin
                if (userData && userData.role === 'admin') {
                    window.location.href = 'admin-portal.html';
                } else {
                    window.location.href = 'dashboard.html';
                }
            } else {
                renderNavbar(userData);
                renderSidebar(userData);
                renderFooter();
                if (userData) {
                    checkNotifications(user.uid);
                }
            }
        } else {
            if (!isAuthPage) {
                window.location.href = 'login.html';
            } else {
                renderAuthHeader();
            }
        }
    });

    // Presence on window unload
    window.addEventListener('beforeunload', () => {
        if (auth.currentUser) {
            setUserOnline(auth.currentUser.uid, false);
        }
    });
});

function initGlobalUI() {
    // Mobile menu toggle
    document.addEventListener('click', (e) => {
        const toggleBtn = e.target.closest('#mobileMenuToggle');
        if (toggleBtn) {
            const sidebar = document.querySelector('.app-sidebar');
            if (sidebar) sidebar.classList.toggle('open');
        }

        const closeSidebar = e.target.closest('#sidebarCloseBtn');
        if (closeSidebar) {
            const sidebar = document.querySelector('.app-sidebar');
            if (sidebar) sidebar.classList.remove('open');
        }
    });
}

function renderNavbar(userData) {
    const header = document.querySelector('.app-header');
    if (!header) return;

    const isAdmin = userData && userData.role === 'admin';
    const avatar = userData?.avatarBase64 || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200';
    const name = userData?.fullName || userData?.username || 'User';

    header.innerHTML = `
        <div class="header-left flex items-center gap-4">
            <button id="mobileMenuToggle" class="md:hidden text-slate-400 hover:text-white p-2">
                <i class="fa-solid fa-bars text-xl"></i>
            </button>
            <div class="flex items-center gap-2">
                <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-amber-500/20">
                    <i class="fa-solid fa-shield-halved"></i>
                </div>
                <span class="font-bold text-lg tracking-tight text-white hidden sm:inline">SBA <span class="text-amber-400 font-extrabold">Grant</span></span>
            </div>
        </div>
        <div class="header-right flex items-center gap-4">
            ${isAdmin ? `
                <a href="admin-portal.html" class="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold hover:bg-amber-500/20 transition flex items-center gap-1.5">
                    <i class="fa-solid fa-crown text-amber-400"></i> Admin Portal
                </a>
            ` : ''}
            <div class="relative dropdown-container">
                <button id="notifBtn" class="w-10 h-10 rounded-xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-center text-slate-300 hover:text-white hover:border-slate-600 transition relative">
                    <i class="fa-regular fa-bell"></i>
                    <span id="notifBadge" class="absolute top-2 right-2 w-2 h-2 rounded-full bg-amber-400 hidden animate-pulse"></span>
                </button>
            </div>
            <div class="flex items-center gap-3 pl-2 border-l border-slate-800">
                <img src="${avatar}" alt="Avatar" class="w-10 h-10 rounded-xl object-cover border border-slate-700 shadow-sm">
                <div class="hidden lg:block text-left">
                    <div class="text-sm font-semibold text-white leading-tight">${name}</div>
                    <div class="text-xs text-amber-400 font-medium">${userData?.allocatedProgram || 'SBA Grant'}</div>
                </div>
                <button id="logoutBtn" class="ml-2 w-10 h-10 rounded-xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-center text-slate-400 hover:text-rose-400 hover:border-rose-500/30 transition" title="Sign Out">
                    <i class="fa-solid fa-power-off"></i>
                </button>
            </div>
        </div>
    `;

    document.getElementById('logoutBtn')?.addEventListener('click', async () => {
        if (confirm('Are you sure you want to sign out?')) {
            if (auth.currentUser) await setUserOnline(auth.currentUser.uid, false);
            await signOut(auth);
            window.location.href = 'login.html';
        }
    });

    document.getElementById('notifBtn')?.addEventListener('click', () => {
        window.location.href = 'notifications.html';
    });
}

function renderSidebar(userData) {
    const sidebar = document.querySelector('.app-sidebar');
    if (!sidebar) return;

    const path = window.location.pathname;
    const isAdmin = userData && userData.role === 'admin';

    const menu = [
        { label: 'Dashboard', icon: 'fa-house', href: 'dashboard.html' },
        { label: 'Grant Application', icon: 'fa-file-signature', href: 'apply.html' },
        { label: 'KYC Verification', icon: 'fa-id-card', href: 'kyc.html' },
        { label: 'Deposit Fee', icon: 'fa-wallet', href: 'deposit.html' },
        { label: 'Tax Clearance', icon: 'fa-receipt', href: 'tax.html' },
        { label: 'Withdrawal', icon: 'fa-money-bill-transfer', href: 'withdraw.html' },
        { label: 'Award Certificate', icon: 'fa-award', href: 'award.html' },
        { label: 'Ledger History', icon: 'fa-list-check', href: 'ledger.html' },
        { label: 'Secure Vault', icon: 'fa-vault', href: 'vault.html' },
        { label: 'Support Agent', icon: 'fa-headset', href: 'support.html' },
        { label: 'Notifications', icon: 'fa-bell', href: 'notifications.html' },
        { label: 'Account Settings', icon: 'fa-gear', href: 'settings.html' }
    ];

    sidebar.innerHTML = `
        <div class="sidebar-header flex items-center justify-between p-6 border-b border-slate-800/80">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20 text-lg">
                    <i class="fa-solid fa-shield-halved"></i>
                </div>
                <div>
                    <div class="font-black text-white tracking-wider text-base">SBA GRANT</div>
                    <div class="text-[10px] text-amber-400 font-semibold uppercase tracking-widest">Portal v2.6</div>
                </div>
            </div>
            <button id="sidebarCloseBtn" class="md:hidden text-slate-400 hover:text-white">
                <i class="fa-solid fa-xmark text-xl"></i>
            </button>
        </div>
        <div class="sidebar-body p-4 space-y-1.5 overflow-y-auto flex-1">
            ${isAdmin ? `
                <div class="pb-2 mb-2 border-b border-slate-800">
                    <a href="admin-portal.html" class="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20 transition">
                        <i class="fa-solid fa-crown text-base w-5"></i>
                        <span>Admin Control Center</span>
                    </a>
                </div>
            ` : ''}
            ${menu.map(item => {
                const active = path.endsWith(item.href);
                return `
                    <a href="${item.href}" class="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition ${active ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 font-semibold' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'}">
                        <i class="fa-solid ${item.icon} text-base w-5 ${active ? 'text-amber-400' : 'text-slate-500'}"></i>
                        <span>${item.label}</span>
                    </a>
                `;
            }).join('')}
        </div>
        <div class="sidebar-footer p-4 border-t border-slate-800/80">
            <div class="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
                <div class="flex items-center gap-3 mb-2">
                    <div class="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-semibold text-xs">
                        <i class="fa-solid fa-headset"></i>
                    </div>
                    <div>
                        <div class="text-xs font-semibold text-white">Assigned Agent</div>
                        <div class="text-[11px] text-amber-400 font-medium">${userData?.assignedAgent || 'Sarah Mitchell'}</div>
                    </div>
                </div>
                <a href="support.html" class="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition border border-slate-700/60">
                    <i class="fa-solid fa-comments text-amber-400"></i> Live Chat Support
                </a>
            </div>
        </div>
    `;
}

function renderFooter() {
    // Footer injected if container exists
    const footer = document.querySelector('.app-footer');
    if (footer) {
        footer.innerHTML = `
            <div class="max-w-7xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 border-t border-slate-800/80 gap-4">
                <div>&copy; 2026 U.S. Small Business Administration Grant Portal. All rights reserved.</div>
                <div class="flex items-center gap-6">
                    <a href="terms.html" class="hover:text-amber-400 transition">Terms & Conditions</a>
                    <a href="support.html" class="hover:text-amber-400 transition">Help Center</a>
                    <a href="terms.html#privacy" class="hover:text-amber-400 transition">Privacy Policy</a>
                </div>
            </div>
        `;
    }
}

function renderAuthHeader() {
    // Optional public header
}

async function checkNotifications(uid) {
    // Quick unread check for badge
    // Implementation can hook up real-time query
}
