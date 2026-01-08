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

self.addEventListener('notificationclick', function (event) {
    console.log('[firebase-messaging-sw.js] Notification click Received.');
    event.notification.close();

    // Open the app or focus if open
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
            // Check if there is already a window/tab open with the target URL
            for (var i = 0; i < windowClients.length; i++) {
                var client = windowClients[i];
                // Check if the client is focusable (it is a window)
                if (client.url.indexOf('/') !== -1 && 'focus' in client) {
                    return client.focus();
                }
            }
            // If not, open a new window
            if (clients.openWindow) {
                return clients.openWindow('/messages'); // Open directly to messages
            }
        })
    );
});
