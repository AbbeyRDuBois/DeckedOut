import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCeSKFFsJR5F_dkrKLMRA1w9QZuxOTg3Dg",
  authDomain: "decked0ut.firebaseapp.com",
  databaseURL:"https://decked0ut-default-rtdb.firebaseio.com",
  projectId: "decked0ut",
  storageBucket: "decked0ut.firebasestorage.app",
  messagingSenderId: "964204828145",
  appId: "1:964204828145:web:bb37413d4cb8e4d3e3e050"
};

function getSessionId(): string {
  let sessionId = localStorage.getItem('sessionId');
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem('sessionId', sessionId);
  }
  return sessionId
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth, getSessionId };