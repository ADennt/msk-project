// ============================================================
//  🔥 Firebase конфигурация (compat-версия)
//  Обновлено: 24.06.2026
// ============================================================

const firebaseConfig = {
  apiKey: "AIzaSyBD7GGC00wr_3Ggkbtz9WmYscZ3NQlVkPM",
  authDomain: "msk-project-d0f5f.firebaseapp.com",
  databaseURL: "https://msk-project-d0f5f-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "msk-project-d0f5f",
  storageBucket: "msk-project-d0f5f.firebasestorage.app",
  messagingSenderId: "834093900937",
  appId: "1:834093900937:web:485ba4850baf02a8f6d258",
  measurementId: "G-YDEB6Z5HB5"
};

// Инициализация Firebase
firebase.initializeApp(firebaseConfig);

const database = firebase.database();
const auth = firebase.auth();

let firebaseReady = false;
let currentUserId = null;

// ===== АНОНИМНАЯ АУТЕНТИФИКАЦИЯ =====
// Включите анонимный вход в консоли Firebase:
// Authentication → Sign-in methods → Anonymous (включить)
auth.signInAnonymously()
  .then(result => {
    currentUserId = result.user.uid;
    firebaseReady = true;
    console.log('✅ Анонимный вход выполнен, UID:', currentUserId);
    if (window.onFirebaseReady) {
      console.log('📢 Вызываем onFirebaseReady');
      window.onFirebaseReady();
    }
  })
  .catch(error => {
    console.error('❌ Ошибка анонимной аутентификации:', error);
    // Если анонимный вход не включён, вы увидите эту ошибку
  });

function getCurrentUserId() {
  return currentUserId;
}

function waitForFirebase(callback) {
  if (firebaseReady && getCurrentUserId()) {
    console.log('⚡ Firebase уже готова, вызываем колбэк');
    callback();
  } else {
    console.log('⏳ Ожидаем Firebase...');
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

// Экспортируем в глобальную область (для использования в других скриптах)
window.database = database;
window.auth = auth;
window.getCurrentUserId = getCurrentUserId;
window.waitForFirebase = waitForFirebase;
window.getNextOrderId = getNextOrderId;
window.firebaseReady = firebaseReady;