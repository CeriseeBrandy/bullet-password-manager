const requestIdleCallback = window.requestIdleCallback || function (cb) {
    return setTimeout(cb, 200);
};
let isVaultLoading = false;
window.cachedVault = null;
let isRefreshing = false;
async function addEntryToVault() {
    const url = document.getElementById('vault-site').value;
    const user = document.getElementById('vault-user').value;
    const password = document.getElementById('vault-pass').value;

    if (!url || !user || !password) return;

    const domain = getDomainName(url);

    const entry = { 
        id: Date.now(), 
        url: url.toLowerCase(), 
        domain: domain,
        user: user, 
        pass: password,
        logo: `https://www.google.com/s2/favicons?sz=64&domain=${url}`
    };

    let vault = await getVault();
    vault.push(entry);

    const masterPass = window.currentMasterPass;

    const encrypted = await encryptVault(vault, masterPass);

    localStorage.setItem('bullet_vault', encrypted);

    cachedVault = null;

    document.getElementById('vault-site').value = '';
    document.getElementById('vault-user').value = '';
    document.getElementById('vault-pass').value = '';

    loadVault();
}



async function getVault() {
  try {
    const encrypted = localStorage.getItem('bullet_vault');

    // 👉 aucun coffre
    if (!encrypted) {
      
      return [];
    }

    // 👉 récup mot de passe session
    const pass = sessionStorage.getItem("masterPass");

    if (!pass) {
      console.warn("No master password in session");
      return [];
    }

    // 👉 déchiffrement
    const vault = await decryptVault(encrypted, pass);

    // 👉 sécurité
    if (!Array.isArray(vault)) {
      console.error("Vault corrupted");
      return [];
    }

    return vault;

  } catch (e) {
    console.error("getVault error:", e);
    return [];
  }
}

async function saveVaultEntry(id) {

    const pass = window.currentMasterPass;

    if (!pass) {
        bulletAlert("ERROR", "Session expired.");
        return;
    }

    const newUser = document.getElementById('edit-user').value;
    const newPass = document.getElementById('edit-pass').value;

    let vault = cachedVault || await getVault();
    const index = vault.findIndex(item => item.id === id);
    
    if (index !== -1) {
        vault[index].user = newUser;
        vault[index].pass = newPass;

        const encrypted = await encryptVault(vault, pass);
        localStorage.setItem('bullet_vault', encrypted);

        cachedVault = null;

        closeEditTile();
        loadVault();
    }
}
function getDomainName(url) {
    try {
        let domain = url.replace('https://', '').replace('http://', '').split('/')[0];
        domain = domain.replace('www.', '');
        return domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1);
    } catch(e) { return url; }
}
async function deleteVaultEntry(id) {

    const overlay = document.createElement('div');
    overlay.className = "modal-overlay";

    overlay.innerHTML = `
        <div style="background:#050505;border-radius:25px;padding:40px;width:400px;text-align:center;border:2px solid #fff;">

            <h3 style="color:#fff;margin-bottom:20px;letter-spacing:3px;">
                DELETE ?
            </h3>

            <p style="color:#aaa;margin-bottom:25px;">
                Are you sure you want to remove this entry?
            </p>

            <div style="display:flex;gap:15px;justify-content:center;">
                <button id="cancel-delete" style="background:#222;color:#aaa;padding:10px 20px;border-radius:10px;border:none;">
                    CANCEL
                </button>

                <button id="confirm-delete" style="background:#fff;color:#000;padding:10px 20px;border-radius:10px;border:none;font-weight:900;">
                    DELETE
                </button>
            </div>

        </div>
    `;

    document.body.appendChild(overlay);

    // ❌ Cancel
    document.getElementById('cancel-delete').onclick = () => overlay.remove();

    // ✅ Confirm
    document.getElementById('confirm-delete').onclick = async () => {

        const masterPass = window.currentMasterPass;

        if (!masterPass) {
            bulletAlert("ERROR", "Session expired.");
            return;
        }

        let vault = await getVault();

        // 🔥 remove entry
        vault = vault.filter(item => item.id !== id);

        // 🔐 re-encrypt vault
        const encrypted = await encryptVault(vault, masterPass);

        localStorage.setItem('bullet_vault', encrypted);

        cachedVault = null;

        overlay.remove();

        // 🔄 refresh UI
        loadVault();
    };
}