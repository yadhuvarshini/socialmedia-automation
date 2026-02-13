import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: "AIzaSyCfyFAJfYAspUD8TtopzBQ82tT2nP3nOjw",
    authDomain: "blazly-social-51a89.firebaseapp.com",
    projectId: "blazly-social-51a89",
    storageBucket: "blazly-social-51a89.firebasestorage.app",
    messagingSenderId: "644375809096",
    appId: "1:644375809096:web:31ce839760edca00e31c7d"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
