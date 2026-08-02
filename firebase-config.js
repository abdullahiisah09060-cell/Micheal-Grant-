import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { 
    getAuth, 
    onAuthStateChanged, 
    signOut, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    sendEmailVerification, 
    sendPasswordResetEmail, 
    updatePassword, 
    reauthenticateWithCredential, 
    EmailAuthProvider 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    getDoc, 
    getDocs, 
    setDoc, 
    updateDoc, 
    addDoc, 
    collection, 
    query, 
    where, 
    orderBy, 
    limit, 
    onSnapshot, 
    serverTimestamp, 
    increment, 
    arrayUnion,
    deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getMessaging, getToken, onMessage } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging.js";

const firebaseConfig = {
    apiKey: "AIzaSyBB3VE9WQYX0fqM9ZmLSj3dR0-SQjpg0gY",
    authDomain: "sbagrant-b7e5d.firebaseapp.com",
    projectId: "sbagrant-b7e5d",
    storageBucket: "sbagrant-b7e5d.firebasestorage.app",
    messagingSenderId: "802243206422",
    appId: "1:802243206422:web:bbe74af7ce227092250437"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const messaging = getMessaging(app);

export const ADMIN_EMAILS = ['sba.suppor@gmail.com', 'liger4683@gmail.com'];

// --- Helpers ---

export const isAdmin = (email) => ADMIN_EMAILS.includes(email);

export async function compressToBase64(file, maxWidth = 800, quality = 0.78) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const ratio = Math.min(maxWidth / img.width, 1);
                const canvas = document.createElement('canvas');
                canvas.width  = Math.round(img.width  * ratio);
                canvas.height = Math.round(img.height * ratio);
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

export const buildNewUserPayload = (data) => ({
    uid: data.uid,
    fullName: data.fullName || '',
    email: data.email || '',
    username: data.username || '',
    phoneNumber: data.phoneNumber || '',
    country: data.country || '',
    gender: data.gender || '',
    dob: data.dob || '',
    avatarBase64: '',
    role: isAdmin(data.email) ? "admin" : "user",
    referredBy: data.referredBy || '',
    allocatedProgram: "SBA Grant Program",
    kycStatus: "IDLE",
    applyStatus: "IDLE",
    depositStatus: "IDLE",
    taxStatus: "IDLE",
    withdrawStatus: "IDLE",
    awardStatus: "IDLE",
    balance: 0,
    requestedAmount: 0,
    totalAward: 0,
    taxFeeRequired: 0,
    accountStatus: "active",
    transactionPin: "",
    isOnline: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    registrationStep: 3
});

export const getUserData = async (uid) => {
    const snap = await getDoc(doc(db, 'users', uid));
    return snap.exists() ? snap.data() : null;
};

export const updateUserData = async (uid, fields) => {
    await updateDoc(doc(db, 'users', uid), { ...fields, updatedAt: serverTimestamp() });
};

export const listenUserData = (uid, callback) => {
    return onSnapshot(doc(db, 'users', uid), (doc) => {
        callback(doc.exists() ? doc.data() : null);
    });
};

export const setUserOnline = async (uid, status) => {
    await updateDoc(doc(db, 'users', uid), { isOnline: status, lastSeen: serverTimestamp() });
};

// --- Notifications ---

export const EMAILJS_PUBLIC_KEY = 'YOUR_KEY_HERE'; // Client to replace
export const EMAILJS_SERVICE_ID = 'service_sba';
export const EMAILJS_TEMPLATE_ID = 'template_notification';

export async function sendEmailNotification({ toEmail, toName, subject, message, actionUrl = '' }) {
    if (typeof emailjs === 'undefined') return;
    try {
        await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
            to_email: toEmail, to_name: toName,
            subject, message, action_url: actionUrl
        }, EMAILJS_PUBLIC_KEY);
    } catch (e) {
        console.warn('[SBA] Email send failed:', e);
    }
}

export async function notify(uid, { title, message, type = 'info', link = '', sendEmail = true }) {
    await addDoc(collection(db, 'notifications'), {
        uid, title, message, type, link,
        read: false,
        createdAt: serverTimestamp()
    });

    if (sendEmail) {
        const user = await getUserData(uid);
        if (user && user.email) {
            await sendEmailNotification({
                toEmail: user.email,
                toName: user.fullName,
                subject: `SBA Portal: ${title}`,
                message,
                actionUrl: `https://sbagrant-b7e5d.netlify.app/${link}`
            });
        }
    }
}

export async function notifyAdmins({ title, message, type = 'info', link = '' }) {
    const q = query(collection(db, 'users'), where('role', '==', 'admin'));
    const snap = await getDocs(q);
    const promises = snap.docs.map(d => notify(d.id, { title, message, type, link, sendEmail: false }));
    await Promise.all(promises);
}

// --- Ledger & Audit ---

export async function addLedgerEntry(uid, { type, amount, description, status, ref = '' }) {
    await addDoc(collection(db, `users/${uid}/ledger`), {
        type, amount, description, status, ref,
        createdAt: serverTimestamp()
    });
}

export async function logAdminAction(adminUid, adminEmail, action, targetUid, details = {}) {
    await addDoc(collection(db, 'auditLog'), {
        adminUid, adminEmail, action, targetUid, details,
        timestamp: serverTimestamp()
    });
}

// --- Push Notifications ---

export async function requestNotificationPermission(uid) {
    try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            const token = await getToken(messaging, { vapidKey: 'BM_YOUR_VAPID_KEY' });
            if (token) {
                await updateDoc(doc(db, 'users', uid), { fcmToken: token });
                return token;
            }
        }
    } catch (e) { console.warn('[SBA] Push error:', e); }
    return null;
}

// Auth Exports
export { onAuthStateChanged, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendEmailVerification, sendPasswordResetEmail, updatePassword, reauthenticateWithCredential, EmailAuthProvider, serverTimestamp, increment, arrayUnion };
