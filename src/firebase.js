// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDyofoQAAOpcjn9RzKr2N0dqzZNTjbpHyQ",
  authDomain: "hydrosentinal-1806.firebaseapp.com",
  projectId: "hydrosentinal-1806",
  storageBucket: "hydrosentinal-1806.firebasestorage.app",
  messagingSenderId: "186630577300",
  appId: "1:186630577300:web:455490195c7dbfdf4c6881",
  measurementId: "G-PWS5WQR1VY"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export const db = getFirestore(app);
export const auth = getAuth(app);
