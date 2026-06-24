// ============================================================
//  🔥 Firebase конфигурация (compat-версия)
//  Используется email/пароль, без анонимной аутентификации
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

// Экспортируем в глобальную область
window.database = firebase.database();
window.auth = firebase.auth();

console.log('✅ Firebase инициализирована (email/пароль)');

// ===== ГЕНЕРАЦИЯ ИНКРЕМЕНТАЛЬНОГО ID ДЛЯ ЗАКАЗОВ =====
function getNextOrderId() {
  return new Promise((resolve, reject) => {
    const counterRef = window.database.ref('meta/orderCounter');
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

// Экспортируем в глобальную область
window.getNextOrderId = getNextOrderId;
window.waitForFirebase = function(callback) {
  if (window.database && window.auth) {
    callback();
  } else {
    console.warn('⏳ Ожидаем Firebase...');
    setTimeout(() => window.waitForFirebase(callback), 200);
  }
};