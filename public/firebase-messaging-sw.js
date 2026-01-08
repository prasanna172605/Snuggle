importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

const firebaseConfig = {
    apiKey: "AIzaSyCccZYjpK8uhRmjzUPrgu3eloASikNpmJc",
    authDomain: "snuggle-73465.firebaseapp.com",
    databaseURL: "https://snuggle-73465-default-rtdb.firebaseio.com",
    projectId: "snuggle-73465",
    storageBucket: "snuggle-73465.firebasestorage.app",
    messagingSenderId: "873162893612",
    appId: "1:873162893612:web:70bdb26473c304a6ca2489",
    measurementId: "G-XPBFXQF0SL"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    // Customize notification here
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: '/vite.svg'
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});
