// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries
import { getAuth } from 'firebase/auth';
// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyA5eR8Eb67bCiGF-sc-SZ8S9_qKkyTSdBg",
  authDomain: "zenguide-fa81f.firebaseapp.com",
  projectId: "zenguide-fa81f",
  storageBucket: "zenguide-fa81f.appspot.com",
  messagingSenderId: "417879220768",
  appId: "1:417879220768:web:3ecb610b5bdbfc37cc1245",
  measurementId: "G-1464K58W1P"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };