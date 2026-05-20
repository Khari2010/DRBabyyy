self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = { title: "DR Baby", body: "Something new on the wall" };
  try { payload = event.data?.json() ?? payload; } catch (_) {}
  const { title, body, url = "/wall", tag } = payload;
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag,
      data: { url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/wall";
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const existing = all.find((c) => c.url.includes("/wall"));
    if (existing) {
      existing.focus();
      existing.navigate?.(url);
    } else {
      self.clients.openWindow(url);
    }
  })());
});
