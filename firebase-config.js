// ============================================================
//  🔥 Firebase конфигурация (compat-версия)
// ============================================================

if (typeof firebaseConfig === 'undefined') {
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

    firebase.initializeApp(firebaseConfig);

    window.database = firebase.database();
    window.auth = firebase.auth();

    // Инициализация Storage с проверкой
    if (typeof firebase.storage === 'function') {
        window.storage = firebase.storage();
        console.log('✅ Firebase Storage инициализирован');
    } else {
        console.warn('⚠️ Firebase Storage не подключён. Загрузка изображений будет недоступна.');
        window.storage = null;
    }

    console.log('✅ Firebase инициализирована');
}

// ===== ГЕНЕРАЦИЯ ID ДЛЯ ЗАКАЗОВ =====
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

window.getNextOrderId = getNextOrderId;

window.waitForFirebase = function(callback) {
    if (window.database && window.auth) {
        callback();
    } else {
        console.warn('⏳ Ожидаем Firebase...');
        setTimeout(() => window.waitForFirebase(callback), 200);
    }
};

// ===== ЗАГРУЗКА ИЗОБРАЖЕНИЯ В STORAGE (только если Storage доступен) =====
window.uploadProductImage = function(file, productId) {
    return new Promise((resolve, reject) => {
        if (!window.storage) {
            reject(new Error('Firebase Storage не инициализирован. Подключите firebase-storage-compat.js'));
            return;
        }
        const ref = window.storage.ref(`products/${productId}_${Date.now()}.jpg`);
        const uploadTask = ref.put(file);

        uploadTask.on('state_changed',
            null,
            (error) => reject(error),
            () => {
                ref.getDownloadURL().then(url => resolve(url))
                   .catch(err => reject(err));
            }
        );
    });
};