importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyBB3VE9WQYX0fqM9ZmLSj3dR0-SQjpg0gY",
    authDomain: "sbagrant-b7e5d.firebaseapp.com",
    projectId: "sbagrant-b7e5d",
    storageBucket: "sbagrant-b7e5d.firebasestorage.app",
    messagingSenderId: "802243206422",
    appId: "1:802243206422:web:bbe74af7ce227092250437"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    const notificationTitle = payload.notification?.title || 'SBA Grant Notification';
    const notificationOptions = {
        body: payload.notification?.body || 'You have a new update.',
        icon: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200'
    };
    self.registration.showNotification(notificationTitle, notificationOptions);
});
