// ========================================
// auth.js — управление аутентификацией
// ========================================

function waitForAuth(callback) {
    if (window.auth && window.auth.currentUser) {
        callback(window.auth.currentUser);
    } else if (window.auth) {
        const unsubscribe = window.auth.onAuthStateChanged(user => {
            unsubscribe();
            callback(user);
        });
    } else {
        console.warn('Firebase Auth не инициализирован');
        callback(null);
    }
}

function getCurrentUser() {
    return window.auth ? window.auth.currentUser : null;
}

function getUserId() {
    const user = getCurrentUser();
    return user ? user.uid : null;
}

function signUp(email, password) {
    if (!window.auth) return Promise.reject('Auth not initialized');
    return window.auth.createUserWithEmailAndPassword(email, password);
}

function signIn(email, password) {
    if (!window.auth) return Promise.reject('Auth not initialized');
    return window.auth.signInWithEmailAndPassword(email, password);
}

function signOut() {
    if (!window.auth) return Promise.reject('Auth not initialized');
    return window.auth.signOut();
}

function onAuthStateChanged(callback) {
    if (!window.auth) {
        callback(null);
        return () => {};
    }
    return window.auth.onAuthStateChanged(callback);
}

// Глобальные функции
window.getCurrentUser = getCurrentUser;
window.getUserId = getUserId;
window.signUp = signUp;
window.signIn = signIn;
window.signOut = signOut;
window.onAuthStateChanged = onAuthStateChanged;
window.waitForAuth = waitForAuth;