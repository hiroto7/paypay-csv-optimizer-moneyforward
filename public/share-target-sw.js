const DATABASE_NAME = "paypay-csv-share-target";
const DATABASE_VERSION = 1;
const STORE_NAME = "shared-files";

const openDatabase = () =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const storeSharedFiles = async (files) => {
  const id = crypto.randomUUID();
  const database = await openDatabase();

  try {
    await new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).put({
        id,
        files,
        receivedAt: Date.now(),
      });
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } finally {
    database.close();
  }

  return id;
};

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  if (event.request.method !== "POST" || url.pathname !== "/share-target") {
    return;
  }

  event.respondWith(
    (async () => {
      try {
        const formData = await event.request.formData();
        const files = formData
          .getAll("csv")
          .filter((value) => value instanceof File);

        if (files.length === 0) {
          return Response.redirect(
            new URL("/?share-error=no-file", url.origin).href,
            303,
          );
        }

        const id = await storeSharedFiles(files);
        return Response.redirect(
          new URL(`/?shared-files=${encodeURIComponent(id)}`, url.origin).href,
          303,
        );
      } catch (error) {
        console.error("Failed to receive shared files:", error);
        return Response.redirect(
          new URL("/?share-error=receive-failed", url.origin).href,
          303,
        );
      }
    })(),
  );
});
