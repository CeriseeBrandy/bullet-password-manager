

document.addEventListener("DOMContentLoaded", () => {
  const isElectron = navigator.userAgent.toLowerCase().includes('electron');

  

  if (isElectron) {
  document.body.classList.add('electron');

  // 🔥 SUPPRIME LA NAVBAR DU LOGIN / SITE
  document.querySelector('.landing-nav')?.remove();

  // 🔥 SUPPRIME LE BOUTON PWA
  document.querySelector('.install-btn')?.remove();
}
});
const pwnedCache = {};
function showSection(name) {

    document.querySelectorAll('.view-section').forEach(sec => {
        sec.style.display = "none";
        sec.classList.remove("active");
    });

    const target = document.getElementById(name + "-view");

    if (target) {
        target.style.display = "block";
        target.classList.add("active");
    }

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
// EDIT TILE (MODAL)
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
// COPY PASSWORD (VAULT)
// ==========================================
function copyVaultPass(password) {
    navigator.clipboard.writeText(password);

    const notification = document.createElement('div');
    notification.innerText = "COPIED";
    notification.style = `
        position:fixed;
        bottom:30px;
        left:50%;
        transform:translateX(-50%);
        background:#fff;
        color:#000;
        padding:10px 20px;
        border-radius:20px;
        font-weight:900;
        font-size:0.75rem;
        z-index:11000;
    `;

    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 1500);
}


// ==========================================
// ALERT MODAL
// ==========================================
function bulletAlert(title, message = "") {

    const old = document.getElementById('bullet-modal-container');
    if (old) old.remove();

    const overlay = document.createElement('div');
    overlay.id = 'bullet-modal-container';
    overlay.className = "modal-overlay";

    overlay.innerHTML = `
        <div class="custom-modal">
            <h3>${title}</h3>
            <p>${message}</p>

            <div class="modal-actions">
                <button id="confirm-bullet-btn">OK</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    document.getElementById('confirm-bullet-btn').onclick = () => overlay.remove();
}


// ==========================================
// RESET APP
// ==========================================
function resetApplication() {

    const overlay = document.createElement('div');
    overlay.className = "modal-overlay";

    overlay.innerHTML = `
        <div class="custom-modal">
            <h3>RESET</h3>
            <p>This will delete ALL data</p>

            <div class="modal-actions">
                <button id="cancel-reset">CANCEL</button>
                <button id="confirm-reset">RESET</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    document.getElementById('cancel-reset').onclick = () => overlay.remove();

    document.getElementById('confirm-reset').onclick = () => {
        localStorage.clear();
        location.reload();
    };
}


// ==========================================
// EXPORT
// ==========================================
function exportVault() {

    const data = localStorage.getItem('bullet_vault');

    if (!data) {
        bulletAlert("ERROR", "No data");
        return;
    }

    downloadFile(data, "backup.bullet");
    bulletAlert("EXPORT", "Backup ready");
}


// ==========================================
// IMPORT
// ==========================================
function importVault() {

    const fileInput = document.getElementById('import-file');

    if (!fileInput.files.length) {
        return bulletAlert("ERROR", "Select a file");
    }

    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = function(e) {
        localStorage.setItem('bullet_vault', e.target.result);
        cachedVault = null;
        loadVault();
        bulletAlert("SUCCESS", "Imported");
    };

    reader.readAsText(file);
}


// ==========================================
// DOWNLOAD FILE
// ==========================================
function downloadFile(content, filename) {
    const blob = new Blob([content], { type: 'application/json' });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');

    a.href = url;
    a.download = filename;

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTimeout(() => URL.revokeObjectURL(url), 1000);
}


// ==========================================
// LOGOUT
// ==========================================
function logout() {
    window.currentMasterPass = null;

    localStorage.removeItem("isLogged");
    localStorage.removeItem("masterPass");

    window.location.href = "login.html";
}


// ==========================================
// PWNED CHECK (OPTIONAL)
// ==========================================
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

    } catch {
        return null;
    }
}