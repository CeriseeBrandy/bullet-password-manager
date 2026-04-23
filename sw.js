self.addEventListener("install", (event) => {
  console.log("✅ SW installed");
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  console.log("✅ SW activated");

  event.waitUntil(
    self.clients.claim().then(() => {
      // 🔥 dit aux pages de reload
      return self.clients.matchAll({ type: "window" }).then(clients => {
        clients.forEach(client => {
          client.postMessage("reload");
        });
      });
    })
  );
});
self.addEventListener("install", (e) => {
  console.log("🔥 SW installing...");
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  console.log("🔥 SW activating...");
  return self.clients.claim();
});