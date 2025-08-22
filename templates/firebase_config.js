// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyD1xctlV_gFCGzE9M-u7DJCrXNt73uB_9k",
    authDomain: "accountbook-7bc8e.firebaseapp.com",
    projectId: "accountbook-7bc8e",
    storageBucket: "accountbook-7bc8e.firebasestorage.app",
    messagingSenderId: "1023257780949",
    appId: "1:1023257780949:web:873377e7d3a5d838a7785c",
    measurementId: "G-9X8C4L2116"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const analytics = getAnalytics(app);

// Configure Google Auth Provider
const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');

// Export for use in other modules
export { 
    app, 
    auth, 
    db, 
    analytics, 
    googleProvider 
};