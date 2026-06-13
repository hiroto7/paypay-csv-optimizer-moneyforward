const DATABASE_NAME = "paypay-csv-share-target";
const DATABASE_VERSION = 3;
const SHARED_FILES_STORE_NAME = "shared-files";
const INPUT_FILES_STORE_NAME = "input-files";

const createStoreIfMissing = (database, storeName) => {
  if (!database.objectStoreNames.contains(storeName)) {
    database.createObjectStore(storeName, { keyPath: "id" });
  }
};

const openDatabase = () =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = () => {
      createStoreIfMissing(request.result, SHARED_FILES_STORE_NAME);
      createStoreIfMissing(request.result, INPUT_FILES_STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const storeSharedFiles = async (files) => {
  const id = crypto.randomUUID();
  const database = await openDatabase();

  try {
    await new Promise((resolve, reject) => {
      const transaction = database.transaction(
        SHARED_FILES_STORE_NAME,
        "readwrite",
      );
      transaction.objectStore(SHARED_FILES_STORE_NAME).put({
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

const getSharedFiles = (formData) => {
  const files = [];

  for (const value of formData.values()) {
    if (!(value instanceof Blob) || value.size === 0) {
      continue;
    }

    files.push(
      value instanceof File
        ? value
        : new File([value], "shared.csv", {
            type: value.type || "application/octet-stream",
          }),
    );
  }

  return files;
};

const errorRedirect = (url, error) => {
  const redirectUrl = new URL("/", url.origin);
  redirectUrl.searchParams.set("share-error", error);
  return Response.redirect(redirectUrl.href, 303);
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
        const files = getSharedFiles(formData);

        if (files.length === 0) {
          return errorRedirect(url, "no-file");
        }

        const id = await storeSharedFiles(files);
        return Response.redirect(
          new URL(`/?shared-files=${encodeURIComponent(id)}`, url.origin).href,
          303,
        );
      } catch (error) {
        console.error("Failed to receive shared files:", error);
        return errorRedirect(url, "receive-failed");
      }
    })(),
  );
});
