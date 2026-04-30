import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyD8TssUEynL_Sg9PxCABl0TnhyLWNZs8No",
  authDomain: "emporio-fitness-6f530.firebaseapp.com",
  projectId: "emporio-fitness-6f530",
  storageBucket: "emporio-fitness-6f530.firebasestorage.app",
  messagingSenderId: "130125925881",
  appId: "1:130125925881:web:caa4840be80a4668324128"
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)