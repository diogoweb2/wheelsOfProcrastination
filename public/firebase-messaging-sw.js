/* global importScripts, firebase */
// Firebase Cloud Messaging background handler. Separate from the Workbox PWA
// service worker — it registers on its own scope,
// /firebase-cloud-messaging-push-scope (see src/push.ts), and vite.config.ts
// keeps Workbox from precaching this file.
//
// Sends from the Cloud Function carry a webpush.notification payload, so FCM
// displays them automatically; onBackgroundMessage is a fallback for data-only
// messages.
importScripts('https://www.gstatic.com/firebasejs/12.15.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/12.15.0/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey: 'AIzaSyAeCyBJ-P2e6E5LDHwC2yBGKb3uYITo_V4',
  authDomain: 'spinningwheel-6ff51.firebaseapp.com',
  projectId: 'spinningwheel-6ff51',
  storageBucket: 'spinningwheel-6ff51.firebasestorage.app',
  messagingSenderId: '30669970378',
  appId: '1:30669970378:web:e15a8d3b24d87bacd28d33',
})

const messaging = firebase.messaging()

messaging.onBackgroundMessage((payload) => {
  const n = payload.notification || payload.data || {}
  self.registration.showNotification(n.title || '👒 Wheels of Procrastination', {
    body: n.body || '',
    icon: '/pwa-192.png',
    badge: '/pwa-192.png',
  })
})
