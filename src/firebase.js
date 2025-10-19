// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from 'firebase/auth' 
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAJfkfa6ceck_ObOr_6BN1xYxxgu4mmYi0",
  authDomain: "a1-c-requirements.firebaseapp.com",
  projectId: "a1-c-requirements",
  storageBucket: "a1-c-requirements.firebasestorage.app",
  messagingSenderId: "866577604749",
  appId: "1:866577604749:web:ef56f85c5f4cc1742702c4"
};

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app) 