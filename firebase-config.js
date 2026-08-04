import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    getFirestore, doc, getDoc, setDoc, updateDoc, collection, 
    onSnapshot, query, where, orderBy, addDoc, serverTimestamp, increment 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBB3VE9WQYX0fqM9ZmLSj3dR0-SQjpg0gY",
    authDomain: "sbagrant-b7e5d.firebaseapp.com",
    projectId: "sbagrant-b7e5d",
    storageBucket: "sbagrant-b7e5d.appspot.com",
    messagingSenderId: "802243206422",
    appId: "1:802243206422:web:bbe74af7ce227092250437"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

/* --- SHARED LOGIC & HELPERS --- */

// Admin Identification
const ADMIN_EMAILS = ['sba.suppor@gmail.com', 'liger4683@gmail.com'];
export const isAdmin = (email) => ADMIN_EMAILS.includes(email?.toLowerCase());

// Image Compression (Base64) - Crucial for Firestore storage limits
export const compressImage = async (file, maxWidth = 800) => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const scaleFactor = maxWidth / img.width;
                canvas.width = maxWidth;
                canvas.height = img.height * scaleFactor;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', 0.7)); // 70% quality
            };
        };
    });
};

// Notification System
export const notifyUser = async (uid, title, message, type = 'info') => {
    const notifRef = collection(db, "notifications");
    await addDoc(notifRef, {
        uid,
        title,
        message,
        type,
        read: false,
        timestamp: serverTimestamp()
    });
};

// Admin Audit Logging
export const logAdminAction = async (adminUid, action, details) => {
    const logRef = collection(db, "auditLog");
    await addDoc(logRef, {
        adminUid,
        action,
        details,
        timestamp: serverTimestamp()
    });
};

// Transaction Ledger Entry
export const addLedgerEntry = async (uid, description, amount, status = 'completed') => {
    const ledgerRef = collection(db, "users", uid, "ledger");
    await addDoc(ledgerRef, {
        description,
        amount,
        status,
        timestamp: serverTimestamp()
    });
};
