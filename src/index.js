// src/index.js
import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, runTransaction } from "firebase/database";

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

let isProcessing = false;
const counterRef = ref(database, 'counter')
const counterElement = document.getElementById('counter');
const incrementBtn = document.getElementById('incrementBtn');

//Listens for changes to the counter value and updates the display for all devices
onValue(counterRef, (snapshot) => {
  const counterValue = snapshot.val(); //Gets value from Firebase
  counterElement.textContent = counterValue;  //Updates the display
});

//Updates the counter on button click
incrementBtn.addEventListener('click', () => {
  if (isProcessing) return;

  isProcessing = true; //Lock the button to only increment once

  //Can use transaction or set here
  //transaction handles race conditions and is good for any values that multiple people can change at one time
  //set just changes tha value without any regard if anyone changed it in the mean time
  runTransaction(counterRef, (currentValue) => {
    //currentValue is what is currently saved in database
    //checks if there is a value, if not set to 0
    return (currentValue || 0) + 1;
  }).then(() => {
    isProcessing = false; //Release lock
  }).catch((error)=> {
    console.error("Transaction failed: ", error);
    isProcessing = false; //Release lock
  });
});