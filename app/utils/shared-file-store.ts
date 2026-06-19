import { createFileIdentity } from "./file-reader";

export const SHARED_FILE_DATABASE_NAME = "paypay-csv-share-target";
export const SHARED_FILE_DATABASE_VERSION = 4;

const SHARED_FILES_STORE_NAME = "shared-files";
const INPUT_FILES_STORE_NAME = "input-files";
const INPUT_FILES_ID = "current";

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
    const request = indexedDB.open(
      SHARED_FILE_DATABASE_NAME,
      SHARED_FILE_DATABASE_VERSION,
    );

    request.onupgradeneeded = () => {
      createStoreIfMissing(request.result, SHARED_FILES_STORE_NAME);
      createStoreIfMissing(request.result, INPUT_FILES_STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

export const mergeUniqueFiles = async (
  currentFiles: readonly File[],
  newFiles: readonly File[],
): Promise<File[]> => {
  const filesByIdentity = new Map<string, File>();

  for (const file of [...currentFiles, ...newFiles]) {
    filesByIdentity.set(await createFileIdentity(file), file);
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

const readInputFiles = async (
  database: IDBDatabase,
): Promise<InputFilesRecord | null> =>
  new Promise((resolve, reject) => {
    const transaction = database.transaction(
      INPUT_FILES_STORE_NAME,
      "readonly",
    );
    const request = transaction
      .objectStore(INPUT_FILES_STORE_NAME)
      .get(INPUT_FILES_ID);

    request.onsuccess = () =>
      resolve((request.result as InputFilesRecord | undefined) ?? null);
    request.onerror = () => reject(request.error);
  });

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
    const record = await readInputFiles(database);
    if (!record) {
      return { payPayFile: null, mfmeFiles: [] };
    }

    return {
      payPayFile: record.payPayFile,
      mfmeFiles: record.mfmeFiles,
    };
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
