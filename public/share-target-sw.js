const DATABASE_NAME = "paypay-csv-share-target";
const DATABASE_VERSION = 4;
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
    request.onblocked = () =>
      reject(new DOMException("Database upgrade blocked", "VersionError"));
  });

const storeSharedFiles = async (database, files) => {
  const id = crypto.randomUUID();
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
    transaction.onabort = () => reject(transaction.error);
  });

  return id;
};

const getSharedFiles = (formData) => {
  const files = [];
  let hasEntries = false;
  let hasText = false;
  let hasTextInFileField = false;
  let hasEmptyFile = false;

  for (const [name, value] of formData.entries()) {
    hasEntries = true;
    if (!(value instanceof Blob)) {
      hasText = true;
      hasTextInFileField ||= name === "csv";
      continue;
    }
    if (value.size === 0) {
      hasEmptyFile = true;
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

  const emptyReason = hasEmptyFile
    ? "empty-file"
    : hasTextInFileField
      ? "text-in-file-field"
      : hasText
        ? "text-only"
        : hasEntries
          ? "other-value"
          : "no-fields";

  return { files, emptyReason };
};

const describeEmptyRequest = async (request) => {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  const format = contentType.startsWith("multipart/form-data")
    ? "multipart"
    : contentType.startsWith("application/x-www-form-urlencoded")
      ? "urlencoded"
      : contentType
        ? "other-type"
        : "no-type";

  try {
    const hasBody = (await request.arrayBuffer()).byteLength > 0;
    return `${hasBody ? "body-present" : "empty-body"}:${format}`;
  } catch {
    return `body-read-failed:${format}`;
  }
};

const ERROR_NAMES = new Set([
  "AbortError",
  "DataCloneError",
  "InvalidStateError",
  "NotAllowedError",
  "QuotaExceededError",
  "SecurityError",
  "UnknownError",
  "VersionError",
]);

const errorRedirect = (url, stage, error) => {
  const redirectUrl = new URL("/", url.origin);
  const errorName = error?.name;
  const code = error
    ? `${stage}:${ERROR_NAMES.has(errorName) ? errorName : "OtherError"}`
    : stage;
  redirectUrl.searchParams.set("share-error", code);
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
      let sharedFiles;
      let bodyProbe;
      try {
        bodyProbe = event.request.clone();
        sharedFiles = getSharedFiles(await event.request.formData());
      } catch (error) {
        console.error("Failed to parse shared files:", error);
        return errorRedirect(url, "form-data", error);
      }

      if (sharedFiles.files.length === 0) {
        const detail =
          sharedFiles.emptyReason === "no-fields"
            ? `:${await describeEmptyRequest(bodyProbe)}`
            : "";
        return errorRedirect(
          url,
          `no-file:${sharedFiles.emptyReason}${detail}`,
        );
      }

      let database;
      try {
        database = await openDatabase();
      } catch (error) {
        console.error("Failed to open shared file storage:", error);
        return errorRedirect(url, "storage-open", error);
      }

      try {
        const id = await storeSharedFiles(database, sharedFiles.files);
        return Response.redirect(
          new URL(`/?shared-files=${encodeURIComponent(id)}`, url.origin).href,
          303,
        );
      } catch (error) {
        console.error("Failed to store shared files:", error);
        return errorRedirect(url, "storage-write", error);
      } finally {
        database.close();
      }
    })(),
  );
});
