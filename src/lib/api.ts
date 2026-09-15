/**
 * API Client for interacting with the Supabase Edge Function
 * Endpoint: https://fwhapumjpfbqirmqqwrm.supabase.co/functions/v1/logika
 */

export const SUPABASE_EDGE_FUNCTION_URL =
  'https://fwhapumjpfbqirmqqwrm.supabase.co/functions/v1/logika';

export const DEFAULT_DRIVE_FOLDER_ID = '1oqXx0wzzKkkZajuBuC9xhv-pF6wDPPEX';
export const DEFAULT_DRIVE_FOLDER_URL =
  'https://drive.google.com/drive/folders/1oqXx0wzzKkkZajuBuC9xhv-pF6wDPPEX';

export interface UpdateProfileParams {
  nim: string;
  nama_lengkap?: string;
  nama_panggilan?: string;
  email?: string;
  asal_rumah?: string;
  alamat_domisili?: string;
  hobi?: string;
  no_wa?: string;
  group_id?: number;
  kelompok?: string;
  drive_folder_id?: string;
  drive_folder_url?: string;
  updates?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface DriveFileItem {
  id?: string;
  name?: string;
  mimeType?: string;
  thumbnailLink?: string;
  webViewLink?: string;
  webContentLink?: string;
  createdTime?: string;
  [key: string]: unknown;
}

export interface PhotoLogData {
  id?: number;
  pair_key?: string;
  user_a_nim?: string;
  user_b_nim?: string;
  drive_file_id_a?: string;
  photo_url_a?: string;
  drive_file_id_b?: string;
  photo_url_b?: string;
  created_at?: string;
  [key: string]: unknown;
}

export interface UploadPhotoResponse {
  success?: boolean;
  is_duplicate?: boolean;
  message?: string;
  data?: PhotoLogData;
  error?: string;
  [key: string]: unknown;
}

/**
 * 1. Update Profile Mahasiswa
 * Endpoint: PUT/POST /update-profile or POST /
 * Mengirim field sesuai ProfileService:
 * nama_lengkap, nama_panggilan, email, asal_rumah, alamat_domisili, hobi, no_wa, group_id, drive_folder_id, drive_folder_url
 */
export async function updateProfilUser(
  nimUser: string,
  dataBaru: Partial<UpdateProfileParams> & Record<string, unknown>
): Promise<{ success: boolean; data?: unknown; message?: string; error?: string }> {
  try {
    const cleanNim = String(nimUser).trim();
    if (!cleanNim) {
      return { success: false, error: 'NIM wajib disertakan untuk memperbarui profil.' };
    }

    // Prepare payload exactly according to allowedFields in ProfileService
    const payload: Record<string, unknown> = {
      nim: cleanNim,
    };

    // Extract fields whether passed top-level or inside .updates
    const source = (dataBaru.updates || dataBaru) as Record<string, unknown>;

    if (source.nama_lengkap !== undefined) payload.nama_lengkap = String(source.nama_lengkap).trim();
    if (source.nama_panggilan !== undefined) payload.nama_panggilan = String(source.nama_panggilan).trim();
    if (source.email !== undefined) payload.email = String(source.email).trim();
    if (source.asal_rumah !== undefined) payload.asal_rumah = String(source.asal_rumah).trim();
    if (source.alamat_domisili !== undefined) payload.alamat_domisili = String(source.alamat_domisili).trim();
    if (source.hobi !== undefined) payload.hobi = String(source.hobi).trim();
    if (source.no_wa !== undefined) payload.no_wa = String(source.no_wa).trim();

    // Map group_id
    if (source.group_id !== undefined && !isNaN(Number(source.group_id))) {
      payload.group_id = Number(source.group_id);
    } else if (source.kelompok !== undefined) {
      const match = String(source.kelompok).match(/(\d+)/);
      if (match) {
        payload.group_id = parseInt(match[1], 10);
      }
    }

    // Map drive folder
    if (source.drive_folder_url !== undefined) {
      payload.drive_folder_url = String(source.drive_folder_url).trim();
      const extractedId = extractDriveFolderId(String(source.drive_folder_url));
      if (extractedId) {
        payload.drive_folder_id = extractedId;
      }
    } else if (source.drive_folder_id !== undefined) {
      payload.drive_folder_id = String(source.drive_folder_id).trim();
    }

    // Try primary route /update-profile
    let response = await fetch(`${SUPABASE_EDGE_FUNCTION_URL}/update-profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => null);

    // Fallback if subpath routing is not enabled or returns 404/405
    if (!response || response.status === 404 || response.status === 405) {
      response = await fetch(`${SUPABASE_EDGE_FUNCTION_URL}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(() => null);
    }

    if (!response) {
      return { success: false, error: 'Tidak dapat terhubung ke server Supabase Edge Function.' };
    }

    const result = await response.json().catch(() => null);

    if (!response.ok) {
      const errMsg =
        (result && (result.error || result.message)) || `Gagal update profil (${response.status})`;
      return { success: false, error: errMsg };
    }

    return {
      success: true,
      message: result?.message || 'Profil berhasil diperbarui!',
      data: result?.data || result,
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Koneksi ke server gagal saat update profil';
    console.error('Gagal update profil:', error);
    return { success: false, error: msg };
  }
}

/**
 * 2. Cek Status / List Foto di Drive Teman
 * Action: ?action=list-drive&folder_id=... (GET)
 */
export async function cekFotoDiDrive(
  folderIdTeman: string
): Promise<{ success: boolean; files?: DriveFileItem[]; count?: number; error?: string }> {
  if (!folderIdTeman) {
    return { success: false, error: 'Folder ID tidak valid', files: [] };
  }

  try {
    const cleanFolderId = extractDriveFolderId(folderIdTeman) || folderIdTeman;
    const response = await fetch(
      `${SUPABASE_EDGE_FUNCTION_URL}?action=list-drive&folder_id=${encodeURIComponent(cleanFolderId)}`
    );

    const result = await response.json().catch(() => null);

    if (!response.ok) {
      const errMsg = (result && (result.error || result.message)) || `Gagal mengecek drive (${response.status})`;
      return { success: false, error: errMsg, files: [] };
    }

    const files: DriveFileItem[] = Array.isArray(result)
      ? result
      : Array.isArray(result?.files)
      ? result.files
      : [];

    return { success: true, files, count: files.length, data: result } as unknown as {
      success: boolean;
      files: DriveFileItem[];
      count: number;
      error?: string;
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Koneksi ke server gagal saat cek drive';
    console.error('Gagal mengecek drive:', error);
    return { success: false, error: msg, files: [] };
  }
}

/**
 * 3. Upload Foto Bersama ke Google Drive via Edge Function
 * Sesuai PhotoService:
 * Endpoint: POST /upload-photo atau POST / (multipart/form-data)
 * Parameter Wajib:
 * - file
 * - user_a_nim
 * - user_b_nim
 * - folder_id_a
 * - folder_id_b
 * Parameter Opsional:
 * - user_a_nama
 * - user_b_nama
 * - file_name_a / name_a
 * - file_name_b / name_b
 */
export async function uploadFotoBersama(params: {
  file: File;
  nimA: string; // Uploader (User A)
  nimB: string; // Target student (User B)
  namaA?: string;
  namaB?: string;
  folderIdA?: string; // Uploader's Drive folder ID
  folderIdB?: string; // Target student's Drive folder ID
  totalFotoA?: number;
  totalFotoB?: number;
  // Legacy compatibility params
  folderIdTarget?: string;
  namaTeman?: string;
  totalFotoSekarang?: number;
}): Promise<{ success: boolean; data?: UploadPhotoResponse; error?: string }> {
  const {
    file,
    nimA,
    nimB,
    namaA = 'Mahasiswa A',
    namaB = params.namaTeman || 'Mahasiswa B',
    folderIdA = '',
    folderIdB = params.folderIdTarget || '',
    totalFotoA = params.totalFotoSekarang || 0,
    totalFotoB = 0,
  } = params;

  if (!file) {
    return { success: false, error: 'File foto belum dipilih.' };
  }

  const cleanNimA = (nimA || '').trim();
  const cleanNimB = (nimB || '').trim();

  if (!cleanNimA || !cleanNimB) {
    return { success: false, error: 'NIM pengunggah dan NIM teman wajib diisi.' };
  }

  const rawExt = file.name.substring(file.name.lastIndexOf('.')) || '.jpg';
  const cleanNameA = (namaA || 'Mahasiswa').replace(/[/\\?%*:|"<>]/g, '').trim();
  const cleanNameB = (namaB || 'Mahasiswa').replace(/[/\\?%*:|"<>]/g, '').trim();

  // File name for User A's folder: Target Student B's name & NIM
  const fileNameA = `${totalFotoA + 1}. ${cleanNameB}_${cleanNimB}${rawExt}`;
  // File name for User B's folder: Uploader Student A's name & NIM
  const fileNameB = `${totalFotoB + 1}. ${cleanNameA}_${cleanNimA}${rawExt}`;

  // Ensure folder IDs are valid strings (never empty, fallback to default master folder)
  const cleanFolderIdA =
    extractDriveFolderId(folderIdA) || DEFAULT_DRIVE_FOLDER_ID;
  const cleanFolderIdB =
    extractDriveFolderId(folderIdB) || cleanFolderIdA || DEFAULT_DRIVE_FOLDER_ID;

  // Re-create File objects to ensure file.name in browser FormData is explicitly set
  const renamedFileA = new File([file], fileNameA, { type: file.type || 'image/jpeg' });

  const formData = new FormData();
  // Required fields according to PhotoService
  formData.append('file', renamedFileA, fileNameA);
  formData.append('user_a_nim', cleanNimA);
  formData.append('user_b_nim', cleanNimB);
  formData.append('folder_id_a', cleanFolderIdA);
  formData.append('folder_id_b', cleanFolderIdB);

  // Optional and helper fields
  formData.append('user_a_nama', cleanNameA);
  formData.append('user_b_nama', cleanNameB);
  formData.append('file_name_a', fileNameA);
  formData.append('file_name_b', fileNameB);
  formData.append('name_a', fileNameA);
  formData.append('name_b', fileNameB);
  formData.append('file_name', fileNameA);

  try {
    // Try primary route /upload-photo
    let response = await fetch(`${SUPABASE_EDGE_FUNCTION_URL}/upload-photo`, {
      method: 'POST',
      body: formData,
    }).catch(() => null);

    // Fallback if subpath routing returns 404/405
    if (!response || response.status === 404 || response.status === 405) {
      response = await fetch(`${SUPABASE_EDGE_FUNCTION_URL}`, {
        method: 'POST',
        body: formData,
      }).catch(() => null);
    }

    if (!response) {
      return { success: false, error: 'Tidak dapat terhubung ke server upload Supabase.' };
    }

    const result: UploadPhotoResponse = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errMsg =
        result?.error || result?.message || `Upload gagal dengan kode status ${response.status}`;
      return { success: false, error: String(errMsg) };
    }

    return { success: true, data: result };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Koneksi ke backend upload gagal';
    console.error('Upload gagal:', error);
    return { success: false, error: msg };
  }
}

/**
 * 4. Hapus Foto dari Google Drive & Database
 * Sesuai PhotoService:
 * Endpoint: DELETE /delete-photo atau DELETE /
 * Body JSON: { log_id: number, drive_file_id_a?: string, drive_file_id_b?: string }
 */
export async function hapusFotoSalah(
  logIdDatabase: string | number,
  driveFileIdA?: string,
  driveFileIdB?: string
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    const numericLogId =
      typeof logIdDatabase === 'number'
        ? logIdDatabase
        : parseInt(String(logIdDatabase), 10) || 0;

    if (!numericLogId) {
      return { success: false, error: 'log_id wajib diisi untuk menghapus foto.' };
    }

    const payload = {
      log_id: numericLogId,
      drive_file_id_a: driveFileIdA || undefined,
      drive_file_id_b: driveFileIdB || undefined,
    };

    // Try primary route /delete-photo
    let response = await fetch(`${SUPABASE_EDGE_FUNCTION_URL}/delete-photo`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => null);

    // Fallback to root DELETE
    if (!response || response.status === 404 || response.status === 405) {
      response = await fetch(`${SUPABASE_EDGE_FUNCTION_URL}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(() => null);
    }

    if (!response) {
      return { success: false, error: 'Tidak dapat terhubung ke server penghapusan.' };
    }

    const result = await response.json().catch(() => null);

    if (!response.ok) {
      const errMsg =
        (result && (result.error || result.message)) || `Gagal menghapus (${response.status})`;
      return { success: false, error: errMsg };
    }

    return { success: true, data: result };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Koneksi ke server gagal saat menghapus foto';
    console.error('Gagal menghapus:', error);
    return { success: false, error: msg };
  }
}

/**
 * Helper to extract raw folder ID if user entered a full Google Drive URL
 */
export function extractDriveFolderId(urlOrId: string): string {
  if (!urlOrId) return '';
  const trimmed = urlOrId.trim();
  const folderMatch = trimmed.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch && folderMatch[1]) {
    return folderMatch[1];
  }
  const idMatch = trimmed.match(/id=([a-zA-Z0-9_-]+)/);
  if (idMatch && idMatch[1]) {
    return idMatch[1];
  }
  // If it's already an ID
  if (/^[a-zA-Z0-9_-]{15,}$/.test(trimmed)) {
    return trimmed;
  }
  return trimmed;
}
