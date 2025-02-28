import { auth } from '../firebase';
import { signInWithEmailAndPassword, setPersistence, browserLocalPersistence, browserSessionPersistence } from 'firebase/auth';
import './styles.css'

// Show the warning banner with a message
function showWarningBanner(message) {
    document.getElementById('warning-message').textContent = message;
    document.getElementById('warning-banner').style.display = 'block';
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
    document.getElementById('warning-banner').style.display = 'none';
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    let persistence;

    if (loginValid(email, password)){
        if(document.getElementById('rememberMe').checked){
            //User Stays logged in across sessions now
            persistence = browserLocalPersistence;
        }
        else{
            persistence = browserSessionPersistence; 
        }

        setPersistence(auth, persistence).then(()=> {
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
        });
    }
});