// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBP4IndWIqgU8mIkyFWVl-Z0SmMzWW--ow",
    authDomain: "sharebite-e1b2c.firebaseapp.com",
    projectId: "sharebite-e1b2c",
    storageBucket: "sharebite-e1b2c.firebasestorage.app",
    messagingSenderId: "581786788459",
    appId: "1:581786788459:web:1b7ef76f1da544990e072e"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;