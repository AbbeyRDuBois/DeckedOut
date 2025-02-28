import { auth } from './firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';

function showWarningBanner(message) {
    const banner = document.getElementById('warning-banner');
    const warningMessage = document.getElementById('warning-message');
    warningMessage.textContent = message;
    banner.style.display = 'block';
}

function loginValid(email, password) {
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

const submitBtn = document.getElementById('submit');
submitBtn.addEventListener('click', () => {
    showWarningBanner("");
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    if (loginValid(email, password)){
        signInWithEmailAndPassword(auth, `${email}`, `${password}`)
        .then((userCredential) => {
            console.log('User signed in: ', userCredential.user);
            window.location.href = 'counter.html';
        })
        .catch((error) => {
            console.error("Error signing in:", error.code, error.message);

            if (error.code === 'auth/invalid-credential') {
                showWarningBanner('Invalid credentials. Please check your email and password.');
            } else if (error.code === 'auth/user-not-found') {
                showWarningBanner('No user found with this email address.');
            } else if (error.code === 'auth/wrong-password') {
                showWarningBanner('Incorrect password.');
            } else if (error.code === 'auth/invalid-email') {
                showWarningBanner('Please provide a valid email address.');
            } else {
                showWarningBanner('An error occurred: ' + error.message);
            }
        });
    }
});

const signUpBtn = document.getElementById('signup');
signUpBtn.addEventListener('click', () => {
    window.location.href = 'signup.html';
});