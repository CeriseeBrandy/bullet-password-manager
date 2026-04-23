let inactivityTimer;
let INACTIVITY_TIME = 2 * 60 * 1000;

// 🔒 LOCK APP
function lockApp() {
    localStorage.removeItem("isLogged");
    sessionStorage.removeItem("masterPass"); // 🔥 AJOUT

    window.location.href = "login.html";
}

// 🔁 Reset timer
function resetInactivityTimer() {
    clearTimeout(inactivityTimer);

    inactivityTimer = setTimeout(() => {
        lockApp();
    }, INACTIVITY_TIME);
}

// 🎯 INIT
window.addEventListener('DOMContentLoaded', async () => {

    const pass = sessionStorage.getItem("masterPass");
    const isLogged = localStorage.getItem("isLogged");

    

    // ❌ PAS LOG → redirect
     if (!isLogged) {
        
        window.location.href = "login.html";
        return;
    }

    try {
        // 🔐 restore crypto
        await loadCryptoKey(pass);

        // 🔥 clé en mémoire
        window.currentMasterPass = pass;

        

    } catch (e) {
        

        localStorage.removeItem("isLogged");
        localStorage.removeItem("masterPass");

        window.location.href = "login.html";
        return;
    }

    // ⚙️ SETTINGS + TIMER
    loadInactivitySetting();
    setupInactivityInput();

    ['click', 'keydown'].forEach(event => {
        document.addEventListener(event, resetInactivityTimer, { passive: true });
    });

    resetInactivityTimer();

    // 📦 LOAD VAULT
    if (!window.__vaultLoaded) {
        window.__vaultLoaded = true;
        loadVault();
    }
});

// ⚙️ Settings
function loadInactivitySetting() {
    const saved = localStorage.getItem('bullet_inactivity');

    if (saved) {
        INACTIVITY_TIME = parseInt(saved) * 60 * 1000;

        const input = document.getElementById('inactivity-time');
        if (input) input.value = saved;
    }
}

function setupInactivityInput() {
    const input = document.getElementById('inactivity-time');

    if (!input) return;

    input.addEventListener('change', (e) => {
        const value = e.target.value;

        localStorage.setItem('bullet_inactivity', value);
        INACTIVITY_TIME = value * 60 * 1000;

        resetInactivityTimer();
    });
}