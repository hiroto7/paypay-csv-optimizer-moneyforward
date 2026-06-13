const DATABASE_NAME = "paypay-csv-share-target";
const DATABASE_VERSION = 1;
const STORE_NAME = "shared-files";

type SharedFileRecord = {
  id: string;
  files: File[];
  receivedAt: number;
};

const openDatabase = (): Promise<IDBDatabase> =>
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

export const consumeSharedFiles = async (id: string): Promise<File[]> => {
  const database = await openDatabase();

  try {
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
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
