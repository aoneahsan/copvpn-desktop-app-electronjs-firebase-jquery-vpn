const { initializeApp } = require('firebase/app');
const { getAuth } = require('firebase/auth');

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

const app = initializeApp(firebaseConfig);
getAuth(app);

$(document).ready(function () {
	$('#google-signin').click(function (e) {
		e.preventDefault();
		console.log('hi');
		shell.openExternal('http://localhost:3001/');
	});
});
