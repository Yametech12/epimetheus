import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, EmailAuthProvider } from "firebase/auth";
import { initializeFirestore, getDocFromServer, doc, enableNetwork, memoryLocalCache } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

import { handleFirestoreError, OperationType } from "../utils/errorHandling";

// Your web app's Firebase configuration
const firebaseConfig: any = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCIVOidyoXfGAbmGx0CBCDqjk6KdMPDO6Q",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "project-0072b519-b9bc-4a17-885.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "project-0072b519-b9bc-4a17-885",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "project-0072b519-b9bc-4a17-885.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "489845233202",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:489845233202:web:3113c28693613ca2774e2b",
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || "ai-studio-8dfb031a-842c-43f3-a9a0-de3d25111682"
};

// Initialize Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Initialize Firestore with long polling and memory cache to prevent Unexpected state errors on reload
export const db = initializeFirestore(app, {
  localCache: memoryLocalCache(),
  experimentalForceLongPolling: true,
}, firebaseConfig.firestoreDatabaseId);

// Explicitly ensure the network is enabled
enableNetwork(db).catch(err => console.error("Failed to enable network:", err));

export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
export const emailProvider = new EmailAuthProvider();

export { handleFirestoreError, OperationType };

// Test connection to Firestore
async function testConnection() {
  try {
    // Attempt to fetch a document directly from the server
    await getDocFromServer(doc(db, '_health_check_', 'ping'));
    console.log("✅ Firestore connection successful.");
  } catch (error: any) {
    if (error?.code === 'permission-denied') {
      console.log("✅ Firestore is ONLINE (received expected permission denied).");
      return;
    }

    console.error("❌ Firestore connection test failed.");
    console.error("Error Code:", error?.code);
    console.error("Error Message:", error?.message);
    
    if (error?.message?.includes('offline')) {
      console.error("CRITICAL ACTION REQUIRED:");
      console.error(`1. Open https://console.firebase.google.com/project/${firebaseConfig.projectId}/firestore`);
      console.error("2. If you see a 'Create Database' button, YOU MUST CLICK IT.");
      console.error("3. Ensure you choose 'Start in test mode' or 'Start in production mode'.");
      console.error("4. If the database already exists, check if the API Key is restricted in Google Cloud Console.");
    }
  }
}

// Run test with a slight delay to allow network stack to warm up
setTimeout(testConnection, 2000);

if (typeof window !== "undefined" && (firebaseConfig as any).measurementId) {
  try {
    getAnalytics(app);
  } catch (error) {
    console.warn("Firebase Analytics failed to initialize:", error);
  }
}
