import { getIntuitiveErrorMessage } from './errorHandler';
import { ReportRequest } from '../types';
import { SUPABASE_ANON_KEY_IN_CODE, getSupabaseClient, getActiveSupabaseConfig } from './supabase';

/**
 * Helper to build Edge Function authorization and API key headers
 */
export function getEdgeFunctionHeaders(customHeaders?: Record<string, string>): Record<string, string> {
  const config = getActiveSupabaseConfig();
  const headers: Record<string, string> = {
    ...customHeaders,
  };
  const key = config.anonKey || SUPABASE_ANON_KEY_IN_CODE;
  if (key) {
    headers['apikey'] = key;
    headers['Authorization'] = `Bearer ${key}`;
  }
  return headers;
}

/**
 * API Client for interacting with the Supabase Edge Function
 * Endpoint: https://cvjjdsxguzuhnnnxneec.supabase.co/functions/v1/logika
 */

export const SUPABASE_EDGE_FUNCTION_URL =
  'https://cvjjdsxguzuhnnnxneec.supabase.co/functions/v1/logika';

export const EDGE_FUNCTION_CANDIDATE_URLS = [
  'https://cvjjdsxguzuhnnnxneec.supabase.co/functions/v1/logika',
];

export const DEFAULT_DRIVE_FOLDER_ID = '1MuAMDF9gyKuOjGwBiT8vWvVuyfFAELSd';
export const DEFAULT_DRIVE_FOLDER_URL =
  'https://drive.google.com/drive/folders/1MuAMDF9gyKuOjGwBiT8vWvVuyfFAELSd';

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

    const jsonHeaders = getEdgeFunctionHeaders({ 'Content-Type': 'application/json' });

    // Try primary route /update-profile
    let response = await fetch(`${SUPABASE_EDGE_FUNCTION_URL}/update-profile`, {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify(payload),
    }).catch(() => null);

    // Fallback if subpath routing is not enabled or returns 404/405
    if (!response || response.status === 404 || response.status === 405) {
      response = await fetch(`${SUPABASE_EDGE_FUNCTION_URL}`, {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify(payload),
      }).catch(() => null);
    }

    if (!response) {
      return { success: false, error: 'Tidak dapat terhubung ke server aplikasi. Silakan periksa koneksi internet Anda atau coba lagi nanti.' };
    }

    const result = await response.json().catch(() => null);

    if (!response.ok) {
      const rawErr =
        (result && (result.error || result.message)) || `Gagal update profil (HTTP ${response.status})`;
      return { success: false, error: getIntuitiveErrorMessage({ status: response.status, message: rawErr }) };
    }

    return {
      success: true,
      message: result?.message || 'Profil berhasil diperbarui!',
      data: result?.data || result,
    };
  } catch (error: unknown) {
    const msg = getIntuitiveErrorMessage(error, 'Koneksi ke server gagal saat update profil.');
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
      `${SUPABASE_EDGE_FUNCTION_URL}?action=list-drive&folder_id=${encodeURIComponent(cleanFolderId)}`,
      { headers: getEdgeFunctionHeaders() }
    );

    const result = await response.json().catch(() => null);

    if (!response.ok) {
      const rawErr = (result && (result.error || result.message)) || `Gagal mengecek drive (${response.status})`;
      return { success: false, error: getIntuitiveErrorMessage({ status: response.status, message: rawErr }), files: [] };
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
    const msg = getIntuitiveErrorMessage(error, 'Koneksi ke server gagal saat mengecek Google Drive.');
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
export interface RawErrorDetail {
  status?: number;
  statusText?: string;
  url?: string;
  headers?: Record<string, string>;
  rawResponseBody?: string;
  parsedResult?: unknown;
}

export async function uploadFotoBersama(params: {
  file: File;
  nimA: string; // Uploader (User A)
  nimB: string; // Target student (User B)
  namaA?: string;
  namaB?: string;
  kelompokA?: string;
  kelompokB?: string;
  folderIdA?: string; // Uploader's Drive folder ID
  folderIdB?: string; // Target student's Drive folder ID
  totalFotoA?: number;
  totalFotoB?: number;
  // Legacy compatibility params
  folderIdTarget?: string;
  namaTeman?: string;
  totalFotoSekarang?: number;
}): Promise<{ success: boolean; data?: UploadPhotoResponse; error?: string; rawError?: RawErrorDetail }> {
  const {
    file,
    nimA,
    nimB,
    namaA = 'Mahasiswa A',
    namaB = params.namaTeman || 'Mahasiswa B',
    kelompokA = '',
    kelompokB = '',
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

  // Extract numeric group ID if present, otherwise default to sequence
  const groupIdA = kelompokA?.match(/\d+/)?.[0] || String(totalFotoB + 1);
  const groupIdB = kelompokB?.match(/\d+/)?.[0] || String(totalFotoA + 1);

  // File name for User A's folder: Group ID of B _ Target Student B's name _ NIM B
  const fileNameA = `${groupIdB}_${cleanNameB}_${cleanNimB}${rawExt}`;
  // File name for User B's folder: Group ID of A _ Uploader Student A's name _ NIM A
  const fileNameB = `${groupIdA}_${cleanNameA}_${cleanNimA}${rawExt}`;

  // Ensure folder IDs are valid strings (never empty, fallback to default master system folder)
  const cleanFolderIdA =
    extractDriveFolderId(folderIdA) || DEFAULT_DRIVE_FOLDER_ID;
  const cleanFolderIdB =
    extractDriveFolderId(folderIdB) || DEFAULT_DRIVE_FOLDER_ID;

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
  formData.append('user_a_kelompok', kelompokA || '');
  formData.append('user_b_kelompok', kelompokB || '');
  formData.append('file_name_a', fileNameA);
  formData.append('file_name_b', fileNameB);
  formData.append('name_a', fileNameA);
  formData.append('name_b', fileNameB);
  formData.append('file_name', fileNameA);

  const edgeHeaders = getEdgeFunctionHeaders();

  try {
    // Try primary route /upload-photo
    let response = await fetch(`${SUPABASE_EDGE_FUNCTION_URL}/upload-photo`, {
      method: 'POST',
      headers: edgeHeaders,
      body: formData,
    }).catch((networkErr) => {
      console.warn('Primary Edge function endpoint fetch error:', networkErr);
      return null;
    });

    // Fallback if subpath routing returns 404/405
    if (!response || response.status === 404 || response.status === 405) {
      response = await fetch(`${SUPABASE_EDGE_FUNCTION_URL}`, {
        method: 'POST',
        headers: edgeHeaders,
        body: formData,
      }).catch((networkErr) => {
        console.warn('Fallback Edge function endpoint fetch error:', networkErr);
        return null;
      });
    }

    if (!response) {
      const connErr = 'Tidak dapat terhubung ke server penyimpanan foto. Silakan periksa koneksi internet Anda atau coba lagi nanti.';
      console.error('Edge function upload error (FULL RAW - NO CONNECTION):', {
        endpoint: SUPABASE_EDGE_FUNCTION_URL,
        headersSent: edgeHeaders,
      });
      return { success: false, error: connErr };
    }

    const rawText = await response.text().catch(() => '');
    let result: UploadPhotoResponse = {};
    try {
      result = JSON.parse(rawText);
    } catch {
      result = { error: rawText };
    }

    if (!response.ok) {
      const responseHeadersObj: Record<string, string> = {};
      try {
        response.headers.forEach((val, key) => {
          responseHeadersObj[key] = val;
        });
      } catch {
        // Ignore header iteration errors
      }

      const fullRawDetails: RawErrorDetail = {
        status: response.status,
        statusText: response.statusText,
        url: response.url,
        headers: responseHeadersObj,
        rawResponseBody: rawText,
        parsedResult: result,
      };

      const rawErr = result?.error || result?.message || rawText || response.statusText;

      // Keep full technical diagnostics in website developer logs
      console.error('[WEBSITE ERROR LOG: Edge function upload error]:', {
        ...fullRawDetails,
        rawErrorMessage: rawErr,
      });

      // Convert to clean, intuitive, user-friendly message for website UI
      const userFacingError = getIntuitiveErrorMessage(
        result?.error || result?.message || { status: response.status, message: rawText || response.statusText },
        'Gagal mengunggah foto ke Google Drive.'
      );

      return {
        success: false,
        error: userFacingError,
        rawError: fullRawDetails,
      };
    }

    return { success: true, data: result };
  } catch (error: unknown) {
    const errorString = error instanceof Error ? error.stack || error.message : String(error);
    const fullRawDetails: RawErrorDetail = {
      status: 0,
      statusText: 'Network / Client Error',
      url: `${SUPABASE_EDGE_FUNCTION_URL}/upload-photo`,
      rawResponseBody: errorString,
    };
    // Keep raw technical exception in website console logs
    console.error('[WEBSITE ERROR LOG: Edge function upload exception]:', fullRawDetails);
    const msg = getIntuitiveErrorMessage(error, 'Koneksi ke server penyimpanan terputus.');
    return { success: false, error: msg, rawError: fullRawDetails };
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
      return { success: false, error: 'Tidak dapat terhubung ke server penghapusan. Silakan coba lagi nanti.' };
    }

    const result = await response.json().catch(() => null);

    if (!response.ok) {
      const rawErr =
        (result && (result.error || result.message)) || `Gagal menghapus (${response.status})`;
      return { success: false, error: getIntuitiveErrorMessage({ status: response.status, message: rawErr }) };
    }

    return { success: true, data: result };
  } catch (error: unknown) {
    const msg = getIntuitiveErrorMessage(error, 'Koneksi ke server gagal saat menghapus foto.');
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

/**
 * Request server-side automated PDF report generation queue
 * Sends POST /request-report with { nim }
 */
export async function requestGenerateReport(
  userNim: string,
  studentName?: string,
  driveFolderId?: string
): Promise<{
  success: boolean;
  message?: string;
  is_already_in_queue?: boolean;
  data?: ReportRequest;
  error?: string;
}> {
  const cleanNim = (userNim || '').trim();
  if (!cleanNim) {
    return { success: false, error: 'NIM wajib disertakan untuk mengajukan pembuatan laporan.' };
  }

  const payload = {
    nim: cleanNim,
    nama_lengkap: studentName,
    drive_folder_id: driveFolderId,
  };
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${SUPABASE_ANON_KEY_IN_CODE}`,
    apikey: SUPABASE_ANON_KEY_IN_CODE,
  };

  // 1. Try candidate Edge Function URLs
  for (const baseUrl of EDGE_FUNCTION_CANDIDATE_URLS) {
    try {
      const response = await fetch(`${baseUrl}/request-report`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const result = await response.json();
        return {
          success: result.success ?? true,
          message: result.message || 'Permintaan laporan berhasil masuk antrean.',
          is_already_in_queue: !!result.is_already_in_queue,
          data: result.data,
        };
      } else if (response.status !== 404 && response.status !== 405) {
        const errJson = await response.json().catch(() => null);
        const errMsg =
          errJson?.error || errJson?.message || `Gagal mengajukan antrean (${response.status})`;
        return {
          success: false,
          error: getIntuitiveErrorMessage({ status: response.status, message: errMsg }),
        };
      }
    } catch (e) {
      console.warn(`Request report failed on ${baseUrl}:`, e);
    }
  }

  // 2. Direct Database Fallback to 'report_requests' table in Supabase
  try {
    const supabase = getSupabaseClient();
    if (supabase) {
      // Check existing pending/processing
      const { data: existing } = await supabase
        .from('report_requests')
        .select('id, nim, status, pdf_url, created_at')
        .eq('nim', cleanNim)
        .in('status', ['pending', 'processing'])
        .maybeSingle();

      if (existing) {
        return {
          success: true,
          is_already_in_queue: true,
          message: `Permintaan laporan Anda sedang diproses dalam antrean dengan status '${String(existing.status).toUpperCase()}'.`,
          data: existing as ReportRequest,
        };
      }

      // Check profile to retrieve drive_folder_id if not provided
      let namaLengkap = studentName || 'Mahasiswa';
      let folderId = driveFolderId || '';

      if (!studentName || !driveFolderId) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('nim, nama_lengkap, drive_folder_id')
          .eq('nim', cleanNim)
          .maybeSingle();

        if (profile) {
          if (!studentName && profile.nama_lengkap) namaLengkap = profile.nama_lengkap;
          if (!driveFolderId && profile.drive_folder_id) folderId = profile.drive_folder_id;
        }
      }

      const newRecord = {
        nim: cleanNim,
        nama_lengkap: namaLengkap,
        drive_folder_id: folderId,
        status: 'pending',
        created_at: new Date().toISOString(),
      };

      const { data: inserted, error: insertErr } = await supabase
        .from('report_requests')
        .insert([newRecord])
        .select()
        .single();

      if (!insertErr && inserted) {
        return {
          success: true,
          message: 'Permintaan laporan Word berhasil dieksekusi dan disimpan di antrean sistem!',
          data: inserted as ReportRequest,
        };
      }
    }
  } catch (dbErr) {
    console.warn('Direct database fallback insert error:', dbErr);
  }

  return {
    success: false,
    error: 'Tidak dapat terhubung ke server antrean laporan. Silakan periksa koneksi Anda.',
  };
}

/**
 * Fetch all report generation requests history for a student
 */
export async function fetchReportHistoryFromSupabase(userNim: string): Promise<ReportRequest[]> {
  const cleanNim = (userNim || '').trim();
  if (!cleanNim) return [];

  try {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase
        .from('report_requests')
        .select('id, nim, nama_lengkap, drive_folder_id, status, pdf_url, error_message, created_at, updated_at')
        .eq('nim', cleanNim)
        .order('created_at', { ascending: false });

      if (!error && data) {
        return data as ReportRequest[];
      }
    }
  } catch (err) {
    console.warn('Error fetching report history from Supabase:', err);
  }

  return [];
}

/**
 * Fetch latest report generation status for a student
 * Calls GET /report-status?nim=...
 */
export async function getReportStatus(userNim: string): Promise<{
  success: boolean;
  data?: ReportRequest;
  error?: string;
}> {
  const cleanNim = (userNim || '').trim();
  if (!cleanNim) {
    return { success: false, error: 'NIM wajib disertakan.' };
  }

  // 1. Direct Database Query to 'report_requests' (Fastest and zero latency)
  try {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { data: latest, error } = await supabase
        .from('report_requests')
        .select('id, nim, status, pdf_url, error_message, created_at, updated_at')
        .eq('nim', cleanNim)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && latest) {
        return {
          success: true,
          data: latest as ReportRequest,
        };
      }
    }
  } catch (err) {
    console.warn('Direct report status DB error:', err);
  }

  // 2. Fallback to candidate Edge Function URLs if DB returned nothing or had an issue
  const headers: Record<string, string> = {
    Authorization: `Bearer ${SUPABASE_ANON_KEY_IN_CODE}`,
    apikey: SUPABASE_ANON_KEY_IN_CODE,
  };

  for (const baseUrl of EDGE_FUNCTION_CANDIDATE_URLS) {
    try {
      const response = await fetch(`${baseUrl}/report-status?nim=${encodeURIComponent(cleanNim)}`, {
        method: 'GET',
        headers,
      });

      if (response.ok) {
        const result = await response.json();
        if (result && result.data) {
          return {
            success: true,
            data: result.data as ReportRequest,
          };
        }
      }
    } catch {
      // Continue
    }
  }

  return {
    success: true,
    data: {
      nim: cleanNim,
      status: 'none',
      message: 'Belum ada riwayat permintaan pembuatan laporan.',
    },
  };
}

