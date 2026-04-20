let deferredPrompt = null;
// Toujours afficher le login au démarrage — le mot de passe est toujours requis
document.getElementById("login-screen").style.display = "flex";
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;

    console.log("Install prompt prêt");

    // afficher le bouton
    const btn = document.getElementById("install-btn");
    if (btn) btn.style.display = "block";
});
const pwnedCache = {};
let currentMasterPass = "";
let cryptoKey = null;


window.onload = () => {
    updateLoginUI();
};

async function checkMasterPassword() {
    const nickInput = document.getElementById('nickname').value;
    const passInput = document.getElementById('master-password').value;
    const errorMsg = document.getElementById('login-error');

    if (!localStorage.getItem('bullet_setup_done')) {

        if (nickInput.length < 3 || passInput.length < 4) {
            bulletAlert("ACCESS DENIED", "Nickname or password too short.");
            return;
        }


        localStorage.setItem('bullet_setup_done', 'true');
        localStorage.setItem('bullet_nick', nickInput);

        // 🔥 on crée un vault vide chiffré
        const emptyVault = [];
        const encrypted = await encryptVault(emptyVault, passInput);
        localStorage.setItem('bullet_vault', encrypted);


        bulletAlert("ARSENAL CREATED", "Your vault has been created successfully.");

        currentMasterPass = passInput;
        unlockApp(); // 🔥 ENTRE DIRECT DANS L'APP
        return;      // 🔥 évite double exécution
    } 
    else {
        try {
            const encrypted = localStorage.getItem('bullet_vault');

            // 🔥 test du mot de passe en déchiffrant
            await decryptVault(encrypted, passInput);

            currentMasterPass = passInput;
            unlockApp();

        } catch (e) {
            errorMsg.style.display = "block";
            document.getElementById('master-password').value = "";
        }
    }
}


document.addEventListener('keydown', (e) => {
    const loginScreen = document.getElementById('login-screen');
    if (e.key === 'Enter' && !loginScreen.classList.contains('hidden-login')) {
        checkMasterPassword();
    }
});

// ==========================================
// 2. NAVIGATION
// ==========================================
function showSection(sectionId) {
    const sections = ['generator-view', 'vault-view', 'backup-view', 'about-view', 'settings-view'];
    const buttons = ['btn-generator', 'btn-vault', 'btn-backup', 'btn-about', 'btn-settings'];

    sections.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });

    buttons.forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.classList.remove('active');
    });

    const target = document.getElementById(sectionId + '-view');
    if (target) target.style.display = 'flex';

    const activeBtn = document.getElementById('btn-' + sectionId);
    if (activeBtn) activeBtn.classList.add('active');

    if (sectionId === 'vault') {
        setTimeout(() => {
            loadVault();
        }, 0);
    }
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
async function addEntryToVault() {
    const url = document.getElementById('vault-site').value;
    const user = document.getElementById('vault-user').value;
    const pass = document.getElementById('vault-pass').value;

    if (!url || !user || !pass) {
        bulletAlert("ERROR", "Please fill all fields!");
        return;
    }

    const domain = getDomainName(url);

    const entry = { 
        id: Date.now(), 
        url: url.toLowerCase(), 
        domain: domain,
        user: user, 
        pass: pass,
        logo: `https://www.google.com/s2/favicons?sz=64&domain=${url}`
    };

    let vault = await getVault();
    vault.push(entry);

    const encrypted = await encryptVault(vault, currentMasterPass);
    localStorage.setItem('bullet_vault', encrypted);

    cachedVault = null; // 🔥 IMPORTANT

    // reset champs
    document.getElementById('vault-site').value = '';
    document.getElementById('vault-user').value = '';
    document.getElementById('vault-pass').value = '';

    loadVault();
}
// ==========================================
// 4. LOGIQUE DU COFFRE (VAULT)
// ==========================================

function getDomainName(url) {
    try {
        let domain = url.replace('https://', '').replace('http://', '').split('/')[0];
        domain = domain.replace('www.', '');
        return domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1);
    } catch(e) { return url; }
}
let isRefreshing = false;

async function loadVault() {
    const container = document.getElementById('vault-list');
    const searchVal = document.getElementById('vault-search')?.value.toLowerCase() || "";
    let vault = await getVault();

    if (!Array.isArray(vault)) vault = [];

    // 🔥 filtre
    const filteredVault = vault.filter(item =>
        item.domain.toLowerCase().includes(searchVal) ||
        item.user.toLowerCase().includes(searchVal)
    );

    if (filteredVault.length === 0) {
        container.innerHTML = `<p style="color: var(--text-dim); text-align: center; margin-top: 20px;">No bullets found...</p>`;
        return;
    }

    // 🔥 group
    const groups = {};
    filteredVault.forEach(item => {
        if (!groups[item.domain]) groups[item.domain] = [];
        groups[item.domain].push(item);
    });

    const fragment = document.createDocumentFragment();

    for (const [domain, accounts] of Object.entries(groups)) {

        const groupDiv = document.createElement('div');
        groupDiv.style = "background: #0d0d0f; border-radius: 15px; border: 1px solid var(--metal-border); margin-bottom: 20px; width:100%;";

        groupDiv.innerHTML = `
            <div style="background: rgba(255,255,255,0.03); padding: 12px 20px; display: flex; align-items: center; gap: 15px; border-bottom: 1px solid var(--metal-border); border-top-left-radius:15px; border-top-right-radius:15px;">
                <img src="${accounts[0].logo}" style="width: 20px; height: 20px;">
                <span style="font-weight: 900;">${domain}</span>
                <span style="margin-left:auto;">${accounts.length}</span>
            </div>

            <div style="overflow:hidden; border-bottom-left-radius:15px; border-bottom-right-radius:15px;">
                <div id="list-${domain}"></div>
            </div>
        `;

        const listContent = groupDiv.querySelector(`#list-${domain}`);
        const subFragment = document.createDocumentFragment();

        for (const acc of accounts) {

            const accDiv = document.createElement('div');
            accDiv.style = "display: flex; justify-content: space-between; align-items: center; padding: 12px 20px; border-bottom: 1px solid rgba(255,255,255,0.02); cursor: pointer; transition: 0.2s;";

            accDiv.onclick = (e) => {
                if (e.target.tagName !== 'BUTTON' && e.target.tagName !== 'I') {
                    openEditTile(acc.id);
                }
            };

            // 🔐 PWNED (NON BLOQUANT)
            let status = pwnedCache[acc.pass] || "⏳ Checking...";

            if (!pwnedCache[acc.pass]) {
                setTimeout(async () => {
                    try {
                        const isPwned = await checkPasswordPwned(acc.pass);

                        const newStatus = isPwned
                            ? "⚠️ Compromised"
                            : "✅ Secure";

                        pwnedCache[acc.pass] = newStatus;

                        // 🔥 évite spam refresh
                        if (!isRefreshing) {
                            isRefreshing = true;
                            requestAnimationFrame(() => {
                                loadVault();
                                isRefreshing = false;
                            });
                        }

                    } catch (err) {
                        console.log("Pwned error:", err);
                        pwnedCache[acc.pass] = "⚠️ Unknown";
                    }
                }, 0);
            }

            accDiv.innerHTML = `
                <div style="text-align: left;">
                    <div style="color: #fff; font-size: 0.85rem; font-weight: 600;">${acc.user}</div>
                    <div style="color: var(--text-dim); font-size: 0.7rem; font-family: monospace;">••••••••</div>
                    <div style="font-size:0.7rem;margin-top:4px;">
                        <span style="color:${status.includes('⚠️') ? '#ff453a' : '#00ff88'}; font-weight:600;">
                            ${status}
                        </span>
                    </div>
                </div>

                <div style="display: flex; gap: 15px; align-items: center;">
                    <button onclick="copyVaultPass('${acc.pass}')" style="background: none; border: none; color: #666; cursor: pointer;">
                        <i class="fa-regular fa-copy"></i>
                    </button>
                    <button onclick="deleteVaultEntry(${acc.id})" style="background: none; border: none; color: #ff453a; cursor: pointer;">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
            `;

            subFragment.appendChild(accDiv);
        }

        listContent.appendChild(subFragment);
        fragment.appendChild(groupDiv);
    }

    container.innerHTML = "";
    container.appendChild(fragment);
}
// ==========================================
// 5. SYSTÈME DE MODIFICATION (TILE)
// ==========================================

async function openEditTile(id) {
    const vault = await getVault();
    const acc = vault.find(item => item.id === id);
    if(!acc) return;

    // 🔥 1. ON AFFICHE DIRECT (instantané)
    const overlay = document.createElement('div');
    overlay.id = "edit-overlay";
    overlay.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); display:flex; justify-content:center; align-items:center; z-index:10000; backdrop-filter: blur(5px); animation: fadeIn 0.2s ease;";
    
    overlay.innerHTML = `
        <div class="gen-card" style="width: 380px; padding: 25px; background: #0d0d0f; border: 1px solid var(--metal-border); border-radius: 20px; text-align: left; animation: popupIn 0.2s ease;">
            <div style="display:flex; align-items:center; gap:15px; margin-bottom: 20px;">
                <img src="${acc.logo}" style="width:28px; height:28px; border-radius:5px;">
                <h2 style="margin:0; font-size:1rem; text-transform:uppercase;">To modify ${acc.domain}</h2>
            </div>

            <label style="font-size:0.65rem; color:var(--text-dim); font-weight:bold;">IDENTIFIER</label>
            <input type="text" id="edit-user" value="${acc.user}" style="width:95%; background:#1c1c1e; border:1px solid #3a3a3c; padding:10px; border-radius:10px; color:white; margin: 8px 0 15px 0; outline:none; font-size:0.9rem;">

            <label style="font-size:0.65rem; color:var(--text-dim); font-weight:bold;">PASSWORD</label>
            <div style="position:relative;">
                <input type="password" id="edit-pass" value="••••••••" style="width:95%; background:#1c1c1e; border:1px solid #3a3a3c; padding:10px; border-radius:10px; color:white; margin: 8px 0 20px 0; outline:none; font-size:0.9rem;">
                <i class="fa-solid fa-eye" onclick="togglePassView()" style="position:absolute; right:10px; top:20px; color:#555; cursor:pointer;"></i>
            </div>

            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
                <button onclick="closeEditTile()" style="padding:10px; background:#1c1c1e; color:white; border:none; border-radius:10px; cursor:pointer; font-weight:bold; font-size:0.8rem;">CANCEL</button>
                <button onclick="saveVaultEntry(${acc.id})" class="btn-neon">Save</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    // 🔐 2. DÉCHIFFRE APRÈS (asynchrone)
    const input = document.getElementById('edit-pass');
    if (input) input.value = acc.pass;
}

function togglePassView() {
    const p = document.getElementById('edit-pass');
    p.type = p.type === "password" ? "text" : "password";
}

function closeEditTile() {
    const overlay = document.getElementById('edit-overlay');
    if(overlay) overlay.remove();
}

async function saveVaultEntry(id) {

    if (!currentMasterPass) {
        bulletAlert("ERROR", "Session expired. Please login again.");
        return;
    }

    const newUser = document.getElementById('edit-user').value;
    const newPass = document.getElementById('edit-pass').value;

    let vault = await getVault();
    const index = vault.findIndex(item => item.id === id);
    
    if (index !== -1) {
        vault[index].user = newUser;
        vault[index].pass = newPass;

        const encrypted = await encryptVault(vault, currentMasterPass);
        localStorage.setItem('bullet_vault', encrypted);

        cachedVault = null; // 🔥 IMPORTANT

        closeEditTile();
        loadVault();
    }
}

// ==========================================
// 6. ACTIONS GLOBALES & PARAMÈTRES
// ==========================================

function copyVaultPass(password) {
    navigator.clipboard.writeText(password);

    const notification = document.createElement('div');
    notification.innerText = "Copied to clipboard";
    notification.style = "position:fixed;bottom:30px;left:50%;transform:translateX(-50%);background:#fff;color:#000;padding:10px 20px;border-radius:20px;font-weight:900;font-size:0.75rem;letter-spacing:1px;z-index:11000;box-shadow:0 0 10px rgba(255,255,255,0.6),0 0 20px rgba(255,255,255,0.3);";
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 2000);
}

async function deleteVaultEntry(id) {
    const overlay = document.createElement('div');
    overlay.className = "modal-overlay";

    overlay.innerHTML = `
        <div style="background:#050505;border-radius:25px;padding:50px 40px;width:500px;border:2px solid #fff;box-shadow:0 0 15px #fff,0 0 40px rgba(255,255,255,0.3),inset 0 0 20px rgba(255,255,255,0.05);text-align:center;">

            <h3 style="color:#fff;margin-bottom:30px;font-size:1.2rem;letter-spacing:4px;text-shadow:0 0 10px #fff;">
                DELETE ?
            </h3>

            <div style="background:rgba(255,255,255,0.05);border-radius:20px;padding:20px;margin-bottom:30px;border:1px solid rgba(255,255,255,0.1);color:#ccc;">
                Are you sure you want to remove this bullet? ?
            </div>

            <div style="display:flex;justify-content:center;gap:20px;">
                <button id="cancel-delete" style="
                    background:#1a1a1a;
                    color:#aaa;
                    border:1px solid rgba(255,255,255,0.2);
                    padding:12px 25px;
                    border-radius:12px;
                    font-weight:900;
                    cursor:pointer;
                ">
                    CANCEL
                </button>

                <button id="confirm-delete" style="
                    background:#fff;
                    color:#000;
                    border:none;
                    padding:12px 25px;
                    border-radius:12px;
                    font-weight:900;
                    cursor:pointer;
                    box-shadow:0 0 10px rgba(255,255,255,0.6);
                ">
                    DELETE
                </button>
            </div>

        </div>
    `;

    document.body.appendChild(overlay);

    // ❌ Annuler
    document.getElementById('cancel-delete').onclick = () => overlay.remove();

    // ✅ Supprimer
    document.getElementById('confirm-delete').onclick = async () => {

    if (!currentMasterPass) {
        bulletAlert("ERROR", "Session expired. Please login again.");
        return;
    }

    let vault = await getVault();
    vault = vault.filter(item => item.id !== id);

    const encrypted = await encryptVault(vault, currentMasterPass);
    localStorage.setItem('bullet_vault', encrypted);

    cachedVault = null; // 🔥 IMPORTANT

    overlay.remove();
    loadVault();
};
}

// ==========================================
// 7. SYSTÈME DE NOTIFICATIONS TACTIQUES
// ==========================================
function bulletAlert(title, message = "", isKey = false) {
    const old = document.getElementById('bullet-modal-container');
    if(old) old.remove();

    const overlay = document.createElement('div');
    overlay.id = 'bullet-modal-container';
    overlay.className = "modal-overlay";

    // Si c'est une clé, on prépare le HTML du bouton de copie
    let keyContent = "";
    if (isKey) {
        keyContent = `
            <div style="margin-bottom: 20px; display: flex; flex-direction: column; align-items: center;">
                <input type="text" id="copy-key-input" value="${title}" readonly 
                    style="width: 260px; background: #000; border: 1px dashed rgba(255,255,255,0.5); color: #fff; padding: 8px 5px; text-align: center; font-family: monospace; font-size: 0.85rem; margin-bottom: 12px; border-radius: 4px; outline: none;">
                <button id="copy-key-btn" style="background: #fff; color: #000; border: none; padding: 6px 15px; border-radius: 2px; font-size: 0.6rem; font-weight: 800; cursor: pointer; text-transform: uppercase; transition: 0.2s;">
                    COPY THE KEY
                </button>
            </div>
        `;
        title = "EMERGENCY KEY"; 
    }

    const messageHTML = message ? `<p style="color: #eee; margin: 0 0 20px 0; font-family: 'Segoe UI', sans-serif; font-size: 0.75rem;">${message}</p>` : "";

    overlay.innerHTML = `
     <div class="custom-modal" style="background:#050505;">

        <h3 style="color:#fff;margin-bottom:30px;font-size:1.4rem;letter-spacing:6px;text-shadow:0 0 10px #fff,0 0 20px rgba(255,255,255,0.6);">
            ${title}
        </h3>

        <div style="background:rgba(255,255,255,0.05);border-radius:20px;padding:25px;margin-bottom:35px;border:1px solid rgba(255,255,255,0.1);font-family:monospace;font-size:0.85rem;color:#ddd;">
            ${keyContent}
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

    // LOGIQUE DE COPIE
    if (isKey) {
        const copyBtn = document.getElementById('copy-key-btn');
        const input = document.getElementById('copy-key-input');
        
        copyBtn.onclick = () => {
            input.select();
            navigator.clipboard.writeText(input.value);
            copyBtn.innerText = "COPIÉ !";
            copyBtn.style.background = "#00ff88"; // Petit flash vert pour confirmer
            setTimeout(() => {
                copyBtn.innerText = "COPIER LA CLÉ";
                copyBtn.style.background = "#fff";
            }, 2000);
        };
    }

    // BOUTON FERMER
    document.getElementById('close-bullet-btn').onclick = () => overlay.remove();
}

let cachedVault = null;

async function getVault() {

    if (!currentMasterPass) {
        console.warn("No master password loaded");
        return [];
    }

    const encrypted = localStorage.getItem("bullet_vault");

    if (!encrypted) return [];

    try {
        const vault = await decryptVault(encrypted, currentMasterPass);

        // 🔥 toujours refresh le cache avec la vraie valeur
        cachedVault = Array.isArray(vault) ? vault : [];

        return cachedVault;

    } catch (e) {
        console.log("Erreur lecture vault", e);
        return [];
    }
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
            // 🔐 charger la clé AES
            await loadCryptoKey(inputPass);

            // 🔓 tenter le déchiffrement
            const vault = await decryptVault(encryptedData, inputPass);

            if (!Array.isArray(vault)) {
                throw new Error("Invalid vault");
            }

            // ✔ sauvegarde
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
            // 🔐 charger la clé AES
            await loadCryptoKey(inputPass);

            // 🔓 tenter le déchiffrement
            const vault = await decryptVault(encryptedData, inputPass);

            if (!Array.isArray(vault)) {
                throw new Error("Invalid vault");
            }

            // ✔ sauvegarde
                  localStorage.setItem('bullet_vault', encryptedData);

cachedVault = null; // 🔥 IMPORTANT

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
document.getElementById('import-file').addEventListener('change', function() {
    const fileName = this.files[0]?.name || "No files selected";
});
        } catch (err) {
            bulletAlert("ERROR", "Invalid password or corrupted file.");
        }
    };
}
document.getElementById('import-file').addEventListener('change', function() {
    const fileName = this.files[0]?.name || "No files selected";
});

function triggerImport() {
    document.getElementById('import-file').click();
}

window.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('import-file');
const remember = localStorage.getItem('bullet_remember');

    

if (remember === "true") {
    const nick = localStorage.getItem('bullet_nick');
    if (nick) {
        document.getElementById('nickname').value = nick;
    }

    const checkbox = document.getElementById('remember-me');
    if (checkbox) checkbox.checked = true;
}

    const checkbox = document.getElementById('remember-me');
    if (checkbox && remember === "true") {
        checkbox.checked = true;
    }

    input.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const fileContent = await file.text();

        // 🔥 popup
        const overlay = document.createElement('div');
        overlay.className = "modal-overlay";

        overlay.innerHTML = `
<div style="
    background:#050505;
    border-radius:25px;
    padding:50px 40px;
    width:450px;
    border:2px solid #fff;
    box-shadow:0 0 15px #fff,0 0 40px rgba(255,255,255,0.3),inset 0 0 20px rgba(255,255,255,0.05);
    text-align:center;
">

    <h3 style="
        color:#fff;
        margin-bottom:25px;
        font-size:1.2rem;
        letter-spacing:4px;
        text-shadow:0 0 10px #fff;
    ">
        CONFIRMATION IMPORT
    </h3>

    <p style="color:#aaa; font-size:0.9rem; margin-bottom:20px;">
        Enter your master password to continue
    </p>

    <input type="password" id="import-pass" placeholder="Master password"
        style="
            width:90%;
            padding:15px;
            border-radius:20px;
            border:1px solid rgba(255,255,255,0.15);
            background:rgba(255,255,255,0.05);
            color:#fff;
            outline:none;
            margin-bottom:30px;
            box-shadow: inset 0 0 10px rgba(255,255,255,0.05);
        ">

    <div style="display:flex;justify-content:center;gap:20px;">
        <button id="cancel-import" style="
            background:#1a1a1a;
            color:#aaa;
            border:1px solid rgba(255,255,255,0.2);
            padding:12px 25px;
            border-radius:12px;
            font-weight:900;
            cursor:pointer;
        ">
            CANCEL
        </button>

        <button id="confirm-import" style="
            background:#fff;
            color:#000;
            border:none;
            padding:12px 25px;
            border-radius:12px;
            font-weight:900;
            cursor:pointer;
            box-shadow:0 0 10px rgba(255,255,255,0.6);
        ">
            IMPORTER
        </button>
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

            localStorage.setItem('bullet_vault', fileContent);
            loadVault();
            document.getElementById('import-file').value = "";

            overlay.remove();
            bulletAlert("SUCCESS", "Backup imported!");

setTimeout(() => {
    const input = document.querySelector('.modal-overlay input');
    if (input) input.remove();
}, 10);
        };
    });
});
// 🔒 INACTIVITÉ
let inactivityTimer;
let isUnlocked = false;

let INACTIVITY_TIME = 2 * 60 * 1000;

function resetInactivityTimer() {
    if (!isUnlocked) return;

    

    clearTimeout(inactivityTimer);

    inactivityTimer = setTimeout(() => {
        lockApp();
    }, INACTIVITY_TIME);
}

// 🎯 événements utilisateur
window.addEventListener('DOMContentLoaded', () => {
    

    loadInactivitySetting();
    setupInactivityInput();

    const events = ['click', 'keydown', 'scroll'];

    events.forEach(event => {
        document.addEventListener(event, resetInactivityTimer);
    });
});
    
// 🔒 LOCK
function lockApp() {
    if (!isUnlocked) return;
    isUnlocked = false;

    const loginScreen = document.getElementById('login-screen');
    loginScreen.style.display = 'flex';
    loginScreen.classList.remove('hidden-login');
    document.getElementById('master-password').value = "";
 
    currentMasterPass = null; // 🔐 wipe mémoire

    updateLoginUI();

    bulletAlert("SECURITY", "Session locked due to inactivity.");
}

// 🔓 UNLOCK (MODIFIE TA FONCTION EXISTANTE)
async function unlockApp() {
    const checkbox = document.querySelector('#remember-me');
    const remember = checkbox ? checkbox.checked : false;

    currentMasterPass = document.getElementById('master-password').value; 
    await loadCryptoKey(currentMasterPass);
    if (remember) {
        localStorage.setItem('bullet_remember', "true");
    } else {
        localStorage.setItem('bullet_remember', "false");
    }

    const loginScreen = document.getElementById('login-screen');
    loginScreen.classList.add('hidden-login');
    setTimeout(() => { loginScreen.style.display = 'none'; }, 600);

    // 🔥 CRUCIAL POUR LE LOCK
    isUnlocked = true;
    resetInactivityTimer();

    setTimeout(() => {
        showSection('generator');
        loadVault();
    }, 600);
}
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
window.addEventListener('DOMContentLoaded', () => {
    loadInactivitySetting();
    setupInactivityInput();
});
async function deriveKey(password, salt) {
    const enc = new TextEncoder();

    const keyMaterial = await crypto.subtle.importKey(
        "raw",
        enc.encode(password),
        "PBKDF2",
        false,
        ["deriveKey"]
    );

    return crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: salt,
            iterations: 100000,
            hash: "SHA-256"
        },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
    );
}
function generateSalt() {
    return crypto.getRandomValues(new Uint8Array(16));
}
async function loadCryptoKey(password) {
    const saltStored = JSON.parse(localStorage.getItem('bullet_salt'));
    const salt = new Uint8Array(saltStored);

    cryptoKey = await deriveKey(password, salt);
}
async function encryptVault(vault, password) {
    const salt = generateSalt();
    const iv = generateIV();

    const key = await deriveKey(password, salt);

    const enc = new TextEncoder();
    const data = enc.encode(JSON.stringify(vault));

    const encrypted = await crypto.subtle.encrypt(
        {
            name: "AES-GCM",
            iv: iv
        },
        key,
        data
    );

    return JSON.stringify({
        salt: toBase64(salt),
        iv: toBase64(iv),
        data: toBase64(encrypted)
    });
}
async function decryptVault(encryptedData, password) {
    const parsed = JSON.parse(encryptedData);

    const salt = fromBase64(parsed.salt);
    const iv = fromBase64(parsed.iv);
    const data = fromBase64(parsed.data);

    const key = await deriveKey(password, salt);

    const decrypted = await crypto.subtle.decrypt(
        {
            name: "AES-GCM",
            iv: iv
        },
        key,
        data
    );

    const dec = new TextDecoder();
    return JSON.parse(dec.decode(decrypted));
}
function renderVault(vault) {
    const container = document.getElementById("vault");
    const fragment = document.createDocumentFragment();

    vault.forEach(entry => {
        const div = document.createElement("div");

        div.innerHTML = `
            <b>${entry.domain || entry.url}</b><br>
            ${entry.user}
        `;

        fragment.appendChild(div);
    });

    container.innerHTML = "";
    container.appendChild(fragment);
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
        console.log("Pwned API error:", e);
        return null;
    }
}
if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js")
        .then(() => console.log("SW enregistré"))
        .catch(err => console.log("SW erreur", err));
}
async function installApp() {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();

    const choice = await deferredPrompt.userChoice;
    console.log("Choix utilisateur:", choice);

    deferredPrompt = null;

    // cacher bouton après
    const btn = document.getElementById("install-btn");
    if (btn) btn.style.display = "none";
}
function updateLoginUI() {
    const hasAccount = localStorage.getItem('bullet_setup_done');
    const btn = document.getElementById('unlock-btn');
    const warning = document.getElementById('setup-warning');

    if (!hasAccount) {
        btn.innerText = "CREATE MY ARSENAL";
        btn.style.background = "#ffffff";
        btn.style.color = "#000";
        if (warning) warning.style.display = "block";
    } else {
        btn.innerText = "SIGN IN";
        btn.style.background = "";
        btn.style.color = "";
        if (warning) warning.style.display = "none";
    }
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