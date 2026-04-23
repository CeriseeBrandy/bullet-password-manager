
const pwnedCache = {};
// ==========================================
// 2. NAVIGATION
// ==========================================
function showSection(name) {

    // 🔥 cacher toutes les sections
    document.querySelectorAll('.view-section').forEach(sec => {
        sec.style.display = "none";
        sec.classList.remove("active");
    });

    // 🔥 afficher la bonne
    const target = document.getElementById(name + "-view");

    if (target) {
        target.style.display = "block";
        target.classList.add("active");
    }

    // 🔄 update title
    const titles = {
        generator: 'Generator',
        vault: 'Vault',
        backup: 'Backup',
        about: 'Security',
        settings: 'Settings'
    };

    const tb = document.getElementById('topbar-title');
    if (tb) tb.textContent = titles[name] || name;
}

// ==========================================
// 3. LOGIQUE GÉNÉRATEUR (PYTHON)
// ==========================================
function updateLength(val) { 
    document.getElementById('length-val').innerText = val; 
}

function askPythonPassword() {
    const length = parseInt(document.getElementById('length-slider').value);
    const useSymbols = document.getElementById('check-symbols').checked;
    const useNumbers = document.getElementById('check-numbers').checked;

    let chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

    if (useNumbers) {
        chars += "0123456789";
    }

    if (useSymbols) {
        chars += "!@#$%^&*()_+-=[]{}|;:,.<>?";
    }

    let password = "";
    for (let i = 0; i < length; i++) {
        const randomIndex = crypto.getRandomValues(new Uint32Array(1))[0] % chars.length;
        password += chars[randomIndex];
    }

    document.getElementById('pass-display').value = password;
}

function copyToClipboard() {
    const passInput = document.getElementById('pass-display');
    if (!passInput.value) return;
    navigator.clipboard.writeText(passInput.value).then(() => {
        const copyBtn = document.getElementById('copy-btn');
        const original = copyBtn.innerHTML;
        copyBtn.innerHTML = '<i class="fa-solid fa-check" style="color: #00ff00;"></i>';
        setTimeout(() => { copyBtn.innerHTML = original; }, 2000);
    });
}

// ==========================================
// 5. SYSTÈME DE MODIFICATION (TILE)
// ==========================================

function openEditTile(id) {
    const overlay = document.createElement('div');
    overlay.className = "edit-overlay";

    const vault = cachedVault || [];

    const entry = vault.find(e => e.id === id);
    if (!entry) return;

    overlay.innerHTML = `
        <div class="edit-modal">

            <div class="edit-header">
                <img src="${entry.logo}">
                <span>${entry.domain}</span>
            </div>

            <div class="edit-body">

                <label>USERNAME</label>
                <input id="edit-user" value="${safe(entry.user)}">

                <label>PASSWORD</label>
                <input id="edit-pass" value="${safe(entry.pass)}">

            </div>

            <div class="edit-actions">
                <button class="btn-cancel">CANCEL</button>
                <button class="btn-save">SAVE</button>
            </div>

        </div>
    `;

    document.body.appendChild(overlay);
requestAnimationFrame(() => {
    overlay.querySelector('.edit-modal').classList.add('open');
});
    overlay.querySelector('.btn-cancel').onclick = () => overlay.remove();
    overlay.querySelector('.btn-save').onclick = () => saveVaultEntry(id);
}


// ==========================================
// 6. ACTIONS GLOBALES & PARAMÈTRES
// ==========================================

function copyVaultPass(password) {
    navigator.clipboard.writeText(password);

    const notification = document.createElement('div');
    notification.innerText = "AMMO COPIED";
    notification.style = "position:fixed;bottom:30px;left:50%;transform:translateX(-50%);background:#fff;color:#000;padding:10px 20px;border-radius:20px;font-weight:900;font-size:0.75rem;letter-spacing:1px;z-index:11000;box-shadow:0 0 10px rgba(255,255,255,0.6),0 0 20px rgba(255,255,255,0.3);";
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 2000);
}


// ==========================================
// 7. SYSTÈME DE NOTIFICATIONS TACTIQUES
// ==========================================
function bulletAlert(title, message = "") {
    const old = document.getElementById('bullet-modal-container');
    if(old) old.remove();

    const overlay = document.createElement('div');
    overlay.id = 'bullet-modal-container';
    overlay.className = "modal-overlay";

    const messageHTML = message ? `<p style="color: #eee; margin: 0 0 20px 0; font-family: 'Segoe UI', sans-serif; font-size: 0.75rem;">${message}</p>` : "";

    overlay.innerHTML = `
     <div class="custom-modal" style="background:#050505;">

        <h3 style="color:#fff;margin-bottom:30px;font-size:1.4rem;letter-spacing:6px;text-shadow:0 0 10px #fff,0 0 20px rgba(255,255,255,0.6);">
            ${title}
        </h3>

        <div style="background:rgba(255,255,255,0.05);border-radius:20px;padding:25px;margin-bottom:35px;border:1px solid rgba(255,255,255,0.1);font-family:monospace;font-size:0.85rem;color:#ddd;">
            ${messageHTML}
        </div>

        <div style="display:flex;justify-content:center;gap:25px;">
            
            <button id="close-bullet-btn" style="
                background:#1a1a1a;
                color:#aaa;
                border:1px solid rgba(255,255,255,0.2);
                padding:14px 30px;
                border-radius:15px;
                font-weight:900;
                cursor:pointer;
            ">
                CANCEL
            </button>

            <button id="confirm-bullet-btn" style="
                background:#fff;
                color:#000;
                border:none;
                padding:14px 30px;
                border-radius:15px;
                font-weight:900;
                cursor:pointer;
                box-shadow:0 0 15px rgba(255,255,255,0.6);
            ">
                OK
            </button>

        </div>

    </div>
`;

    document.body.appendChild(overlay);
    document.getElementById('close-bullet-btn').onclick = () => overlay.remove();
    document.getElementById('confirm-bullet-btn').onclick = () => overlay.remove();
}

function resetApplication() {
    const overlay = document.createElement('div');
    overlay.className = "modal-overlay";

    overlay.innerHTML = `
        <div style="background:#050505;border-radius:25px;padding:40px;width:450px;border:2px solid #fff;box-shadow:0 0 15px #fff;text-align:center;">

            <h3 style="color:#fff;margin-bottom:20px;letter-spacing:3px;">
                RESET COMPLET
            </h3>

            <div style="color:#aaa;margin-bottom:25px;">
                Cette action supprimera TOUTES vos données.<br><br>
                ⚠️ Action irréversible
            </div>

            <div style="display:flex;gap:15px;justify-content:center;">
                <button id="cancel-reset" style="background:#222;color:#aaa;padding:10px 20px;border-radius:10px;border:none;">
                    CANCEL
                </button>

                <button id="confirm-reset" style="background:#fff;color:#000;padding:10px 20px;border-radius:10px;border:none;font-weight:900;">
                    RESET
                </button>
            </div>

        </div>
    `;

    document.body.appendChild(overlay);

    document.getElementById('cancel-reset').onclick = () => overlay.remove();

    document.getElementById('confirm-reset').onclick = () => {
        localStorage.clear(); // 💀 wipe total
        location.reload();   // reload app
    };
}

function exportVault() {
    const overlay = document.createElement('div');
    overlay.className = "modal-overlay";

    overlay.innerHTML = `
        <div style="background:#050505;border-radius:25px;padding:40px 30px;width:100%;max-width:420px;text-align:center;">

            <h3 style="color:#fff;margin-bottom:25px;">
                CONFIRMATION EXPORT
            </h3>

            <input type="password" id="export-pass" placeholder="Master Password"
                style="width:100%;padding:12px;margin-bottom:20px;border-radius:12px;">

            <div style="display:flex;justify-content:center;gap:15px;">
                <button id="cancel-export">CANCEL</button>
                <button id="confirm-export">EXPORT</button>
            </div>

        </div>
    `;

    document.body.appendChild(overlay);

    document.getElementById('cancel-export').onclick = () => {
        overlay.remove();
    };

    document.getElementById('confirm-export').onclick = async () => {
        const inputPass = document.getElementById('export-pass').value;

        try {
    const encrypted = localStorage.getItem('bullet_vault');
    await decryptVault(encrypted, inputPass);
} catch (e) {
    bulletAlert("ERROR", "Wrong password.");
    return;
}

        const data = localStorage.getItem('bullet_vault');

        if (!data) {
            bulletAlert("ERROR", "No data.");
            return;
        }

        downloadFile(data, "backup.bullet");

        overlay.remove();
        bulletAlert("EXPORT", "Backup ready!");
    };
}

function importVault() {
    const fileInput = document.getElementById('import-file');

    if (!fileInput.files.length) {
        return bulletAlert("ERROR", "Select a file.");
    }

    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = function(e) {
        const encryptedData = e.target.result;

        openImportModal(encryptedData);
    };

    reader.readAsText(file);
}
function openImportModal(encryptedData) {
    const overlay = document.createElement('div');
    overlay.className = "modal-overlay";

    overlay.innerHTML = `
        <div style="
            background:#050505;
            border-radius:25px;
            padding:50px 40px;
            width:500px;
            border:2px solid #fff;
            box-shadow:0 0 15px #fff,0 0 40px rgba(255,255,255,0.3),inset 0 0 20px rgba(255,255,255,0.05);
            text-align:center;
        ">

            <h3 style="
                color:#fff;
                margin-bottom:30px;
                font-size:1.2rem;
                letter-spacing:4px;
                text-shadow:0 0 10px #fff;
            ">
                IMPORT BACKUP
            </h3>

            <input type="password" id="import-pass" placeholder="Master Password"
                style="
                    width:90%;
                    padding:15px;
                    border-radius:20px;
                    border:1px solid rgba(255,255,255,0.15);
                    background:rgba(255,255,255,0.05);
                    color:#fff;
                    outline:none;
                    margin:0 auto 30px auto;
                    display:block;
                ">

            <div style="display:flex;justify-content:center;gap:20px;">
                <button id="cancel-import">CANCEL</button>
                <button id="confirm-import">IMPORT</button>
            </div>

        </div>
    `;

    document.body.appendChild(overlay);

    document.getElementById('cancel-import').onclick = () => overlay.remove();

    document.getElementById('confirm-import').onclick = async () => {
        const inputPass = document.getElementById('import-pass').value;

        try {
            const encrypted = localStorage.getItem('bullet_vault');
            await decryptVault(encrypted, inputPass);
        } catch (e) {
            bulletAlert("ERROR", "Wrong password.");
            return;
        }

        try {
            await loadCryptoKey(inputPass);
            const vault = await decryptVault(encryptedData, inputPass);

            if (!Array.isArray(vault) || vault.some(v => !v.id || !v.user)) {
    throw new Error("Invalid vault structure");
}

            localStorage.setItem('bullet_vault', encryptedData);
            cachedVault = null;
            currentMasterPass = inputPass;
            await loadCryptoKey(inputPass);
            await loadVault();
            overlay.remove();
            bulletAlert("SUCCESS", "Backup imported!");

        } catch (err) {
            bulletAlert("ERROR", "Invalid password or corrupted file.");
        }
    };
}


function triggerImport() {
    document.getElementById('import-file').click();
}

async function checkPasswordPwned(password) {
    try {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);

        const hashBuffer = await crypto.subtle.digest("SHA-1", data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("").toUpperCase();

        const prefix = hash.slice(0, 5);
        const suffix = hash.slice(5);

        const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
        const text = await res.text();

        return text.includes(suffix);
    } catch (e) {
        return null;
    }
}
if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js")
        .catch(err => console.error("SW error:", err));
}

// ============================================
// EXPORT — Compatible iOS + Desktop
// ============================================
function downloadFile(content, filename) {
    const blob = new Blob([content], { type: 'application/json' });

    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

    if (isIOS) {
        const reader = new FileReader();
        reader.onload = function () {
            const dataUrl = reader.result;

            const a = document.createElement('a');
            a.href = dataUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            // fallback iOS
            setTimeout(() => {
                window.open(dataUrl, '_blank');
            }, 300);
        };
        reader.readAsDataURL(blob);
    } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
}
function logout() {
    currentMasterPass = null; // 🔐 wipe mémoire
    localStorage.removeItem("isLogged");
    localStorage.removeItem("masterPass");
    window.location.href = "login.html";
}
async function checkMasterPassword() {

    const nickname = document.getElementById("nickname").value;
    const password = document.getElementById("master-password").value;

    if (!nickname || !password) return;

    const isFirstLaunch = !localStorage.getItem("bullet_vault");

    try {

        if (isFirstLaunch) {
            // 🆕 créer vault vide
            const emptyVault = [];

            const encrypted = await encryptVault(emptyVault, password);
            localStorage.setItem("bullet_vault", encrypted);

            
        } else {
            // 🔐 vérifier mot de passe
            await decryptVault(localStorage.getItem("bullet_vault"), password);
        }

        // ✅ session
        localStorage.setItem("isLogged", "true");

        const remember = document.getElementById("remember-me").checked;

        if (remember) {
            localStorage.setItem("masterPass", password);
        } else {
            sessionStorage.setItem("masterPass", password);
        }

        // 🔥 CRUCIAL
        window.currentMasterPass = password;

        await loadCryptoKey(password);

        // 🎬 transition UI
        document.getElementById("login-screen").classList.add("hidden-login");

        setTimeout(() => {
            document.getElementById("login-screen").style.display = "none";
            document.querySelector(".app-wrap").style.display = "flex";
        }, 400);

        // 📦 load data
        loadVault();

    } catch (e) {

        const err = document.getElementById("login-error");
        err.style.display = "block";

        setTimeout(() => {
            err.style.display = "none";
        }, 2500);
    }
}