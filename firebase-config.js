// ============================================================
//  🔥 Firebase конфигурация (compat-версия для скриптов)
// ============================================================

// Ваш конфиг из консоли Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBD7GGC00wr_3Ggkbtz9WmYscZ3NQlVkPM",
  authDomain: "msk-project-d0f5f.firebaseapp.com",
  projectId: "msk-project-d0f5f",
  storageBucket: "msk-project-d0f5f.firebasestorage.app",
  messagingSenderId: "834093900937",
  appId: "1:834093900937:web:9b1e21177d4c7bdbf6d258",
  measurementId: "G-KE8FNH95KP"
};

// Инициализация Firebase (compat-версия)
firebase.initializeApp(firebaseConfig);

// Получаем ссылки на сервисы
const database = firebase.database();
const auth = firebase.auth();

// Флаг готовности Firebase
let firebaseReady = false;
let currentUserId = null;

// Анонимная аутентификация
auth.signInAnonymously()
  .then(result => {
    currentUserId = result.user.uid;
    firebaseReady = true;
    console.log('✅ Анонимный вход выполнен, UID:', currentUserId);
    // Запускаем инициализацию, которая ждёт этого события
    if (window.onFirebaseReady) window.onFirebaseReady();
  })
  .catch(error => {
    console.error('❌ Ошибка анонимной аутентификации:', error);
  });

// Функция получения текущего UID (для использования в скриптах)
function getCurrentUserId() {
  return currentUserId;
}