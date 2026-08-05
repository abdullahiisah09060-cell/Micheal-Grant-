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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
let messaging = null;

// Only initialize messaging if supported
try {
    messaging = getMessaging(app);
} catch (e) {
    console.warn("Messaging not supported in this browser.");
}

// Persistence
setPersistence(auth, browserLocalPersistence);

// Constants
export const ADMIN_EMAILS = ['sba.suppor@gmail.com', 'liger4683@gmail.com'];
export const AGENTS = ['Sarah Mitchell', 'James Caldwell', 'Diana Torres', 'Robert Hughes', 'Patricia Wells', 'Michael Chen', 'Angela Davis', 'Thomas Brown'];

// REPLACE WITH YOUR KEYS
export const EMAILJS_PUBLIC_KEY = 'YOUR_EMAILJS_PUBLIC_KEY'; 
export const EMAILJS_SERVICE_ID = 'service_sba';          
export const EMAILJS_TEMPLATE_ID = 'template_notification';
export const FCM_VAPID_KEY = 'YOUR_VAPID_KEY';            

// Helpers
export const isAdmin = (email) => ADMIN_EMAILS.includes(email?.toLowerCase());
export const getRandomAgent = () => AGENTS[Math.floor(Math.random() * AGENTS.length)];

export const compressToBase64 = (file, maxWidth = 800, quality = 0.78) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
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
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
        };
        reader.onerror = error => reject(error);
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
    const docSnap = await getDoc(doc(db, "users", uid));
    return docSnap.exists() ? docSnap.data() : null;
};

export const listenUserData = (uid, callback) => onSnapshot(doc(db, "users", uid), (doc) => callback(doc.data()));

export const updateUserData = (uid, fields) => updateDoc(doc(db, "users", uid), { ...fields, updatedAt: serverTimestamp() });

export const setUserOnline = (uid, status) => updateDoc(doc(db, "users", uid), { isOnline: status, lastSeen: serverTimestamp() });

export const addLedgerEntry = (uid, entry) => addDoc(collection(db, "users", uid, "ledger"), { ...entry, createdAt: serverTimestamp() });

export const logAdminAction = (adminUid, adminEmail, action, targetUid, details) => {
    return addDoc(collection(db, "auditLog"), { adminUid, adminEmail, action, targetUid, details, timestamp: serverTimestamp() });
};

export const notify = async (uid, { title, message, type, link, sendEmail = false }) => {
    await addDoc(collection(db, "notifications"), {
        uid, title, message, type, link: link || '', read: false, createdAt: serverTimestamp()
    });
    if (sendEmail) {
        const user = await getUserData(uid);
        if (user && user.emailNotifications) {
            sendEmailNotification({
                toEmail: user.email,
                toName: user.fullName,
                subject: title,
                message: message,
                actionUrl: window.location.origin + '/' + (link || 'dashboard.html')
            });
        }
    }
};

export const notifyAdmins = async ({ title, message, type, link }) => {
    const q = query(collection(db, "users"), where("role", "==", "admin"));
    const snapshot = await getDocs(q);
    snapshot.forEach(adminDoc => {
        notify(adminDoc.id, { title, message, type, link });
    });
    // Also log to a general ADMIN notification pool if needed
    addDoc(collection(db, "notifications"), {
        uid: 'ADMIN', title, message, type, link: link || '', read: false, createdAt: serverTimestamp()
    });
};

export const sendEmailNotification = ({ toEmail, toName, subject, message, actionUrl }) => {
    if (typeof emailjs === 'undefined') return;
    emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
        to_email: toEmail,
        to_name: toName,
        subject: subject,
        message: message,
        action_url: actionUrl
    }, EMAILJS_PUBLIC_KEY).catch(err => console.error("EmailJS Error:", err));
};

export const markNotificationRead = (notifId) => updateDoc(doc(db, "notifications", notifId), { read: true });

export const requestNotificationPermission = async (uid) => {
    if (!messaging) return;
    try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            const token = await getToken(messaging, { vapidKey: FCM_VAPID_KEY });
            if (token) await updateUserData(uid, { fcmToken: token, pushNotifications: true });
        }
    } catch (err) { console.error("FCM Token Error", err); }
};

export const saveRegStep = (data) => {
    const current = JSON.parse(sessionStorage.getItem('SBA_REG') || '{}');
    sessionStorage.setItem('SBA_REG', JSON.stringify({ ...current, ...data }));
};
export const getRegData = () => JSON.parse(sessionStorage.getItem('SBA_REG') || '{}');
export const clearRegData = () => sessionStorage.removeItem('SBA_REG');

export { 
    auth, db, messaging, 
    onAuthStateChanged, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, 
    sendEmailVerification, sendPasswordResetEmail, updatePassword, reauthenticateWithCredential, 
    EmailAuthProvider, doc, getDoc, getDocs, setDoc, updateDoc, addDoc, deleteDoc, 
    collection, query, where, orderBy, limit, onSnapshot, serverTimestamp, increment, arrayUnion, 
    writeBatch, updateProfile 
};

export default { auth, db, messaging };
