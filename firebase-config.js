// ============================================================
// firebase-config.js — SBA Platform Core Configuration v5.0
// Single source of truth. All pages import from here.
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import {
  getAuth,
  browserLocalPersistence,
  setPersistence,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-storage.js";

// ── Firebase Project ──
const firebaseConfig = {
  apiKey: "AIzaSyD9sEdygrjz-m1Ou3m9O3L5mXyPEs9LAJM",
  authDomain: "small-business-administration.firebaseapp.com",
  projectId: "small-business-administration",
  storageBucket: "small-business-administration.firebasestorage.app",
  messagingSenderId: "825499942780",
  appId: "1:825499942780:web:4f7e5ceb9d6125e9e5aef9"
};

const app = initializeApp(firebaseConfig);
export const auth    = getAuth(app);
export const db      = getFirestore(app);
export const storage = getStorage(app);

// ── Persistence ──
setPersistence(auth, browserLocalPersistence).catch(console.error);

// ============================================================
// ADMIN
// ============================================================
export const ADMIN_EMAIL = "sba.suppor@gmail.com";
export const isAdmin = (email) =>
  typeof email === "string" &&
  email.toLowerCase().trim() === ADMIN_EMAIL.toLowerCase();

// ============================================================
// DB COLLECTIONS
// ============================================================
export const DB_COLLECTIONS = {
  USERS:        "users",
  TRANSACTIONS: "transactions",
  LOGS:         "logs"
};

// ============================================================
// CLOUDINARY
// ============================================================
export const CLOUDINARY_CONFIG = {
  CLOUD_NAME:    "dcnv6v9g0",
  UPLOAD_PRESET: "sba_uploads",
  API_URL:       "https://api.cloudinary.com/v1_1/dcnv6v9g0/image/upload"
};

export const uploadToCloudinary = async (file) => {
  if (!file) return null;
  const fd = new FormData();
  fd.append("file", file);
  fd.append("upload_preset", CLOUDINARY_CONFIG.UPLOAD_PRESET);
  const res = await fetch(CLOUDINARY_CONFIG.API_URL, { method: "POST", body: fd });
  if (!res.ok) throw new Error("Cloudinary upload failed.");
  const data = await res.json();
  return data.secure_url || null;
};

// ============================================================
// USER SCHEMA
// ============================================================
export const buildNewUserPayload = (raw) => {
  const email     = (raw.email || "").toLowerCase().trim();
  const fullName  = (raw.fullName || "").trim();
  return {
    uid:             raw.uid || "",
    fullName,
    email,
    username:        (raw.username    || "").toLowerCase().trim(),
    phoneNumber:     (raw.phoneNumber || "").trim(),
    country:         raw.country  || "",
    gender:          raw.gender   || "",
    dob:             raw.dob      || "",
    allocatedProgram: raw.allocatedProgram || "SBA Grant Program",
    referredBy:      raw.referredBy || "",

    // Statuses
    kycStatus:      "IDLE",
    applyStatus:    "IDLE",
    depositStatus:  "IDLE",
    withdrawStatus: "IDLE",
    taxStatus:      "IDLE",
    awardStatus:    "IDLE",

    // Financials
    balance:         0,
    requestedAmount: 0,
    totalAward:      0,

    // Comms
    chatHistory: [],
    ledger:      [],
    history:     [],

    // Security
    transactionPin: "",
    withdrawPin:    "",

    // Status block
    status: {
      accountStatus: "active",
      emailVerified: false,
      isOnline:      true,
      lastSeen:      serverTimestamp()
    },

    // Metadata
    metadata: {
      createdAt:        serverTimestamp(),
      updatedAt:        serverTimestamp(),
      registrationStep: Number(raw.registrationStep) || 1,
      emailVerifiedAt:  null
    }
  };
};

// ============================================================
// AUTH HELPERS
// ============================================================
export const registerWithEmail = async (email, password) => {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  return cred.user;
};

export const getUserData = async (uid) => {
  if (!uid) return null;
  try {
    const snap = await getDoc(doc(db, DB_COLLECTIONS.USERS, uid));
    return snap.exists() ? snap.data() : null;
  } catch (e) {
    console.error("[SBA] getUserData:", e);
    return null;
  }
};

export const clearSession = async () => {
  clearRegistrationData();
  await signOut(auth).catch(() => {});
  window.location.href = "login.html";
};

// ============================================================
// MULTI-STEP REGISTRATION SESSION
// ============================================================
const SESSION_KEY = "SBA_REG_DATA";

export const saveRegistrationStep = (data) => {
  try {
    const existing = JSON.parse(sessionStorage.getItem(SESSION_KEY) || "{}");
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ ...existing, ...data }));
  } catch (e) { console.error("[SBA] Session write:", e); }
};

export const getRegistrationData = () => {
  try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || "{}"); }
  catch (e) { return {}; }
};

export const clearRegistrationData = () => {
  try { sessionStorage.removeItem(SESSION_KEY); } catch (_) {}
};
