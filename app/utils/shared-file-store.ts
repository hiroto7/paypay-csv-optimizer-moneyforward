const DATABASE_NAME = "paypay-csv-share-target";
const DATABASE_VERSION = 3;
const SHARED_FILES_STORE_NAME = "shared-files";
const INPUT_FILES_STORE_NAME = "input-files";
const LEGACY_MFME_TRAY_STORE_NAME = "mfme-file-tray";
const INPUT_FILES_ID = "current";
const LEGACY_MFME_TRAY_LIFETIME_MS = 24 * 60 * 60 * 1000;

type SharedFileRecord = {
  id: string;
  files: File[];
  receivedAt: number;
};

export type InputFiles = {
  payPayFile: File | null;
  mfmeFiles: File[];
};

type InputFilesRecord = InputFiles & {
  id: typeof INPUT_FILES_ID;
  updatedAt: number;
};

type LegacyMfmeTrayRecord = {
  id: typeof INPUT_FILES_ID;
  files: File[];
  updatedAt: number;
};

const createStoreIfMissing = (
  database: IDBDatabase,
  storeName: string,
): void => {
  if (!database.objectStoreNames.contains(storeName)) {
    database.createObjectStore(storeName, { keyPath: "id" });
  }
};

const openDatabase = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = () => {
      createStoreIfMissing(request.result, SHARED_FILES_STORE_NAME);
      createStoreIfMissing(request.result, INPUT_FILES_STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const fileIdentity = async (file: File): Promise<string> => {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    await file.arrayBuffer(),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
};

export const mergeUniqueFiles = async (
  currentFiles: readonly File[],
  newFiles: readonly File[],
): Promise<File[]> => {
  const filesByIdentity = new Map<string, File>();

  for (const file of currentFiles) {
    filesByIdentity.set(await fileIdentity(file), file);
  }

  for (const file of newFiles) {
    filesByIdentity.set(await fileIdentity(file), file);
  }

  return [...filesByIdentity.values()];
};

export const consumeSharedFiles = async (id: string): Promise<File[]> => {
  const database = await openDatabase();

  try {
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(
        SHARED_FILES_STORE_NAME,
        "readwrite",
      );
      const store = transaction.objectStore(SHARED_FILES_STORE_NAME);
      const request = store.get(id);
      let files: File[] = [];

      request.onsuccess = () => {
        const record = request.result as SharedFileRecord | undefined;
        files = record?.files ?? [];
        store.delete(id);
      };
      request.onerror = () => reject(request.error);
      transaction.oncomplete = () => resolve(files);
      transaction.onerror = () => reject(transaction.error);
    });
  } finally {
    database.close();
  }
};

const consumeLegacyMfmeFiles = async (
  database: IDBDatabase,
): Promise<File[]> => {
  if (!database.objectStoreNames.contains(LEGACY_MFME_TRAY_STORE_NAME)) {
    return [];
  }

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(
      LEGACY_MFME_TRAY_STORE_NAME,
      "readwrite",
    );
    const store = transaction.objectStore(LEGACY_MFME_TRAY_STORE_NAME);
    const request = store.get(INPUT_FILES_ID);

    request.onsuccess = () => {
      const record = request.result as LegacyMfmeTrayRecord | undefined;
      store.delete(INPUT_FILES_ID);
      resolve(
        record && Date.now() - record.updatedAt <= LEGACY_MFME_TRAY_LIFETIME_MS
          ? record.files
          : [],
      );
    };
    request.onerror = () => reject(request.error);
  });
};

const writeInputFiles = async (
  database: IDBDatabase,
  inputFiles: InputFiles,
): Promise<void> =>
  new Promise((resolve, reject) => {
    const transaction = database.transaction(
      INPUT_FILES_STORE_NAME,
      "readwrite",
    );
    transaction.objectStore(INPUT_FILES_STORE_NAME).put({
      id: INPUT_FILES_ID,
      ...inputFiles,
      updatedAt: Date.now(),
    } satisfies InputFilesRecord);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });

export const loadInputFiles = async (): Promise<InputFiles> => {
  const database = await openDatabase();

  try {
    const legacyMfmeFiles = await consumeLegacyMfmeFiles(database);
    const inputFiles = await new Promise<InputFiles | null>(
      (resolve, reject) => {
        const transaction = database.transaction(
          INPUT_FILES_STORE_NAME,
          "readonly",
        );
        const store = transaction.objectStore(INPUT_FILES_STORE_NAME);
        const request = store.get(INPUT_FILES_ID);

        request.onsuccess = () => {
          const record = request.result as InputFilesRecord | undefined;
          if (record) {
            resolve({
              payPayFile: record.payPayFile,
              mfmeFiles: record.mfmeFiles,
            });
          } else {
            resolve(null);
          }
        };
        request.onerror = () => reject(request.error);
      },
    );

    if (inputFiles) {
      return inputFiles;
    }

    const migratedInputFiles = {
      payPayFile: null,
      mfmeFiles: legacyMfmeFiles,
    };
    if (legacyMfmeFiles.length > 0) {
      await writeInputFiles(database, migratedInputFiles);
    }
    return migratedInputFiles;
  } finally {
    database.close();
  }
};

export const saveInputFiles = async (inputFiles: InputFiles): Promise<void> => {
  const database = await openDatabase();

  try {
    await writeInputFiles(database, inputFiles);
  } finally {
    database.close();
  }
};

export const clearInputFiles = async (): Promise<void> => {
  const database = await openDatabase();

  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(
        INPUT_FILES_STORE_NAME,
        "readwrite",
      );
      transaction.objectStore(INPUT_FILES_STORE_NAME).delete(INPUT_FILES_ID);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } finally {
    database.close();
  }
};
