// src/counter.js
import { database, auth } from "./firebase"
import { ref, onValue, runTransaction } from "firebase/database";
import { onAuthStateChanged, signOut } from "firebase/auth";


let isProcessing = false;
const signOutButton = document.getElementById('sign-out-button');
const counterRef = ref(database, 'counter')
const counterElement = document.getElementById('counter');
const incrementBtn = document.getElementById('incrementBtn');

//Checks if user is logged in, if not redirects them to login page
onAuthStateChanged(auth, (user) => {
  if (!user){
    window.location.href = 'login.html';
  }
});

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

signOutButton.addEventListener('click', async () => {
    try {
        await signOut(auth);
        console.log('User signed out');
        window.location.href = 'login.html';  // Redirect back to login page after sign-out
    } catch (error) {
        console.error('Error during sign-out: ', error);
    }
});