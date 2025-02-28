import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from './firebase'

function signUpValid(email, password) {
  //If email doesn't follow semi standard format
  if(!String(email).toLowerCase.match(/^\S+@\S+\.\S+$/)) {
      alert("Email is not in correct format.")
      return false;
  }

  //If email doesn't follow semi standard format
  if(email.trim() === '') {
      alert("Email cannot be empty.")
      return false;
  }

  //If email doesn't follow semi standard format
  if(password.trim() === '') {
      alert("Password cannot be empty.")
      return false;
  }


};


// Set up the sign-up form
const signUpBtn= document.getElementById('submit');
signUpBtn.addEventListener('click', () => {

  //This uses Firebase authentication to create user
  //Auto hashes passwords to keep them safe
  createUserWithEmailAndPassword(auth, `${document.getElementById('email').value}`, `${document.getElementById('password').value}`)
  .then((userCredential) => {
    console.log('User signed in:', userCredential.user);
    window.location.href = 'counter.html';
  })
  .catch((error) => {
    if (error.code === 'auth/email-already-in-use') {
        console.log('The email is already registered.');
        alert('This email is already in use. Please try logging in or use a different email address.');
    } else {
        // Handle other possible errors
        console.log('Error creating user:', error.message);
        alert('An error occurred: ' + error.message);
    }
  });
});