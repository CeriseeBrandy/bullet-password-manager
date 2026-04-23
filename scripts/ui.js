function _patchPwnedStatus(passId, status) {
  document.querySelectorAll(`[data-pass-id="${passId}"]`).forEach(el => {
    el.textContent =
      status === 'safe'   ? '✓ Secure' :
      status === 'danger' ? '⚠ Compromised' :
                            '· Checking…';

    el.className = 'entry-status ' + status;
  });
}
let _vaultSnapshot = null;
function _syncSnapshot(vault) {
  _vaultSnapshot = Array.isArray(vault) ? vault : null;
}
function toggleSlideNav() {
  const nav = document.getElementById('slide-nav');
  const ov  = document.getElementById('slide-nav-overlay');
  const btn = document.getElementById('hamburger-btn');
  if (nav.classList.contains('open')) {
    closeSlideNav();
  } else {
    nav.classList.add('open');
    ov.classList.add('visible');
    btn.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
}

function closeSlideNav() {
  document.getElementById('slide-nav').classList.remove('open');
  document.getElementById('slide-nav-overlay').classList.remove('visible');
  document.getElementById('hamburger-btn').classList.remove('open');
  document.body.style.overflow = '';
}

/* Swipe gauche pour fermer */
(function () {
  let sx = 0;
  const nav = document.getElementById('slide-nav');
  nav.addEventListener('touchstart', e => { sx = e.touches[0].clientX; }, { passive: true });
  nav.addEventListener('touchend',   e => {
    if (sx - e.changedTouches[0].clientX > 60) closeSlideNav();
  }, { passive: true });
})();

/* =========================================================
   SECTION NAVIGATION
   Override showSection() d'app.js pour :
   - corriger le bug d'affichage (style.display vs classList)
   - syncer sidebar + slide nav mobile + topbar title
========================================================= */
(function () {
  const _orig = window.showSection;

  window.showSection = function (name) {
    /* 1. Masquer toutes les sections proprement */
    ['generator', 'vault', 'backup', 'about', 'settings'].forEach(id => {
      const el = document.getElementById(id + '-view');
      if (el) { el.classList.remove('active'); el.style.display = ''; }
    });

    /* 2. Logique métier originale (chargement vault, etc.) */
    if (typeof _orig === 'function') _orig(name);

    /* 3. Afficher la bonne section via classe */
    const target = document.getElementById(name + '-view');
    if (target) {
      target.style.display = '';
      target.classList.add('active');
    }

    /* 4. Sidebar desktop */
    document.querySelectorAll('.s-item').forEach(el => el.classList.remove('active'));
    const desk = document.getElementById('btn-' + name);
    if (desk) desk.classList.add('active');

    /* 5. Slide nav mobile */
    document.querySelectorAll('.slide-nav-item').forEach(el => el.classList.remove('active'));
    const mob = document.getElementById('mob-btn-' + name);
    if (mob) mob.classList.add('active');

    /* 6. Topbar title */
    const titles = {
      generator: 'Generator',
      vault:     'Vault',
      backup:    'Backup',
      about:     'Security',
      settings:  'Settings'
    };
    const tb = document.getElementById('topbar-title');
    if (tb) tb.textContent = titles[name] || name;
  };

  /* Assurer que le generator est visible au chargement */
  window.addEventListener('load', () => {
    const gen = document.getElementById('generator-view');
    if (gen) { gen.style.display = ''; gen.classList.add('active'); }
  });
})();

/* =========================================================
   HELPER — constructeur de modals
========================================================= */
function _modal(id, html) {
  const old = document.getElementById(id);
  if (old) old.remove();
  const o = document.createElement('div');
  o.id        = id;
  o.className = 'modal-overlay';
  o.innerHTML = html;
  document.body.appendChild(o);
  return o;
}

/* =========================================================
   HELPER — récupère le master password
   Priorité : window.currentMasterPass > localStorage
========================================================= */
function _getMasterPass() {
  return window.currentMasterPass || localStorage.getItem('masterPass') || null;
}

/* =========================================================
   OVERRIDE — exportVault
========================================================= */
window.exportVault = function () {
  const o = _modal('export-modal', `
    <div class="custom-modal">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px;">
        <div style="width:40px;height:40px;background:rgba(255,255,255,.05);border:.5px solid var(--border);border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          <i class="fa-solid fa-file-arrow-down" style="font-size:16px;color:var(--text-dim);"></i>
        </div>
        <div>
          <h3 style="margin:0;font-size:1rem;letter-spacing:3px;">EXPORT BACKUP</h3>
          <div style="font-size:11px;color:var(--text-faint);margin-top:3px;font-weight:300;">Confirm your master password</div>
        </div>
      </div>
      <div style="padding:14px 16px;background:rgba(255,255,255,.03);border:.5px solid var(--border);border-radius:var(--radius-md);margin-bottom:20px;font-size:12px;font-weight:300;color:var(--text-dim);line-height:1.7;">
        Your vault will be exported as an AES-256 encrypted
        <span style="font-family:'Space Mono',monospace;font-size:10px;color:rgba(255,255,255,.35);">.bullet</span> file.
        Enter your master password to confirm.
      </div>
      <div style="position:relative;margin-bottom:20px;">
        <span style="position:absolute;left:15px;top:50%;transform:translateY(-50%);color:var(--text-faint);font-size:12px;pointer-events:none;"><i class="fa-solid fa-lock"></i></span>
        <input type="password" id="export-pass" placeholder="Master Password"
          style="width:100%;background:rgba(255,255,255,.04);border:.5px solid var(--border);padding:13px 16px 13px 40px;border-radius:var(--radius-md);color:var(--text);font-family:'DM Sans',sans-serif;font-size:13px;outline:none;transition:border-color .2s;margin:0;">
      </div>
      <div class="modal-actions">
        <button class="btn-ghost" id="exp-cancel" style="flex:1;">Cancel</button>
        <button class="btn-white" id="exp-confirm" style="flex:1;"><i class="fa-solid fa-file-export" style="margin-right:8px;"></i>Export</button>
      </div>
    </div>`);

  o.querySelector('#exp-cancel').onclick = () => o.remove();
  o.querySelector('#exp-confirm').onclick = async () => {
    const p = o.querySelector('#export-pass').value;
    try {
      await decryptVault(localStorage.getItem('bullet_vault'), p);
    } catch {
      bulletAlert('ACCESS DENIED', 'Wrong master password.');
      return;
    }
    const data = localStorage.getItem('bullet_vault');
    if (!data) { bulletAlert('ERROR', 'No vault data found.'); return; }
    downloadFile(data, 'backup.bullet');
    o.remove();
    bulletAlert('EXPORT COMPLETE', 'Your backup has been downloaded.');
  };
};

/* =========================================================
   OVERRIDE — openImportModal
========================================================= */
window.openImportModal = function (encryptedData) {
  const o = _modal('import-modal', `
    <div class="custom-modal">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px;">
        <div style="width:40px;height:40px;background:rgba(255,255,255,.05);border:.5px solid var(--border);border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          <i class="fa-solid fa-file-arrow-up" style="font-size:16px;color:var(--text-dim);"></i>
        </div>
        <div>
          <h3 style="margin:0;font-size:1rem;letter-spacing:3px;">IMPORT BACKUP</h3>
          <div style="font-size:11px;color:var(--text-faint);margin-top:3px;font-weight:300;">Restore from file</div>
        </div>
      </div>
      <div style="padding:14px 16px;background:rgba(255,204,0,.04);border:.5px solid rgba(255,204,0,.15);border-radius:var(--radius-md);margin-bottom:20px;">
        <div style="display:flex;align-items:flex-start;gap:10px;">
          <i class="fa-solid fa-triangle-exclamation" style="color:rgba(255,204,0,.6);font-size:12px;margin-top:2px;flex-shrink:0;"></i>
          <span style="font-size:12px;font-weight:300;color:rgba(255,204,0,.65);line-height:1.6;">This will replace your current vault. Enter the master password of the backup file to proceed.</span>
        </div>
      </div>
      <div style="position:relative;margin-bottom:20px;">
        <span style="position:absolute;left:15px;top:50%;transform:translateY(-50%);color:var(--text-faint);font-size:12px;pointer-events:none;"><i class="fa-solid fa-lock"></i></span>
        <input type="password" id="import-pass" placeholder="Backup Master Password"
          style="width:100%;background:rgba(255,255,255,.04);border:.5px solid var(--border);padding:13px 16px 13px 40px;border-radius:var(--radius-md);color:var(--text);font-family:'DM Sans',sans-serif;font-size:13px;outline:none;transition:border-color .2s;margin:0;">
      </div>
      <div class="modal-actions">
        <button class="btn-ghost" id="imp-cancel" style="flex:1;">Cancel</button>
        <button class="btn-white" id="imp-confirm" style="flex:1;"><i class="fa-solid fa-file-import" style="margin-right:8px;"></i>Restore</button>
      </div>
    </div>`);

  o.querySelector('#imp-cancel').onclick = () => o.remove();
  o.querySelector('#imp-confirm').onclick = async () => {
    const p = o.querySelector('#import-pass').value;
    try {
      await decryptVault(localStorage.getItem('bullet_vault'), p);
    } catch {
      bulletAlert('ACCESS DENIED', 'Wrong master password.');
      return;
    }
    try {
      await loadCryptoKey(p);
      const vault = await decryptVault(encryptedData, p);
      if (!Array.isArray(vault)) throw new Error('Invalid vault');
      localStorage.setItem('bullet_vault', encryptedData);
      cachedVault = null;
      window.currentMasterPass = p;
      localStorage.setItem('masterPass', p);
      await loadCryptoKey(p);
      await loadVault();
      o.remove();
      bulletAlert('IMPORT COMPLETE', 'Your backup has been restored successfully.');
    } catch {
      bulletAlert('ERROR', 'Invalid password or corrupted backup file.');
    }
  };
};

/* =========================================================
   OVERRIDE — deleteVaultEntry
========================================================= */
window.deleteVaultEntry = function (id) {
  const o = _modal('delete-modal', `
    <div class="custom-modal" style="text-align:center;">
      <div style="width:52px;height:52px;background:rgba(255,69,58,.07);border:.5px solid rgba(255,69,58,.2);border-radius:var(--radius-md);display:flex;align-items:center;justify-content:center;margin:0 auto 20px;">
        <i class="fa-solid fa-trash" style="font-size:20px;color:var(--danger);"></i>
      </div>
      <h3 style="text-align:center;margin-bottom:8px;">DELETE BULLET</h3>
      <p style="font-size:13px;font-weight:300;color:var(--text-dim);margin-bottom:24px;line-height:1.7;">
        This entry will be permanently removed from your vault. This action cannot be undone.
      </p>
      <div class="modal-actions" style="justify-content:center;">
        <button class="btn-ghost" id="del-cancel" style="flex:1;">Cancel</button>
        <button id="del-confirm" style="flex:1;font-family:'Space Mono',monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;font-weight:700;background:var(--danger);color:#fff;border:none;border-radius:var(--radius-pill);padding:12px 26px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;">
          <i class="fa-solid fa-trash"></i>Delete
        </button>
      </div>
    </div>`);

  o.querySelector('#del-cancel').onclick = () => o.remove();
  o.querySelector('#del-confirm').onclick = async () => {
    const pass = _getMasterPass();
    if (!pass) { bulletAlert('ERROR', 'Session expired. Please login again.'); return; }
    let vault = await getVault();
    vault = vault.filter(item => item.id !== id);
    const encrypted = await encryptVault(vault, pass);
    localStorage.setItem('bullet_vault', encrypted);
    cachedVault = null;
    o.remove();
    loadVault();
  };
};

/* =========================================================
   OVERRIDE — resetApplication
========================================================= */
window.resetApplication = function () {
  const o = _modal('reset-modal', `
    <div class="custom-modal" style="text-align:center;">
      <div style="width:52px;height:52px;background:rgba(255,69,58,.07);border:.5px solid rgba(255,69,58,.2);border-radius:var(--radius-md);display:flex;align-items:center;justify-content:center;margin:0 auto 20px;">
        <i class="fa-solid fa-triangle-exclamation" style="font-size:20px;color:var(--danger);"></i>
      </div>
      <h3 style="text-align:center;margin-bottom:8px;color:var(--danger);">RESET VAULT</h3>
      <p style="font-size:13px;font-weight:300;color:var(--text-dim);margin-bottom:12px;line-height:1.7;">
        This will permanently delete <strong style="color:var(--text);">all data</strong> stored on this device — your vault, settings, and master password.
      </p>
      <div style="padding:12px 16px;background:rgba(255,69,58,.05);border:.5px solid rgba(255,69,58,.15);border-radius:var(--radius-md);margin-bottom:24px;font-family:'Space Mono',monospace;font-size:9px;letter-spacing:2px;text-transform:uppercase;color:rgba(255,69,58,.7);">
        ⚠ This action cannot be undone
      </div>
      <div class="modal-actions" style="justify-content:center;">
        <button class="btn-ghost" id="rst-cancel" style="flex:1;">Cancel</button>
        <button id="rst-confirm" style="flex:1;font-family:'Space Mono',monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;font-weight:700;background:var(--danger);color:#fff;border:none;border-radius:var(--radius-pill);padding:12px 26px;cursor:pointer;">
          Reset Everything
        </button>
      </div>
    </div>`);

  o.querySelector('#rst-cancel').onclick = () => o.remove();
  o.querySelector('#rst-confirm').onclick = () => { localStorage.clear(); window.location.href = 'login.html'; };
};

/* =========================================================
   OVERRIDE — loadVault (renderer avec la nouvelle DA)
========================================================= */
window.loadVault = async function () {
  const container = document.getElementById('vault-list');
  const countEl   = document.getElementById('vault-count');
  const searchVal = document.getElementById('vault-search')?.value.toLowerCase() || '';

  let vault = await getVault();
  if (!Array.isArray(vault)) vault = [];

  const filtered = vault.filter(i =>
    (i.domain || '').toLowerCase().includes(searchVal) ||
    (i.user || '').toLowerCase().includes(searchVal)
  );

  if (countEl) countEl.textContent = filtered.length + ' bullet' + (filtered.length !== 1 ? 's' : '');

  if (filtered.length === 0) {
    container.innerHTML = `<div class="vault-empty">No bullets found…</div>`;
    return;
  }

  const groups = {};
  filtered.forEach(item => {
    if (!groups[item.domain]) groups[item.domain] = [];
    groups[item.domain].push(item);
  });

  container.replaceChildren();
  const frag = document.createDocumentFragment();

  for (const [domain, accounts] of Object.entries(groups)) {
    const gDiv = document.createElement('div');
    gDiv.className = 'vault-group';

    gDiv.innerHTML = `
      <div class="vault-group-header">
        <img src="${accounts[0].logo}" onerror="this.style.display='none'">
        <span class="vault-group-name">${domain}</span>
        <span class="vault-group-count">${accounts.length}</span>
      </div>
      <div class="vault-group-entries"></div>
    `;

    const entriesEl = gDiv.querySelector('.vault-group-entries');

    for (const acc of accounts) {
      const eDiv = document.createElement('div');
      eDiv.className = 'vault-entry-wrapper'; 
      eDiv.dataset.pass = acc.pass;
      
      eDiv.innerHTML = `
        <div class="entry-main-tile">
          <div class="entry-left">
            <div class="entry-user">${acc.user}</div>
            <div class="entry-status pending" data-pass-id="p${acc.id}">· Checking…</div>
          </div>
        </div>
        <div class="entry-side-actions">
          <button class="side-btn copy-btn" title="Copy">
            <i class="fa-regular fa-copy"></i>
          </button>
          <button class="side-btn delete-btn" title="Delete">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      `;

      // click tile
      eDiv.querySelector('.entry-main-tile').addEventListener('click', () => {
        openEditTile(acc.id);
      });

      eDiv.querySelector('.copy-btn').addEventListener('click', (e) => {
  e.stopPropagation();

  const pass = eDiv.dataset.pass; // 🔥 récupère le bon password
  copyVaultPass(pass);
});

      // delete
      eDiv.querySelector('.delete-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        deleteVaultEntry(acc.id);
      });

      entriesEl.appendChild(eDiv);
    }

    frag.appendChild(gDiv);
  }

  container.appendChild(frag);
};
document.addEventListener('DOMContentLoaded', () => {
  const search = document.getElementById('vault-search');

  if (!search) return;

  let timeout;

  search.addEventListener('input', () => {
    clearTimeout(timeout);
    timeout = setTimeout(loadVault, 120);
  });
});
/* =========================================================
   OVERRIDE — openEditTile
========================================================= */
window.openEditTile = async function (id) {
  const vault = await getVault();
  const acc   = vault.find(i => i.id === id);
  if (!acc) return;

  const o = _modal('edit-overlay', `
    <div class="custom-modal">
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:28px;padding-bottom:20px;border-bottom:.5px solid var(--border);">
        <div style="width:40px;height:40px;background:rgba(255,255,255,.04);border:.5px solid var(--border);border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;overflow:hidden;">
          <img src="${acc.logo}" style="width:22px;height:22px;" onerror="this.style.display='none'" alt="">
        </div>
        <div>
          <h3 style="margin:0;font-size:.95rem;letter-spacing:3px;">EDIT ENTRY</h3>
          <div style="font-size:11px;color:var(--text-faint);margin-top:3px;font-weight:300;">${acc.domain} · ${acc.url}</div>
        </div>
      </div>
      <label style="font-family:'Space Mono',monospace;font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--text-dim);display:block;margin-bottom:8px;">
        <i class="fa-solid fa-at" style="margin-right:6px;opacity:.6;"></i>Identifier
      </label>
      <input type="text" id="edit-user" value="${acc.user}"
        style="width:100%;background:rgba(255,255,255,.04);border:.5px solid var(--border);padding:12px 16px;border-radius:var(--radius-md);color:var(--text);font-family:'DM Sans',sans-serif;font-size:13px;outline:none;margin-bottom:18px;transition:border-color .2s;">
      <label style="font-family:'Space Mono',monospace;font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--text-dim);display:block;margin-bottom:8px;">
        <i class="fa-solid fa-lock" style="margin-right:6px;opacity:.6;"></i>Password
      </label>
      <div style="position:relative;margin-bottom:24px;">
        <input type="password" id="edit-pass" value="${acc.pass}"
          style="width:100%;background:rgba(255,255,255,.04);border:.5px solid var(--border);padding:12px 44px 12px 16px;border-radius:var(--radius-md);color:var(--text);font-family:'Space Mono',monospace;font-size:12px;letter-spacing:2px;outline:none;transition:border-color .2s;margin:0;">
        <button onclick="togglePassView()" style="position:absolute;right:14px;top:50%;transform:translateY(-50%);background:none;border:none;color:var(--text-faint);cursor:pointer;font-size:13px;padding:4px;">
          <i class="fa-regular fa-eye"></i>
        </button>
      </div>
      <div class="modal-actions">
        <button class="btn-ghost" onclick="closeEditTile()" style="flex:1;">Cancel</button>
        <button class="btn-white" onclick="saveVaultEntry(${acc.id})" style="flex:1;">
          <i class="fa-solid fa-floppy-disk" style="margin-right:8px;"></i>Save
        </button>
      </div>
    </div>`);

  setTimeout(() => { const u = document.getElementById('edit-user'); if (u) u.focus(); }, 100);
};

/* =========================================================
   OVERRIDE — closeEditTile (appelé par saveVaultEntry dans vault.js)
========================================================= */
window.closeEditTile = function () {
  const o = document.getElementById('edit-overlay');
  if (o) o.remove();
};

/* =========================================================
   OVERRIDE — bulletAlert (icône adaptive)
========================================================= */
window.bulletAlert = function (title, message) {
  const old = document.getElementById('bullet-modal-container');
  if (old) old.remove();

  const isDanger  = /(error|denied|reset)/i.test(title);
  const isSuccess = /(success|complete|created|export|import)/i.test(title);

  const iconClass  = isDanger ? 'fa-circle-xmark'    : isSuccess ? 'fa-circle-check' : 'fa-circle-info';
  const iconColor  = isDanger ? 'var(--danger)'       : isSuccess ? 'var(--safe)'     : 'var(--text-dim)';
  const iconBg     = isDanger ? 'rgba(255,69,58,.07)' : isSuccess ? 'rgba(50,215,75,.07)' : 'rgba(255,255,255,.04)';
  const iconBorder = isDanger ? 'rgba(255,69,58,.2)'  : isSuccess ? 'rgba(50,215,75,.2)'  : 'var(--border)';

  const o = _modal('bullet-modal-container', `
    <div class="custom-modal" style="text-align:center;">
      <div style="width:52px;height:52px;background:${iconBg};border:.5px solid ${iconBorder};border-radius:var(--radius-md);display:flex;align-items:center;justify-content:center;margin:0 auto 20px;">
        <i class="fa-solid ${iconClass}" style="font-size:22px;color:${iconColor};"></i>
      </div>
      <h3 style="text-align:center;margin-bottom:12px;">${title}</h3>
      <div style="background:rgba(255,255,255,.03);border:.5px solid var(--border);border-radius:var(--radius-md);padding:16px 20px;margin-bottom:24px;font-size:13px;font-weight:300;color:var(--text-dim);line-height:1.7;text-align:left;">
        ${message}
      </div>
      <div class="modal-actions" style="justify-content:center;">
        <button class="btn-white" id="confirm-bullet-btn" style="min-width:120px;">OK</button>
      </div>
    </div>`);

  o.querySelector('#confirm-bullet-btn').onclick = () => o.remove();
  o.addEventListener('click', e => { if (e.target === o) o.remove(); });
};

/* =========================================================
   OVERRIDE — copyVaultPass (toast)
========================================================= */
window.copyVaultPass = function (password) {
  navigator.clipboard.writeText(password);
  const t = document.createElement('div');
  t.className   = 'toast';
  t.textContent = 'Copied to clipboard';
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2200);
};

function updateLength(value) {
  const label = document.getElementById('length-val');
  if (label) label.textContent = value;
}
function generatePassword() {
  const length = document.getElementById('length-slider').value;

  const useLetters = document.getElementById('check-letters').checked;
  const useNumbers = document.getElementById('check-numbers').checked;
  const useSymbols = document.getElementById('check-symbols').checked;
  const excludeSimilar = document.getElementById('exclude-similar').checked;

  let chars = '';

  // lettres
  if (useLetters) {
    chars += 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  }

  // chiffres
  if (useNumbers) {
    chars += '0123456789';
  }

  // symboles
  if (useSymbols) {
    chars += '!@#$%^&*()_+[]{}<>?';
  }

  // ❌ rien sélectionné
  if (!chars) {
    alert("Select at least one option");
    return;
  }

  // 🚫 retirer caractères similaires
  if (excludeSimilar) {
    const similar = ['0','O','o','1','l','I'];
    chars = chars.split('').filter(c => !similar.includes(c)).join('');
  }

  // génération
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars[Math.floor(Math.random() * chars.length)];
  }

  document.getElementById('pass-display').value = password;
}
function copyToClipboard(text) {
  navigator.clipboard.writeText(text)
    .catch(() => {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    });
}
function copyGenerated() {
  const input = document.getElementById('pass-display');
  if (!input || !input.value) return;

  navigator.clipboard.writeText(input.value)
    .then(() => {
      console.log("Copied !");
    })
    .catch(() => {
      // fallback
      input.select();
      document.execCommand("copy");
    });
}