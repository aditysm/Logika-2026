import { Mahasiswa, PhotoRecord } from '../types';

export const ACTIVE_PROJECT_REF = 'cvjjdsxguzuhnnnxneec';
const PHOTO_STORAGE_KEY = `logika_2026_photo_records_${ACTIVE_PROJECT_REF}`;
const USER_SESSION_KEY = `logika_2026_current_user_nim_${ACTIVE_PROJECT_REF}`;
const PROFILE_OVERRIDES_KEY = `logika_2026_profile_overrides_${ACTIVE_PROJECT_REF}`;

const DB_NAME = `Logika2026PhotoDB_${ACTIVE_PROJECT_REF}`;
const DB_VERSION = 1;
const STORE_NAME = 'photo_records';

// Purge any stale legacy data or cache from previous Supabase projects
if (typeof window !== 'undefined') {
  try {
    const markerKey = 'logika_active_project_id';
    const lastActive = localStorage.getItem(markerKey);
    if (lastActive !== ACTIVE_PROJECT_REF) {
      const keysToPurge = [
        'logika_2026_photo_records',
        'logika_2026_profile_overrides',
        'logika_2026_current_user_nim',
        'photo_storage',
      ];
      keysToPurge.forEach((k) => {
        try { localStorage.removeItem(k); } catch {}
      });

      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && (k.includes('fwhapumjpfbqirmqqwrm') || (k.startsWith('logika_2026_photo_records_') && !k.endsWith(ACTIVE_PROJECT_REF)))) {
          try { localStorage.removeItem(k); } catch {}
        }
      }

      try {
        if (window.indexedDB && window.indexedDB.deleteDatabase) {
          window.indexedDB.deleteDatabase('Logika2026PhotoDB');
        }
      } catch {}

      localStorage.setItem(markerKey, ACTIVE_PROJECT_REF);
    }
  } catch (err) {
    console.warn('Cache purge notice:', err);
  }
}

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

export function clearProfileOverrides(): void {
  try {
    localStorage.removeItem(PROFILE_OVERRIDES_KEY);
  } catch (err) {
    console.error('Failed to clear profile overrides', err);
  }
}

export async function clearAllPhotoCache(): Promise<void> {
  memoryPhotoCache = [];
  try {
    localStorage.removeItem(PHOTO_STORAGE_KEY);
  } catch (err) {
    console.warn('Failed to clear photo storage key in localStorage', err);
  }
  try {
    const db = await openPhotoDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    await new Promise<void>((resolve) => {
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    });
  } catch (err) {
    console.warn('Failed to clear photo store in IndexedDB', err);
  }
}

export function applyProfileOverrides(students: Mahasiswa[]): Mahasiswa[] {
  const overrides = getProfileOverrides();
  if (Object.keys(overrides).length === 0) return students;

  return students.map((s) => {
    const cleanNim = normalizeNim(s.nim);
    const override = overrides[cleanNim];
    if (override) {
      // Never allow local overrides to change the official account tier
      const { tier, ...safeOverride } = override;
      return { ...s, ...safeOverride };
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

/**
 * Helper to strip heavy base64 strings from photo records before saving to localStorage.
 * Full images are stored safely in IndexedDB and in-memory cache without quota limits.
 */
function sanitizeForLocalStorage(records: PhotoRecord[]): PhotoRecord[] {
  return records.map((r) => {
    const isHeavyDataUrl =
      typeof r.photoUrl === 'string' &&
      (r.photoUrl.startsWith('data:image/') || r.photoUrl.length > 500);

    if (isHeavyDataUrl) {
      return {
        ...r,
        photoUrl: undefined,
      };
    }
    return r;
  });
}

// Self-healing: Sanitize any existing bloated records in localStorage on module initialization
if (typeof window !== 'undefined' && window.localStorage) {
  try {
    const raw = localStorage.getItem(PHOTO_STORAGE_KEY);
    if (raw && (raw.includes('data:image/') || raw.length > 200000)) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const sanitized = sanitizeForLocalStorage(parsed);
        localStorage.setItem(PHOTO_STORAGE_KEY, JSON.stringify(sanitized));
      }
    }
  } catch {
    // If it fails or is unparseable, safely ignore or reset
  }
}

export function syncToLocalStorage(records: PhotoRecord[]): void {
  try {
    const lightweight = sanitizeForLocalStorage(records);
    localStorage.setItem(PHOTO_STORAGE_KEY, JSON.stringify(lightweight));
  } catch {
    // If localStorage is still constrained by other storage items, handle silently
    try {
      // Emergency fallback: only keep minimal IDs and flags
      const minimal = records.map((r) => ({
        id: r.id,
        uploaderNim: r.uploaderNim,
        targetNim: r.targetNim,
        uploaderNama: r.uploaderNama,
        targetNama: r.targetNama,
        timestamp: r.timestamp,
        photoFileName: r.photoFileName,
        driveFileIdA: r.driveFileIdA,
        driveFileIdB: r.driveFileIdB,
        driveFolderUrl: r.driveFolderUrl,
      }));
      localStorage.setItem(PHOTO_STORAGE_KEY, JSON.stringify(minimal));
    } catch {
      // Entirely safe fallback: ignore localStorage write, records remain active in IndexedDB & memory
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

export function matchPairRecord(
  r: PhotoRecord,
  nim1?: string,
  nim2?: string
): boolean {
  if (!nim1 || !nim2) return false;
  const n1 = normalizeNim(nim1);
  const n2 = normalizeNim(nim2);
  if (!n1 || !n2 || n1 === n2) return false;

  const upNorm = normalizeNim(r.uploaderNim);
  const tgNorm = normalizeNim(r.targetNim);

  // 1. Direct match on uploader and target NIMs in either direction
  if (
    (upNorm === n1 && tgNorm === n2) ||
    (upNorm === n2 && tgNorm === n1)
  ) {
    return true;
  }

  // 2. Pair key match (e.g. "F1D02610007_F1D02610036", "f1d02610007_f1d02610036")
  if (r.pairKey) {
    const pkNorm = normalizeNim(r.pairKey);
    if (pkNorm === `${n1}${n2}` || pkNorm === `${n2}${n1}`) {
      return true;
    }
    const pkParts = r.pairKey.split(/[_|:-]/).map(normalizeNim).filter(Boolean);
    if (pkParts.length >= 2) {
      if (
        (pkParts.includes(n1) && pkParts.includes(n2)) ||
        (pkParts[0] === n1 && pkParts[1] === n2) ||
        (pkParts[0] === n2 && pkParts[1] === n1)
      ) {
        return true;
      }
    }
    if (pkNorm.includes(n1) && pkNorm.includes(n2)) {
      return true;
    }
  }

  // 3. Fallback check on ID containing both NIMs
  if (r.id) {
    const idNorm = normalizeNim(r.id);
    if (idNorm.includes(n1) && idNorm.includes(n2)) {
      return true;
    }
  }

  return false;
}

export function hasTakenPhoto(
  records: PhotoRecord[],
  nim1?: string,
  nim2?: string
): boolean {
  if (!Array.isArray(records) || !nim1 || !nim2) return false;
  return records.some((r) => matchPairRecord(r, nim1, nim2));
}

export function getTakenNimSet(records: PhotoRecord[], userNim?: string): Set<string> {
  const set = new Set<string>();
  if (!Array.isArray(records) || !userNim) return set;
  const target = normalizeNim(userNim);
  for (const r of records) {
    const up = normalizeNim(r.uploaderNim);
    const tg = normalizeNim(r.targetNim);
    if (up === target && tg) {
      set.add(tg);
    } else if (tg === target && up) {
      set.add(up);
    } else if (r.pairKey) {
      const parts = r.pairKey.split(/[_|:-]/).map(normalizeNim).filter(Boolean);
      if (parts.length >= 2) {
        if (parts[0] === target && parts[1]) set.add(parts[1]);
        if (parts[1] === target && parts[0]) set.add(parts[0]);
      }
    }
  }
  return set;
}

export function getPhotoWithTarget(
  records: PhotoRecord[],
  nim1?: string,
  nim2?: string
): PhotoRecord | undefined {
  if (!Array.isArray(records) || !nim1 || !nim2) return undefined;
  return records.find((r) => matchPairRecord(r, nim1, nim2));
}

export function mergePhotoRecords(
  local: PhotoRecord[] = [],
  remote: PhotoRecord[] | null = []
): PhotoRecord[] {
  // If remote fetch failed or offline (remote is null), fallback to local cache
  if (remote === null) {
    return local || [];
  }

  const map = new Map<string, PhotoRecord>();

  const getRecordKey = (r: PhotoRecord): string => {
    let n1 = normalizeNim(r.uploaderNim);
    let n2 = normalizeNim(r.targetNim);

    if ((!n1 || !n2) && r.pairKey) {
      const parts = r.pairKey.split(/[_|:-]/).map(normalizeNim).filter(Boolean);
      if (parts.length >= 2) {
        n1 = parts[0];
        n2 = parts[1];
      }
    }

    if (n1 && n2) {
      return n1 < n2 ? `${n1}_${n2}` : `${n2}_${n1}`;
    }
    if (r.pairKey) {
      return normalizeNim(r.pairKey);
    }
    return r.id || Math.random().toString();
  };

  // 1. Put local records
  (local || []).forEach((r) => {
    const key = getRecordKey(r);
    if (key) map.set(key, r);
  });

  // 2. Merge remote records (authoritative for Drive IDs / URLs, retaining local previews)
  (remote || []).forEach((r) => {
    const key = getRecordKey(r);
    const existing = map.get(key);
    map.set(key, {
      ...existing,
      ...r,
      uploaderNim: r.uploaderNim || existing?.uploaderNim || '',
      targetNim: r.targetNim || existing?.targetNim || '',
      photoUrl: r.photoUrl || existing?.photoUrl,
      photoFileName: r.photoFileName || existing?.photoFileName,
      driveFolderUrl: r.driveFolderUrl || existing?.driveFolderUrl,
      driveFileIdA: r.driveFileIdA || existing?.driveFileIdA,
      driveFileIdB: r.driveFileIdB || existing?.driveFileIdB,
      photoUrlA: r.photoUrlA || existing?.photoUrlA,
      photoUrlB: r.photoUrlB || existing?.photoUrlB,
      pairKey: r.pairKey || existing?.pairKey,
    });
  });

  return Array.from(map.values());
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
  
  // Extract group ID from kelompok string (e.g. "Kelompok 1" -> "1")
  const groupIdMatch = target.kelompok?.match(/\d+/);
  const groupId = groupIdMatch ? groupIdMatch[0] : '0';
  
  const fileName = `${groupId}_${target.namaLengkap}_${cleanNim}.jpg`;

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
