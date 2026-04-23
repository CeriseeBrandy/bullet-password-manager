let deferredPrompt = null;
// install prompt
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;

});

// bouton install
async function installApp() {
  

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
    
  }
});

// service worker
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js")    
    .catch(err => console.error(err));
}