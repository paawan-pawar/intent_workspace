import { getApp, getApps, initializeApp } from 'firebase/app'
import {
  createUserWithEmailAndPassword,
  getAuth,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const isFirebaseConfigured = Object.values(firebaseConfig).every(Boolean)

const app = isFirebaseConfigured
  ? getApps().length > 0
    ? getApp()
    : initializeApp(firebaseConfig)
  : null

export const auth = app ? getAuth(app) : null

function requireAuth() {
  if (!auth) {
    throw new Error('Firebase is not configured. Add the VITE_FIREBASE_* values to frontend/.env.local.')
  }

  return auth
}

export async function signUpWithEmail(email: string, password: string, displayName: string) {
  const credential = await createUserWithEmailAndPassword(requireAuth(), email, password)
  await updateProfile(credential.user, { displayName })
  await sendEmailVerification(credential.user)
  return credential.user
}

export async function signInWithEmail(email: string, password: string) {
  const credential = await signInWithEmailAndPassword(requireAuth(), email, password)

  if (!credential.user.emailVerified) {
    await signOut(requireAuth())
    throw new Error('Please verify your email from the link we sent to your inbox before signing in.')
  }

  return credential.user
}

export async function resendVerificationEmail() {
  const user = requireAuth().currentUser
  if (!user) throw new Error('Your signup session expired. Please create your account again.')
  await sendEmailVerification(user)
}

export async function refreshVerifiedUser(): Promise<User> {
  const user = requireAuth().currentUser
  if (!user) throw new Error('Your signup session expired. Please sign in again.')
  await user.reload()

  if (!user.emailVerified) {
    throw new Error('Your email is not verified yet. Open the verification link in your inbox, then try again.')
  }

  return user
}

export async function sendResetEmail(email: string) {
  await sendPasswordResetEmail(requireAuth(), email)
}
