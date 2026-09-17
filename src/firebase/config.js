import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

export function readFirebaseWebConfig() {
  return {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
  }
}

export function isFirebaseConfigured() {
  const config = readFirebaseWebConfig()
  return Boolean(config.apiKey && config.authDomain && config.projectId && config.appId)
}

let app
let auth
let db

export function getFirebase() {
  if (!isFirebaseConfigured()) return { app: null, auth: null, db: null }
  if (!app) {
    app = initializeApp(readFirebaseWebConfig())
    auth = getAuth(app)
    db = getFirestore(app)
  }
  return { app, auth, db }
}
