const DATABASE_NAME = 'military_personnel_pdf_files';
const DATABASE_VERSION = 1;
const STORE_NAME = 'pdf_files';
const RECORD_INDEX = 'recordKey';

export type PersonnelFileKind = 'pdf' | 'image';

export interface StoredPersonnelFile {
  id: string;
  recordKey: string;
  recordName: string;
  fileName: string;
  fileSize: number;
  uploadedAt: string;
  kind?: PersonnelFileKind;
  mimeType?: string;
  blob: Blob;
}

const openDatabase = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    if (!('indexedDB' in globalThis)) {
      reject(new Error('IndexedDB is not supported in this browser.'));
      return;
    }

    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      const store = database.objectStoreNames.contains(STORE_NAME)
        ? request.transaction!.objectStore(STORE_NAME)
        : database.createObjectStore(STORE_NAME, { keyPath: 'id' });

      if (!store.indexNames.contains(RECORD_INDEX)) {
        store.createIndex(RECORD_INDEX, RECORD_INDEX, { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Could not open the PDF database.'));
  });

const requestResult = <T>(request: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('PDF database request failed.'));
  });

export const listPersonnelFiles = async (recordKey: string): Promise<StoredPersonnelFile[]> => {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, 'readonly');
    const index = transaction.objectStore(STORE_NAME).index(RECORD_INDEX);
    const files = await requestResult(index.getAll(recordKey));
    return [...files].sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
  } finally {
    database.close();
  }
};

export const savePersonnelFile = async (
  recordKey: string,
  recordName: string,
  file: File,
): Promise<StoredPersonnelFile> => {
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  const isImage = file.type.startsWith('image/');
  if (!isPdf && !isImage) throw new Error('يمكن إضافة الصور أو ملفات PDF فقط.');

  const item: StoredPersonnelFile = {
    id: globalThis.crypto?.randomUUID?.() || `file_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    recordKey,
    recordName,
    fileName: file.name,
    fileSize: file.size,
    uploadedAt: new Date().toISOString(),
    kind: isImage ? 'image' : 'pdf',
    mimeType: file.type,
    blob: file,
  };

  const database = await openDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    await requestResult(transaction.objectStore(STORE_NAME).put(item));
    return item;
  } finally {
    database.close();
  }
};

export const getPersonnelFile = async (id: string): Promise<StoredPersonnelFile | undefined> => {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, 'readonly');
    return await requestResult(transaction.objectStore(STORE_NAME).get(id));
  } finally {
    database.close();
  }
};

export const deletePersonnelFile = async (id: string): Promise<void> => {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    await requestResult(transaction.objectStore(STORE_NAME).delete(id));
  } finally {
    database.close();
  }
};
