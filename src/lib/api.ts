/**
 * API Client for interacting with the Supabase Edge Function
 * Endpoint: https://fwhapumjpfbqirmqqwrm.supabase.co/functions/v1/logika
 */

export const SUPABASE_EDGE_FUNCTION_URL =
  'https://fwhapumjpfbqirmqqwrm.supabase.co/functions/v1/logika';

export interface UpdateProfileParams {
  nim: string;
  updates: {
    nama_lengkap?: string;
    nama_panggilan?: string;
    kelompok?: string;
    no_wa?: string;
    email?: string;
    asal_rumah?: string;
    alamat_domisili?: string;
    hobi?: string;
    drive_folder_url?: string;
    [key: string]: unknown;
  };
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

export interface UploadPhotoResponse {
  success?: boolean;
  message?: string;
  log_id?: string;
  drive_file_id?: string;
  file_url?: string;
  [key: string]: unknown;
}

/**
 * 1. Update Profile Mahasiswa
 * Action: ?action=update-profile (POST)
 */
export async function updateProfilUser(
  nimUser: string,
  dataBaru: UpdateProfileParams['updates']
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    const response = await fetch(`${SUPABASE_EDGE_FUNCTION_URL}?action=update-profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nim: nimUser,
        updates: dataBaru,
      }),
    });

    const result = await response.json().catch(() => null);

    if (!response.ok) {
      const errMsg = (result && (result.error || result.message)) || `Gagal update profil (${response.status})`;
      return { success: false, error: errMsg };
    }

    return { success: true, data: result };
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
 * Action: ?action=upload-photo (POST FormData)
 * Format penamaan otomatis:
 * - Folder User A: "<nomor_urut>. <NamaTemanB>_<NIM_B>.<ext>"
 * - Folder User B: "<nomor_urut>. <NamaTemanA>_<NIM_A>.<ext>"
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

  const rawExt = file.name.substring(file.name.lastIndexOf('.')) || '.jpg';
  const cleanNameA = (namaA || 'Mahasiswa').replace(/[/\\?%*:|"<>]/g, '').trim();
  const cleanNimA = (nimA || '').trim();
  const cleanNameB = (namaB || 'Mahasiswa').replace(/[/\\?%*:|"<>]/g, '').trim();
  const cleanNimB = (nimB || '').trim();

  // File name for User A's folder: Target Student B's name & NIM
  const fileNameA = `${totalFotoA + 1}. ${cleanNameB}_${cleanNimB}${rawExt}`;
  // File name for User B's folder: Uploader Student A's name & NIM
  const fileNameB = `${totalFotoB + 1}. ${cleanNameA}_${cleanNimA}${rawExt}`;

  const cleanFolderIdA = extractDriveFolderId(folderIdA) || folderIdA;
  const cleanFolderIdB = extractDriveFolderId(folderIdB) || folderIdB || cleanFolderIdA;

  // Re-create File objects to ensure file.name in browser FormData is explicitly set to formatted fileName
  const renamedFileA = new File([file], fileNameA, { type: file.type || 'image/jpeg' });
  const renamedFileB = new File([file], fileNameB, { type: file.type || 'image/jpeg' });

  const formData = new FormData();
  formData.append('file', renamedFileA, fileNameA);
  formData.append('file_a', renamedFileA, fileNameA);
  formData.append('file_b', renamedFileB, fileNameB);
  formData.append('user_a_nim', nimA);
  formData.append('user_b_nim', nimB);
  formData.append('nim_a', nimA);
  formData.append('nim_b', nimB);

  // New dual-upload parameters (PhotoService full & adaptive backend)
  formData.append('folder_id_a', cleanFolderIdA);
  formData.append('folder_id_b', cleanFolderIdB);
  formData.append('file_name_a', fileNameA);
  formData.append('file_name_b', fileNameB);
  formData.append('name_a', fileNameA);
  formData.append('name_b', fileNameB);

  // Legacy single-upload parameters for fallback
  formData.append('target_folder_id', cleanFolderIdB || cleanFolderIdA);
  formData.append('folder_id', cleanFolderIdB || cleanFolderIdA);
  formData.append('file_name', fileNameA);
  formData.append('name', fileNameA);
  formData.append('filename', fileNameA);

  try {
    const response = await fetch(`${SUPABASE_EDGE_FUNCTION_URL}?action=upload-photo`, {
      method: 'POST',
      body: formData, // Browser sets multipart/form-data boundary automatically
    });

    const result: UploadPhotoResponse = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errMsg =
        result?.message || result?.error || `Upload gagal dengan kode status ${response.status}`;
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
 * Action: ?action=delete-photo (DELETE)
 */
export async function hapusFotoSalah(
  logIdDatabase: string,
  driveFileIdA?: string,
  driveFileIdB?: string
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    const response = await fetch(`${SUPABASE_EDGE_FUNCTION_URL}?action=delete-photo`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        log_id: logIdDatabase,
        drive_file_id_a: driveFileIdA,
        drive_file_id_b: driveFileIdB,
        drive_file_id: driveFileIdA || driveFileIdB, // Fallback for single column schema
      }),
    });

    const result = await response.json().catch(() => null);

    if (!response.ok) {
      const errMsg = (result && (result.error || result.message)) || `Gagal menghapus (${response.status})`;
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
