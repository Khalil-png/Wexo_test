importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyCwon_7nj9IIw-mmTHbC3biUy8srmuXfAI",
  authDomain: "wexo-36cb4.firebaseapp.com",
  projectId: "wexo-36cb4",
  storageBucket: "wexo-36cb4.firebasestorage.app",
  messagingSenderId: "350228809557",
  appId: "1:350228809557:web:9e642ad0257d1aa99711dc"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icon.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
