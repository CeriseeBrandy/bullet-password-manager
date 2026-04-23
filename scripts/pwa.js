let deferredPrompt = null;
console.log("PWA JS LOADED");
// install prompt
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;

  console.log("✅ beforeinstallprompt fired");
});

// bouton install
async function installApp() {
  console.log("CLICK INSTALL");

  if (!deferredPrompt) {
    alert("Install not available");
    return;
  }

  deferredPrompt.prompt();
  const choice = await deferredPrompt.userChoice;
  deferredPrompt = null;
}

// 🔥 DETECTION PWA
function isPWAInstalled() {
  return window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone === true;
}

// 🔥 CACHE BOUTON SI DEJA INSTALLE
window.addEventListener('DOMContentLoaded', () => {
  const btns = document.querySelectorAll('.install-btn');

  if (isPWAInstalled()) {
    btns.forEach(btn => btn.style.display = 'none');
    console.log("📱 PWA mode → install button hidden");
  }
});

// service worker
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js")
    .then(reg => console.log("✅ SW registered"))
    .catch(err => console.error(err));
}