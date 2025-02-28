import { auth } from './firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';


function loginValid(email, password) {
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

const submitBtn = document.getElementById('submit');
submitBtn.addEventListener('click', () => {
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
                alert('Invalid credentials. Please check your email and password.');
            } else if (error.code === 'auth/user-not-found') {
                alert('No user found with this email address.');
            } else if (error.code === 'auth/wrong-password') {
                alert('Incorrect password.');
            } else if (error.code === 'auth/invalid-email') {
                alert('Please provide a valid email address.');
            } else {
                alert('An error occurred: ' + error.message);
            }
        });
    }
});

const signUpBtn = document.getElementById('signup');
signUpBtn.addEventListener('click', () => {
    window.location.href = 'signup.html';
});