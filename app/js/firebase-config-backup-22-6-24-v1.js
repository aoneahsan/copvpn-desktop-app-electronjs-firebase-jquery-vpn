// const firebase = require('firebase/app');
// require('firebase/auth');

const { initializeApp } = require('firebase/app');
const {
	getAuth,
	signInWithPopup,
	GoogleAuthProvider,
} = require('firebase/auth');
// const shell = require("electron").remote;

const firebaseConfig = {
	apiKey: 'AIzaSyCoewqXXRFGuFu5QwrWR5KTUcYXgJA_F0s',
	authDomain: 'copvpn-10757.firebaseapp.com',
	databaseURL:
		'https://copvpn-10757-default-rtdb.asia-southeast1.firebasedatabase.app/',
	projectId: 'copvpn-10757',
	storageBucket: 'copvpn-10757.appspot.com',
	messagingSenderId: '585582605437',
	appId: '1:585582605437:web:b802c05889ef0606842d14',
	measurementId: 'G-W9SEYYZ8L3',
};

// Initialize Firebase
// firebase.initializeApp(firebaseConfig);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// module.exports = firebase;

$(document).ready(function () {
	$('#google-signin').click(function (e) {
		e.preventDefault();
		console.log('hi');
		shell.openExternal('http://localhost:3001/');
		// const provider = new GoogleAuthProvider();
		// signInWithPopup(auth, provider)
		//     .then((result) => {
		//         // Access Token and user info
		//         const token = result.credential.accessToken;
		//         const user = result.user;
		//         alert('Success! User: ' + user.email);
		//     }).catch((error) => {
		//         console.error(error);
		//     });

		// var provider = new firebase.auth.GoogleAuthProvider();
		// firebase.auth()
		//     .signInWithPopup(provider)
		//     .then((result) => {
		//         // This gives you a Google Access Token. You can use it to access Google APIs.
		//         var token = result.credential.accessToken;
		//         var user = result.user;
		//         alert('Success! User: ' + user.email);
		//     }).catch((error) => {
		//         console.error(error);
		//     });
	});
});

// var firebaseConfig = {
//     apiKey: "YOUR_API_KEY",
//     authDomain: "YOUR_AUTH_DOMAIN",
//     projectId: "YOUR_PROJECT_ID",
//     storageBucket: "YOUR_STORAGE_BUCKET",
//     messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
//     appId: "YOUR_APP_ID"
//   };

//   firebase.initializeApp(firebaseConfig);
