const DB_NAME = "docuware-purchase-order-pdfs";
const DB_VERSION = 1;
const STORE_NAME = "purchase_order_pdfs";

export interface StoredPurchaseOrderPdf {
  purchaseOrderID: number;
  fileName: string;
  blob: Blob;
  createdAt: string;
}

const openDatabase = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "purchaseOrderID" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error || new Error("Unable to open local PDF storage."));
  });

const runTransaction = async <T>(
  mode: IDBTransactionMode,
  handler: (store: IDBObjectStore, resolve: (value: T) => void, reject: (reason?: unknown) => void) => void
): Promise<T> => {
  const database = await openDatabase();

  return new Promise<T>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);

    transaction.oncomplete = () => database.close();
    transaction.onerror = () => {
      reject(transaction.error || new Error("Local PDF transaction failed."));
      database.close();
    };
    transaction.onabort = () => {
      reject(transaction.error || new Error("Local PDF transaction aborted."));
      database.close();
    };

    handler(store, resolve, reject);
  });
};

export const savePurchaseOrderPdf = async (
  pdfRecord: StoredPurchaseOrderPdf
): Promise<void> => {
  await runTransaction<void>("readwrite", (store, resolve, reject) => {
    const request = store.put(pdfRecord);

    request.onsuccess = () => resolve();
    request.onerror = () =>
      reject(request.error || new Error("Unable to save the generated PDF."));
  });
};

export const getPurchaseOrderPdf = async (
  purchaseOrderID: number
): Promise<StoredPurchaseOrderPdf | null> =>
  runTransaction<StoredPurchaseOrderPdf | null>("readonly", (store, resolve, reject) => {
    const request = store.get(purchaseOrderID);

    request.onsuccess = () => resolve((request.result as StoredPurchaseOrderPdf) || null);
    request.onerror = () =>
      reject(request.error || new Error("Unable to get the stored PDF."));
  });

export const listStoredPurchaseOrderPdfIds = async (): Promise<number[]> =>
  runTransaction<number[]>("readonly", (store, resolve, reject) => {
    const request = store.getAllKeys();

    request.onsuccess = () =>
      resolve(
        (request.result as Array<string | number>)
          .map((key) => Number(key))
          .filter((value) => Number.isFinite(value))
      );
    request.onerror = () =>
      reject(request.error || new Error("Unable to get stored PDF ids."));
  });
