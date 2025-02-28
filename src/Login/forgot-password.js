import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase'

// Show the warning banner with a message
function showWarningBanner(message) {
  document.getElementById('warning-message').textContent = message;
  document.getElementById('warning-banner').style.display = 'block';
}

function emailValid(email) {
  if(email.trim() === '') {
    showWarningBanner("Email cannot be empty.")
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
const sendBtn= document.getElementById('submit');
sendBtn.addEventListener('click', () => {
  document.getElementById('warning-banner').style.display = 'none';
  const email = document.getElementById('email').value;

  if (emailValid(email)){
    sendPasswordResetEmail(auth, email)
    .then(() => {
    })
    .catch((error) => {
      // Handle different error scenarios
      if (error.code === 'auth/invalid-email') {
        showWarningBanner('The email address is not valid.');
      } else if (error.code === 'auth/user-not-found') {
        showWarningBanner('No user found with this email address.');
      } else {
        showWarningBanner('Error: ' + error.message);
      }
    });
  };
});