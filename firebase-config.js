import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
    getAuth, onAuthStateChanged, signOut,
    createUserWithEmailAndPassword, signInWithEmailAndPassword,
    sendEmailVerification, sendPasswordResetEmail,
    updatePassword, reauthenticateWithCredential, EmailAuthProvider,
    browserLocalPersistence, setPersistence, updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
    getFirestore, doc, getDoc, getDocs, setDoc, updateDoc, addDoc, deleteDoc,
    collection, query, where, orderBy, limit, onSnapshot,
    serverTimestamp, increment, arrayUnion, writeBatch
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
    getMessaging, getToken, onMessage
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging.js";

const firebaseConfig = {
    apiKey: "AIzaSyBB3VE9WQYX0fqM9ZmLSj3dR0-SQjpg0gY",
    authDomain: "sbagrant-b7e5d.firebaseapp.com",
    projectId: "sbagrant-b7e5d",
    storageBucket: "sbagrant-b7e5d.firebasestorage.app",
    messagingSenderId: "802243206422",
    appId: "1:802243206422:web:bbe74af7ce227092250437"
};

// Initialize
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
let messaging = null;

try {
    messaging = getMessaging(app);
} catch (e) {
    console.warn("Push messaging not supported in this browser.");
}

// Set Persistence
setPersistence(auth, browserLocalPersistence);

// Constants
export const ADMIN_EMAILS = ['sba.suppor@gmail.com', 'liger4683@gmail.com'];
export const AGENTS = ['Sarah Mitchell', 'James Caldwell', 'Diana Torres', 'Robert Hughes', 'Patricia Wells', 'Michael Chen', 'Angela Davis', 'Thomas Brown'];

// NOTIFICATION KEYS (REPLACE WITH YOUR ACTUAL KEYS)
export const EMAILJS_PUBLIC_KEY = 'YOUR_EMAILJS_PUBLIC_KEY'; // REPLACE ME
export const EMAILJS_SERVICE_ID = 'service_sba';             // REPLACE ME
export const EMAILJS_TEMPLATE_ID = 'template_notification';  // REPLACE ME
export const FCM_VAPID_KEY = 'YOUR_VAPID_KEY';                // REPLACE ME

// Helpers
export const isAdmin = (email) => ADMIN_EMAILS.includes(email?.toLowerCase());
export const getRandomAgent = () => AGENTS[Math.floor(Math.random() * AGENTS.length)];

export const compressToBase64 = (file, maxWidth = 800, quality = 0.7) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (e) => {
            const img = new Image();
            img.src = e.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                if (width > maxWidth) {
                    height = (maxWidth / width) * height;
                    width = maxWidth;
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                // Stricter quality for Firestore limit (1MB)
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
        };
        reader.onerror = (err) => reject(err);
    });
};

export const buildNewUserPayload = (data) => {
    const role = isAdmin(data.email) ? 'admin' : 'user';
    return {
        uid: data.uid,
        fullName: data.fullName,
        email: data.email.toLowerCase(),
        username: data.username.toLowerCase(),
        phoneNumber: data.phoneNumber || '',
        country: data.country || '',
        gender: data.gender || '',
        dob: data.dob || '',
        avatarBase64: '',
        role: role,
        referredBy: data.referredBy || '',
        allocatedProgram: "SBA Grant Program",
        assignedAgent: getRandomAgent(),
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
        emailNotifications: true,
        pushNotifications: false,
        isOnline: true,
        lastSeen: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    };
};

export const getUserData = async (uid) => {
    const snap = await getDoc(doc(db, "users", uid));
    return snap.exists() ? snap.data() : null;
};

export const listenUserData = (uid, callback) => onSnapshot(doc(db, "users", uid), (doc) => callback(doc.data()));

export const updateUserData = (uid, fields) => updateDoc(doc(db, "users", uid), { ...fields, updatedAt: serverTimestamp() });

export const setUserOnline = (uid, status) => updateDoc(doc(db, "users", uid), { isOnline: status, lastSeen: serverTimestamp() });

export const addLedgerEntry = (uid, {type, amount, description, status, ref}) => {
    return addDoc(collection(db, "users", uid, "ledger"), {
        type, amount, description, status, ref: ref || '', createdAt: serverTimestamp()
    });
};

export const logAdminAction = (adminUid, adminEmail, action, targetUid, details) => {
    return addDoc(collection(db, "auditLog"), {
        adminUid, adminEmail, action, targetUid, details, timestamp: serverTimestamp()
    });
};

export const notify = async (uid, {title, message, type, link, sendEmail}) => {
    await addDoc(collection(db, "notifications"), {
        uid, title, message, type, link: link || '', read: false, createdAt: serverTimestamp()
    });
    if (sendEmail) {
        const user = await getUserData(uid);
        if (user && user.emailNotifications && typeof emailjs !== 'undefined') {
            emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
                to_email: user.email,
                to_name: user.fullName,
                subject: title,
                message: message,
                action_url: window.location.origin + '/' + (link || 'dashboard.html')
            }, EMAILJS_PUBLIC_KEY);
        }
    }
};

export const notifyAdmins = async ({title, message, type, link}) => {
    const q = query(collection(db, "users"), where("role", "==", "admin"));
    const snap = await getDocs(q);
    snap.forEach(adminDoc => {
        notify(adminDoc.id, {title, message, type, link, sendEmail: false});
    });
};

export const markNotificationRead = (notifId) => updateDoc(doc(db, "notifications", notifId), { read: true });

export const markAllRead = async (uid) => {
    const q = query(collection(db, "notifications"), where("uid", "==", uid), where("read", "==", false));
    const snap = await getDocs(q);
    const batch = writeBatch(db);
    snap.forEach(d => batch.update(d.ref, { read: true }));
    return batch.commit();
};

export const requestNotificationPermission = async (uid) => {
    if (!messaging) return;
    try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            const token = await getToken(messaging, { vapidKey: FCM_VAPID_KEY });
            if (token) await updateUserData(uid, { fcmToken: token, pushNotifications: true });
        }
    } catch (e) { console.error("FCM Permission denied", e); }
};

export const initForegroundMessages = (onReceive) => {
    if (!messaging) return;
    return onMessage(messaging, (payload) => onReceive(payload));
};

export const saveRegStep = (data) => sessionStorage.setItem('SBA_REG', JSON.stringify({...getRegData(), ...data}));
export const getRegData = () => JSON.parse(sessionStorage.getItem('SBA_REG') || '{}');
export const clearRegData = () => sessionStorage.removeItem('SBA_REG');

// Export Firebase methods
export { 
    auth, db, messaging, onAuthStateChanged, signOut, createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, sendEmailVerification, sendPasswordResetEmail, 
    updatePassword, reauthenticateWithCredential, EmailAuthProvider, updateProfile,
    doc, getDoc, setDoc, updateDoc, addDoc, deleteDoc, collection, query, where, 
    orderBy, limit, onSnapshot, serverTimestamp, increment, arrayUnion, writeBatch, getDocs 
};
