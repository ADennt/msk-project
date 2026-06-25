// ========================================
// МСК — АУТЕНТИФИКАЦИЯ (с сохранением пользователей)
// ========================================

if (typeof window.ADMIN_EMAILS === 'undefined') {
    window.ADMIN_EMAILS = ['admin@msk.ru','entelise@gmail.com'];
}

function waitForAuth(callback) {
    if (window.auth) {
        callback();
    } else {
        console.warn('⏳ Ожидаем инициализацию Firebase Auth...');
        setTimeout(() => waitForAuth(callback), 200);
    }
}

// ===== СОХРАНЕНИЕ ПОЛЬЗОВАТЕЛЯ В БАЗУ =====
function saveUserToDatabase(user) {
    console.log('🔥 saveUserToDatabase вызвана для:', user.email);
    if (!window.database || !user) return;
    const userRef = window.database.ref('users/' + user.uid);
    userRef.once('value', snapshot => {
        if (!snapshot.exists()) {
            userRef.set({
                email: user.email,
                registeredAt: new Date().toISOString(),
                uid: user.uid
            }).catch(err => console.warn('Ошибка сохранения пользователя:', err));
        }
    });
}

// ===== ПЕРЕНОС КОРЗИНЫ ИЗ LOCALSTORAGE В FIREBASE ПРИ ВХОДЕ =====
function migrateGuestCartToFirebase(uid) {
    const localCart = JSON.parse(localStorage.getItem('msk_cart') || '[]');
    if (localCart.length === 0) return Promise.resolve();

    const cartRef = window.database.ref(`users/${uid}/cart`);
    return cartRef.set(localCart).then(() => {
        localStorage.removeItem('msk_cart');
        console.log('✅ Гостевая корзина перенесена в Firebase');
        // Обновляем глобальную переменную cart
        if (window.cart) {
            window.cart = localCart;
        }
        if (window.updateCartUI) window.updateCartUI();
    });
}

// ===== РЕГИСТРАЦИЯ =====
window.registerUser = function(email, password) {
    return new Promise((resolve, reject) => {
        waitForAuth(() => {
            if (!window.auth) {
                reject(new Error('Firebase Auth не инициализирована'));
                return;
            }
            window.auth.createUserWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    console.log('✅ Регистрация успешна:', userCredential.user.email);
                    saveUserToDatabase(userCredential.user);
                    // Переносим корзину
                    migrateGuestCartToFirebase(userCredential.user.uid)
                        .then(() => {
                            window.showToast?.(`Добро пожаловать, ${userCredential.user.email}!`, 'success');
                            resolve(userCredential.user);
                        })
                        .catch(err => {
                            console.warn('Ошибка переноса корзины:', err);
                            resolve(userCredential.user);
                        });
                })
                .catch((error) => {
                    console.error('❌ Ошибка регистрации:', error);
                    let userMessage = error.message;
                    if (error.code === 'auth/email-already-in-use') userMessage = 'Этот email уже зарегистрирован.';
                    else if (error.code === 'auth/invalid-email') userMessage = 'Неверный формат email.';
                    else if (error.code === 'auth/weak-password') userMessage = 'Пароль слишком слабый (минимум 6 символов).';
                    else if (error.code === 'auth/too-many-requests') userMessage = 'Слишком много попыток. Попробуйте позже.';
                    else if (error.code === 'auth/admin-restricted-operation') userMessage = 'Операция запрещена. Проверьте настройки Firebase (включите Email/Password).';
                    window.showToast?.(userMessage, 'error');
                    reject({ code: error.code, message: userMessage, original: error });
                });
        });
    });
};

// ===== ВХОД =====
window.loginUser = function(email, password) {
    return new Promise((resolve, reject) => {
        waitForAuth(() => {
            if (!window.auth) {
                reject(new Error('Firebase Auth не инициализирована'));
                return;
            }
            window.auth.signInWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    console.log('✅ Вход выполнен:', userCredential.user.email);
                    saveUserToDatabase(userCredential.user);
                    // Переносим корзину
                    migrateGuestCartToFirebase(userCredential.user.uid)
                        .then(() => {
                            window.showToast?.(`Добро пожаловать, ${userCredential.user.email}!`, 'success');
                            resolve(userCredential.user);
                        })
                        .catch(err => {
                            console.warn('Ошибка переноса корзины:', err);
                            resolve(userCredential.user);
                        });
                })
                .catch((error) => {
                    console.error('❌ Ошибка входа:', error);
                    let userMessage = error.message;
                    if (error.code === 'auth/user-not-found') userMessage = 'Пользователь с таким email не найден.';
                    else if (error.code === 'auth/wrong-password') userMessage = 'Неверный пароль.';
                    else if (error.code === 'auth/invalid-email') userMessage = 'Неверный формат email.';
                    else if (error.code === 'auth/too-many-requests') userMessage = 'Слишком много попыток. Попробуйте позже.';
                    window.showToast?.(userMessage, 'error');
                    reject({ code: error.code, message: userMessage, original: error });
                });
        });
    });
};

// ===== ВЫХОД =====
window.logoutUser = function() {
    return new Promise((resolve, reject) => {
        waitForAuth(() => {
            if (!window.auth) {
                reject(new Error('Firebase Auth не инициализирована'));
                return;
            }
            // Сохраняем корзину в localStorage перед выходом (если она есть в Firebase)
            const uid = window.auth.currentUser?.uid;
            if (uid && window.database) {
                window.database.ref(`users/${uid}/cart`).once('value')
                    .then(snapshot => {
                        const cartData = snapshot.val() || [];
                        localStorage.setItem('msk_cart', JSON.stringify(cartData));
                        if (window.cart) window.cart = cartData;
                        if (window.updateCartUI) window.updateCartUI();
                    })
                    .catch(err => console.warn('Ошибка сохранения корзины перед выходом:', err));
            }
            window.auth.signOut()
                .then(() => {
                    console.log('✅ Выход выполнен');
                    window.showToast?.('Вы вышли из аккаунта', 'info');
                    resolve();
                })
                .catch((error) => {
                    console.error('❌ Ошибка выхода:', error);
                    window.showToast?.('Ошибка выхода', 'error');
                    reject(error);
                });
        });
    });
};

// ===== ТЕКУЩИЙ ПОЛЬЗОВАТЕЛЬ =====
window.getCurrentUser = function() {
    return new Promise((resolve) => {
        waitForAuth(() => {
            if (!window.auth) {
                resolve(null);
                return;
            }
            resolve(window.auth.currentUser);
        });
    });
};

// ===== ПОДПИСКА НА ИЗМЕНЕНИЯ =====
window.onAuthStateChanged = function(callback) {
    waitForAuth(() => {
        if (window.auth) {
            window.auth.onAuthStateChanged(callback);
        }
    });
};

// ===== ПРОВЕРКА АДМИНИСТРАТОРА =====
window.isAdmin = function(user) {
    if (!user || !user.email) return false;
    return window.ADMIN_EMAILS.includes(user.email);
};

// ===== ОБНОВЛЕНИЕ ТОПБАР =====
function updateTopbar() {
    const container = document.getElementById('topbarAuth');
    if (!container) return;
    const user = window.auth ? window.auth.currentUser : null;
    if (user) {
        container.innerHTML = `<a href="profile.html"><i class="fas fa-user"></i> Профиль</a>`;
    } else {
        container.innerHTML = `<a href="login.html"><i class="fas fa-sign-in-alt"></i> Войти</a>`;
    }
}

function updateUI() {
    updateTopbar();
}

window.onAuthStateChanged((user) => {
    updateUI();
});

document.addEventListener('DOMContentLoaded', function() {
    waitForAuth(() => {
        updateUI();
    });
});