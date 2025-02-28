import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDlVbS6JpT7vHlR6NKfBVrouBx3wHhuKFU",
  authDomain: "multi-games-f80aa.firebaseapp.com",
  projectId: "multi-games-f80aa",
  storageBucket: "multi-games-f80aa.firebasestorage.app",
  messagingSenderId: "136641042337",
  appId: "1:136641042337:web:efc128878d17df6f101de0"
};

const app = initializeApp(firebaseConfig)
const database = getDatabase(app);
const auth = getAuth(app);

export { database, auth };