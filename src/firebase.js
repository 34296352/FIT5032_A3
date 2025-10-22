// src/firebase.js

import { initializeApp } from 'firebase/app'
import {
  getAuth,
  setPersistence,
  browserSessionPersistence,
} from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: 'AIzaSyAJfkfa6ceck_ObOr_6BN1xYxxgu4mmYi0',
  authDomain: 'a1-c-requirements.firebaseapp.com',
  projectId: 'a1-c-requirements',
  storageBucket: 'a1-c-requirements.firebasestorage.app',
  messagingSenderId: '866577604749',
  appId: '1:866577604749:web:ef56f85c5f4cc1742702c4',
}

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)

export const authReady = setPersistence(auth, browserSessionPersistence).catch((e) => {
  console.warn('setPersistence(browserSessionPersistence) failed, falling back to default local persistence:', e)
})
