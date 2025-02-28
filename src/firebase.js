import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCeSKFFsJR5F_dkrKLMRA1w9QZuxOTg3Dg",
  authDomain: "decked0ut.firebaseapp.com",
  databaseURL:"https://decked0ut-default-rtdb.firebaseio.com",
  projectId: "decked0ut",
  storageBucket: "decked0ut.firebasestorage.app",
  messagingSenderId: "964204828145",
  appId: "1:964204828145:web:bb37413d4cb8e4d3e3e050"
};

const app = initializeApp(firebaseConfig)
const database = getDatabase(app);
const auth = getAuth(app);

export { database, auth };