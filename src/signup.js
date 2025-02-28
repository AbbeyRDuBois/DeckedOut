import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from './firebase'

  // Show the warning banner with a message
  function showWarningBanner(message) {
    const banner = document.getElementById('warning-banner');
    const warningMessage = document.getElementById('warning-message');
    warningMessage.textContent = message;
    banner.style.display = 'block';
  }

function signUpValid(email, password) {
  if(email.trim() === '' || password.trim() === '') {
    showWarningBanner("Email or Password cannot be empty.")
    return false;
  }
  //If email doesn't follow semi standard format
  if(!email.match(/^\S+@\S+\.\S+$/)) {
    showWarningBanner("Email is not in correct format.")
    return false;
  }

  return true;
};


// Set up the sign-up form
const signUpBtn= document.getElementById('submit');
signUpBtn.addEventListener('click', () => {
  showWarningBanner("");
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  if (signUpValid(email, password)){
  //This uses Firebase authentication to create user
    //Auto hashes passwords to keep them safe
    createUserWithEmailAndPassword(auth, `${email}`, `${password}`)
    .then((userCredential) => {
      console.log('User signed in:', userCredential.user);
      window.location.href = 'counter.html';
    })
    .catch((error) => {
      if (error.code === 'auth/email-already-in-use') {
          console.log('The email is already registered.');
          showWarningBanner('This email is already in use. Please try logging in or use a different email address.');
      } else {
          // Handle other possible errors
          console.log('Error creating user:', error.message);
          showWarningBanner('An error occurred: ' + error.message);
      }
    });
  };
});