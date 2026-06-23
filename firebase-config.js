// ============================================================
//  🔥 Firebase конфигурация (compat-версия для скриптов)
// ============================================================

const firebaseConfig = {
  apiKey: "AIzaSyBD7GGC00wr_3Ggkbtz9WmYscZ3NQlVkPM",
  authDomain: "msk-project-d0f5f.firebaseapp.com",
  databaseURL: "https://msk-project-d0f5f-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "msk-project-d0f5f",
  storageBucket: "msk-project-d0f5f.firebasestorage.app",
  messagingSenderId: "834093900937",
  appId: "1:834093900937:web:9b1e21177d4c7bdbf6d258",
  measurementId: "G-KE8FNH95KP"
};

firebase.initializeApp(firebaseConfig);

const database = firebase.database();
const auth = firebase.auth();

let firebaseReady = false;
let currentUserId = null;

auth.signInAnonymously()
  .then(result => {
    currentUserId = result.user.uid;
    firebaseReady = true;
    console.log('✅ Анонимный вход выполнен, UID:', currentUserId);
    if (window.onFirebaseReady) window.onFirebaseReady();
  })
  .catch(error => {
    console.error('❌ Ошибка анонимной аутентификации:', error);
  });

function getCurrentUserId() {
  return currentUserId;
}

function waitForFirebase(callback) {
  if (firebaseReady && getCurrentUserId()) {
    callback();
  } else {
    window.onFirebaseReady = callback;
  }
}

// ===== ГЕНЕРАЦИЯ ИНКРЕМЕНТАЛЬНОГО ID ДЛЯ ЗАКАЗОВ =====
function getNextOrderId() {
  return new Promise((resolve, reject) => {
    const counterRef = database.ref('meta/orderCounter');
    counterRef.transaction(current => {
      return (current || 0) + 1;
    }, (error, committed, snapshot) => {
      if (error) {
        reject(error);
      } else if (committed) {
        resolve(snapshot.val());
      } else {
        resolve(null);
      }
    }, false);
  });
}