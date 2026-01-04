import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCeSKFFsJR5F_dkrKLMRA1w9QZuxOTg3Dg",
  authDomain: "decked0ut.firebaseapp.com",
  databaseURL:"https://decked0ut-default-rtdb.firebaseio.com",
  projectId: "decked0ut",
  storageBucket: "decked0ut.firebasestorage.app",
  messagingSenderId: "964204828145",
  appId: "1:964204828145:web:bb37413d4cb8e4d3e3e050"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Sign in with Google
export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  const user = result.user;

  return [user.email, user.displayName]
}

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled Promise Rejection:', event.reason);
});

window.addEventListener('error', (event) => {
  console.error('Uncaught Error:', event.error);
});

export { app, auth };