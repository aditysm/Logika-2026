import { Mahasiswa, PhotoRecord } from '../types';

const PHOTO_STORAGE_KEY = 'logika_2026_photo_records';
const USER_SESSION_KEY = 'logika_2026_current_user_nim';
const PROFILE_OVERRIDES_KEY = 'logika_2026_profile_overrides';

const DB_NAME = 'Logika2026PhotoDB';
const DB_VERSION = 1;
const STORE_NAME = 'photo_records';

let memoryPhotoCache: PhotoRecord[] | null = null;

function openPhotoDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Compresses an image file into a lightweight base64 DataURL (max ~150KB)
 * using HTML5 Canvas to prevent hitting storage quotas.
 */
export function compressImageFile(
  file: File,
  maxWidth = 1200,
  maxHeight = 1200,
  quality = 0.8
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      };
      img.onerror = () => resolve(event.target?.result as string);
    };
    reader.onerror = (err) => reject(err);
  });
}

export function normalizeNim(nim?: string): string {
  if (!nim) return '';
  return nim.toLowerCase().replace(/[\/\s_-]/g, '');
}

/**
 * Formats ISO timestamps like "2026-09-12T11:54:24.545072+00:00"
 * into standard Indonesian date format in WITA (UTC+8): "12 September 2026, 19:54 WITA"
 */
export function formatIndonesianDate(dateStr?: string): string {
  if (!dateStr || dateStr === '-') return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;

    const dateFormatted = new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'Asia/Makassar',
    }).format(d);

    const timeFormatted = new Intl.DateTimeFormat('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Makassar',
    }).format(d).replace(/\./g, ':');

    return `${dateFormatted}, ${timeFormatted} WITA`;
  } catch {
    return dateStr;
  }
}

export function setMemoryPhotoRecords(records: PhotoRecord[]): void {
  memoryPhotoCache = records;
  syncToLocalStorage(records);

  // Synchronize IndexedDB store to match current records (remove deleted items)
  openPhotoDB()
    .then((db) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const clearReq = store.clear();
      clearReq.onsuccess = () => {
        records.forEach((r) => {
          store.put(r);
        });
      };
    })
    .catch((err) => console.warn('IndexedDB sync error:', err));
}

export function getProfileOverrides(): Record<string, Partial<Mahasiswa>> {
  try {
    const raw = localStorage.getItem(PROFILE_OVERRIDES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveProfileOverride(nim: string, updatedData: Partial<Mahasiswa>): void {
  try {
    const current = getProfileOverrides();
    const cleanNim = normalizeNim(nim);
    current[cleanNim] = {
      ...(current[cleanNim] || {}),
      ...updatedData,
    };
    localStorage.setItem(PROFILE_OVERRIDES_KEY, JSON.stringify(current));
  } catch (err) {
    console.error('Failed to save profile override', err);
  }
}

export function applyProfileOverrides(students: Mahasiswa[]): Mahasiswa[] {
  const overrides = getProfileOverrides();
  if (Object.keys(overrides).length === 0) return students;

  return students.map((s) => {
    const cleanNim = normalizeNim(s.nim);
    const override = overrides[cleanNim];
    if (override) {
      return { ...s, ...override };
    }
    return s;
  });
}

export async function loadPhotoRecordsFromStorage(): Promise<PhotoRecord[]> {
  try {
    const db = await openPhotoDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();

    return new Promise((resolve) => {
      request.onsuccess = () => {
        const records = (request.result || []) as PhotoRecord[];
        if (records.length > 0) {
          memoryPhotoCache = records;
          syncToLocalStorage(records);
          resolve(records);
        } else {
          resolve(getPhotoRecords());
        }
      };
      request.onerror = () => {
        resolve(getPhotoRecords());
      };
    });
  } catch {
    return getPhotoRecords();
  }
}

export function getPhotoRecords(): PhotoRecord[] {
  if (memoryPhotoCache !== null) {
    return memoryPhotoCache;
  }
  try {
    const raw = localStorage.getItem(PHOTO_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        memoryPhotoCache = parsed;
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed to parse photo records from localStorage', err);
  }
  memoryPhotoCache = [];
  return memoryPhotoCache;
}

export function syncToLocalStorage(records: PhotoRecord[]): void {
  try {
    localStorage.setItem(PHOTO_STORAGE_KEY, JSON.stringify(records));
  } catch (err) {
    console.warn('localStorage full, saving lightweight metadata cache to localStorage:', err);
    try {
      // Strip heavy base64 strings so metadata persists in localStorage without exceeding 5MB quota
      const lightweight = records.map((r) => ({
        ...r,
        photoUrl:
          r.photoUrl && r.photoUrl.startsWith('data:image/') && r.photoUrl.length > 500
            ? undefined
            : r.photoUrl,
      }));
      localStorage.setItem(PHOTO_STORAGE_KEY, JSON.stringify(lightweight));
    } catch {
      // Ignore if localStorage quota is completely full
    }
  }
}

export function savePhotoRecord(
  data: Omit<PhotoRecord, 'id' | 'timestamp'> & { id?: string; timestamp?: string }
): PhotoRecord {
  const current = getPhotoRecords();
  const id = data.id || `photo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const timestamp = data.timestamp || new Date().toISOString().replace('T', ' ').slice(0, 19);

  const newRecord: PhotoRecord = {
    ...data,
    id,
    timestamp,
  };

  const uploaderNorm = normalizeNim(data.uploaderNim);
  const targetNorm = normalizeNim(data.targetNim);

  // When A and B take photo together, replace any existing record between these two in either direction
  const filtered = current.filter(
    (r) =>
      !(
        (normalizeNim(r.uploaderNim) === uploaderNorm && normalizeNim(r.targetNim) === targetNorm) ||
        (normalizeNim(r.uploaderNim) === targetNorm && normalizeNim(r.targetNim) === uploaderNorm)
      )
  );

  const updated = [newRecord, ...filtered];
  memoryPhotoCache = updated;

  // 1. Save to IndexedDB (unlimited capacity for high-res images)
  openPhotoDB()
    .then((db) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(newRecord);
    })
    .catch((err) => console.warn('IndexedDB write error:', err));

  // 2. Sync to localStorage (handles QuotaExceededError gracefully)
  syncToLocalStorage(updated);

  return newRecord;
}

export function hasTakenPhoto(
  records: PhotoRecord[],
  nim1?: string,
  nim2?: string
): boolean {
  if (!nim1 || !nim2) return false;
  const n1 = normalizeNim(nim1);
  const n2 = normalizeNim(nim2);
  if (n1 === n2) return false;

  return records.some(
    (r) =>
      (normalizeNim(r.uploaderNim) === n1 && normalizeNim(r.targetNim) === n2) ||
      (normalizeNim(r.uploaderNim) === n2 && normalizeNim(r.targetNim) === n1)
  );
}

export function getPhotoWithTarget(
  records: PhotoRecord[],
  nim1?: string,
  nim2?: string
): PhotoRecord | undefined {
  if (!nim1 || !nim2) return undefined;
  const n1 = normalizeNim(nim1);
  const n2 = normalizeNim(nim2);

  return records.find(
    (r) =>
      (normalizeNim(r.uploaderNim) === n1 && normalizeNim(r.targetNim) === n2) ||
      (normalizeNim(r.uploaderNim) === n2 && normalizeNim(r.targetNim) === n1)
  );
}

export function mergePhotoRecords(
  local: PhotoRecord[] = [],
  remote: PhotoRecord[] | null = []
): PhotoRecord[] {
  // If remote fetch failed or offline (remote is null), fallback to local cache
  if (remote === null) {
    return local || [];
  }

  const localMap = new Map<string, PhotoRecord>();

  const getPairKey = (r: PhotoRecord) => {
    const n1 = normalizeNim(r.uploaderNim);
    const n2 = normalizeNim(r.targetNim);
    if (!n1 && !n2) return r.id || Math.random().toString();
    return n1 < n2 ? `${n1}_${n2}` : `${n2}_${n1}`;
  };

  (local || []).forEach((r) => {
    const key = getPairKey(r);
    if (key) localMap.set(key, r);
  });

  // Since remote database is authoritative when online:
  // Construct result strictly from remote records, enriching with local photoUrl preview cache
  const merged: PhotoRecord[] = (remote || []).map((r) => {
    const key = getPairKey(r);
    const existingLocal = localMap.get(key);
    return {
      ...existingLocal,
      ...r,
      photoUrl: r.photoUrl || existingLocal?.photoUrl,
      photoFileName: r.photoFileName || existingLocal?.photoFileName,
      driveFolderUrl: r.driveFolderUrl || existingLocal?.driveFolderUrl,
    };
  });

  return merged;
}

export function generateNextFileName(
  records: PhotoRecord[],
  uploader: Mahasiswa,
  target: Mahasiswa
): { seq: number; fileName: string } {
  const targetNorm = normalizeNim(target.nim);
  const uploaderNorm = normalizeNim(uploader.nim);

  // Count existing photo upload records for the uploader
  const uploaderPhotos = records.filter(
    (r) =>
      (normalizeNim(r.uploaderNim) === uploaderNorm || normalizeNim(r.targetNim) === uploaderNorm) &&
      !(
        (normalizeNim(r.uploaderNim) === uploaderNorm && normalizeNim(r.targetNim) === targetNorm) ||
        (normalizeNim(r.uploaderNim) === targetNorm && normalizeNim(r.targetNim) === uploaderNorm)
      )
  );

  const seq = uploaderPhotos.length + 1;
  const cleanNim = target.nim.replace(/[\/\s]/g, '-');
  const fileName = `${seq}. ${target.namaLengkap}_${cleanNim}.jpg`;

  return { seq, fileName };
}

export function getCurrentUserNim(): string | null {
  try {
    return localStorage.getItem(USER_SESSION_KEY) || null;
  } catch {
    return null;
  }
}

export function setCurrentUserNim(nim: string | null): void {
  try {
    if (nim) {
      localStorage.setItem(USER_SESSION_KEY, nim);
    } else {
      localStorage.removeItem(USER_SESSION_KEY);
    }
  } catch (err) {
    console.error('Failed to update user session', err);
  }
}

export function findStudentInList(list: Mahasiswa[], queryNimOrId?: string): Mahasiswa | undefined {
  if (!queryNimOrId) return undefined;
  const normalized = queryNimOrId.trim().toLowerCase();
  const cleanNormalized = normalized.replace(/[\/\s_-]/g, '');

  // 1. Direct match on id or nim
  const directMatch = list.find((s) => {
    const sId = s.id ? s.id.toLowerCase().trim() : '';
    const sNim = s.nim ? s.nim.toLowerCase().trim() : '';
    return sId === normalized || sNim === normalized;
  });
  if (directMatch) return directMatch;

  // 2. Substring & normalized match on nim, name, nickname
  const substringMatch = list.find((s) => {
    const sIdClean = (s.id || '').toLowerCase().replace(/[\/\s_-]/g, '');
    const sNimClean = (s.nim || '').toLowerCase().replace(/[\/\s_-]/g, '');
    const sNamaLengkap = (s.namaLengkap || '').toLowerCase();
    const sNamaPanggilan = (s.namaPanggilan || '').toLowerCase();

    return (
      (sIdClean && sIdClean === cleanNormalized) ||
      (sNimClean && sNimClean === cleanNormalized) ||
      (cleanNormalized.length >= 3 && sNimClean.includes(cleanNormalized)) ||
      sNamaLengkap.includes(normalized) ||
      sNamaPanggilan.includes(normalized)
    );
  });
  if (substringMatch) return substringMatch;

  // 3. Backward compatibility fallback for demo-N
  const demoMatch = normalized.match(/^demo-(\d+)$/i);
  if (demoMatch && demoMatch[1]) {
    const index = parseInt(demoMatch[1], 10) - 1;
    if (index >= 0 && index < list.length) {
      return list[index];
    }
  }

  return undefined;
}
