import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Mahasiswa, PhotoRecord, SupabaseConfig, PaymentLog } from '../types';
import { extractDriveFolderId } from './api';
import { getIntuitiveErrorMessage } from './errorHandler';

/**
 * ============================================================================
 * KONFIGURASI DATABASE SUPABASE (SISI KODE)
 * ============================================================================
 * Anda dapat mengisi URL & Anon Key langsung di bawah ini atau melalui file `.env`:
 * - VITE_SUPABASE_URL
 * - VITE_SUPABASE_ANON_KEY
 * - VITE_SUPABASE_TABLE (default: 'profiles')
 */
export const SUPABASE_URL_IN_CODE = 'https://fwhapumjpfbqirmqqwrm.supabase.co';
export const SUPABASE_ANON_KEY_IN_CODE =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3aGFwdW1qcGZicWlybXFxd3JtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkxODg4MDEsImV4cCI6MjEwNDc2NDgwMX0.kHNsSdg2d_P4iQOpdut7MXXGtDrjwN8DrCjH5E5WJlw';

export const DEFAULT_PROFILES_TABLE = 'profiles';
export const DEFAULT_GROUPS_TABLE = 'groups';
export const DEFAULT_PHOTO_LOGS_TABLE = 'photo_logs';
export const DEFAULT_TABLE_NAME = 'profiles';
export const DEFAULT_PHOTO_TRACKING_TABLE = 'photo_tracking';

// Default 10 Seed Groups matching SQL schema
export const DEFAULT_GROUPS: Record<number, string> = {
  1: 'KELOMPOK 1 FIREWALL',
  2: 'KELOMPOK 2 SWITCH',
  3: 'KELOMPOK 3 SERVER',
  4: 'KELOMPOK 4 CLIENT',
  5: 'KELOMPOK 5 NODE',
  6: 'KELOMPOK 6 HOST',
  7: 'KELOMPOK 7 GATEWAY',
  8: 'KELOMPOK 8 PROXY',
  9: 'KELOMPOK 9 ROUTER',
  10: 'KELOMPOK 10 PORT',
};

// Empty initial sample - all data strictly loaded from Supabase database
export const SAMPLE_MAHASISWA: Mahasiswa[] = [];

let cachedClient: SupabaseClient | null = null;
let cachedConfigKey = '';

export function getActiveSupabaseConfig(): SupabaseConfig {
  const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env || {};

  let url = (env.VITE_SUPABASE_URL || SUPABASE_URL_IN_CODE || '').trim();
  // Strip trailing /rest/v1 or trailing slashes if present
  url = url.replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '');

  const anonKey = (env.VITE_SUPABASE_ANON_KEY || SUPABASE_ANON_KEY_IN_CODE || '').trim();
  const tableName = (env.VITE_SUPABASE_TABLE || DEFAULT_PROFILES_TABLE).trim();

  return {
    url,
    anonKey,
    tableName,
  };
}

export function saveSupabaseConfig(_config: SupabaseConfig): void {
  // No-op for in-code configuration
  cachedClient = null;
  cachedConfigKey = '';
}

export function removeSupabaseConfig(): void {
  cachedClient = null;
  cachedConfigKey = '';
}

export function getSupabaseClient(customConfig?: SupabaseConfig): SupabaseClient | null {
  const config = customConfig || getActiveSupabaseConfig();
  if (!config.url || !config.anonKey) return null;

  const currentKey = `${config.url}_${config.anonKey}`;
  if (cachedClient && cachedConfigKey === currentKey) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(config.url, config.anonKey, {
      auth: { persistSession: false },
      global: {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
        },
        fetch: (input, init) => {
          return fetch(input, {
            ...init,
            cache: 'no-store',
          });
        },
      },
    });
    cachedConfigKey = currentKey;
    return cachedClient;
  } catch (err) {
    console.error('Failed to create Supabase client:', err);
    return null;
  }
}

// Robust column finder that handles exact case, lowercase, snake_case, etc.
function findValue(row: Record<string, unknown>, keys: string[]): string {
  const rowKeys = Object.keys(row);

  for (const key of keys) {
    // 1. Exact match
    if (row[key] !== undefined && row[key] !== null) {
      return String(row[key]).trim();
    }

    // 2. Case-insensitive and trimmed match
    const lowerTarget = key.toLowerCase().replace(/[\s/_-]+/g, '');
    const matchedKey = rowKeys.find(
      (rk) => rk.toLowerCase().replace(/[\s/_-]+/g, '') === lowerTarget
    );

    if (matchedKey && row[matchedKey] !== undefined && row[matchedKey] !== null) {
      return String(row[matchedKey]).trim();
    }
  }

  return '';
}

export function normalizeMahasiswaRow(
  row: Record<string, unknown>,
  index: number,
  groupMap?: Record<number, string>
): Mahasiswa {
  const timestamp = findValue(row, [
    'timestamp_gform',
    'created_at',
    'Timestamp',
    'timestamp',
    'waktu',
  ]);
  const email = findValue(row, ['email', 'Email Address', 'Email', 'email_address', 'alamat_email']);
  const namaLengkap = findValue(row, [
    'nama_lengkap',
    'Nama Lengkap',
    'Nama',
    'nama',
    'full_name',
    'name',
  ]);
  const namaPanggilan = findValue(row, ['nama_panggilan', 'Nama Panggilan', 'panggilan', 'nickname']);
  const nim = findValue(row, ['nim', 'NIM', 'nrp', 'nomor_induk', 'id_mahasiswa']);
  const asalRumah = findValue(row, [
    'asal_rumah',
    'ASAL RUMAH',
    'Asal Rumah',
    'asal',
    'kota_asal',
    'origin',
  ]);
  const alamatRumahDomisili = findValue(row, [
    'alamat_domisili',
    'alamat_rumah_domisili',
    'ALAMAT RUMAH/DOMISILI',
    'Alamat Rumah/Domisili',
    'ALAMAT RUMAH / DOMISILI',
    'alamat',
    'domisili',
    'address',
  ]);
  const hobi = findValue(row, ['hobi', 'HOBI', 'Hobi', 'hobby', 'hobbies', 'minat']);
  const noWa = findValue(row, ['no_wa', 'NO WA', 'No WA', 'nomor_wa', 'whatsapp', 'wa', 'phone', 'telepon']);

  // Check group name directly or from group_id FK
  let kelompok = findValue(row, ['kelompok', 'KELOMPOK', 'Kelompok', 'group', 'team']);
  if (!kelompok) {
    const rawGroupId = row.group_id !== undefined ? Number(row.group_id) : undefined;
    if (rawGroupId !== undefined && !isNaN(rawGroupId)) {
      if (groupMap && groupMap[rawGroupId]) {
        kelompok = groupMap[rawGroupId];
      } else if (DEFAULT_GROUPS[rawGroupId]) {
        kelompok = DEFAULT_GROUPS[rawGroupId];
      } else {
        kelompok = `Kelompok ${rawGroupId}`;
      }
    }
  }

  const driveFolderUrl = findValue(row, [
    'drive_folder_url',
    'Folder Drive',
    'Folder Google Drive',
    'Link Folder Drive',
    'Link Drive',
    'drive_folder',
    'drive_url',
    'folder_drive',
  ]);

  const rawTier = findValue(row, ['tier', 'status_tier', 'level', 'TIER', 'Tier']).toLowerCase().trim();
  const tier: 'free' | 'basic' | 'pro' = (rawTier === 'pro' || rawTier === 'basic') ? rawTier : 'free';

  const rawLeader = row.is_leader ?? row.isLeader ?? row.is_ketua ?? row.ketua ?? row.leader;
  const isLeader =
    rawLeader === true ||
    rawLeader === 'true' ||
    rawLeader === 1 ||
    rawLeader === '1' ||
    rawLeader === 't';

  return {
    id: (row.id as string) || (row.ID as string) || `mhs-${nim || index}-${Date.now()}`,
    timestamp: timestamp || '-',
    email: email || '-',
    namaLengkap: namaLengkap || 'Nama Tidak Diketahui',
    namaPanggilan: namaPanggilan || (namaLengkap ? namaLengkap.split(' ')[0] : '-'),
    nim: nim || '-',
    asalRumah: asalRumah || '-',
    alamatRumahDomisili: alamatRumahDomisili || '-',
    hobi: hobi || '-',
    noWa: noWa || '-',
    kelompok: kelompok || 'Belum Ada Kelompok',
    driveFolderUrl:
      driveFolderUrl ||
      (nim ? `https://drive.google.com/drive/folders/mhs-${nim.replace(/[\/\s]/g, '-')}` : undefined),
    tier,
    isLeader,
    raw: row,
  };
}

export async function fetchStudentsFromSupabase(
  customConfig?: SupabaseConfig
): Promise<{
  data: Mahasiswa[];
  isRealData: boolean;
  error?: string;
  sourceTable: string;
}> {
  const config = customConfig || getActiveSupabaseConfig();
  const supabase = getSupabaseClient(config);

  if (!supabase) {
    return {
      data: SAMPLE_MAHASISWA,
      isRealData: false,
      sourceTable: config.tableName || DEFAULT_PROFILES_TABLE,
      error: 'Koneksi database belum dikonfigurasi. Masukkan URL API pada menu pengaturan.',
    };
  }

  try {
    // 1. Fetch groups table for ID-to-Name resolution
    let groupMap: Record<number, string> = { ...DEFAULT_GROUPS };
    try {
      const { data: groupsData } = await supabase.from(DEFAULT_GROUPS_TABLE).select('id, name');
      if (groupsData && Array.isArray(groupsData)) {
        groupsData.forEach((g: { id: number; name: string }) => {
          if (g.id !== undefined && g.name) {
            groupMap[g.id] = g.name;
          }
        });
      }
    } catch {
      // Use DEFAULT_GROUPS fallback
    }

    // 2. Query target profiles table
    const tableToQuery = config.tableName || DEFAULT_PROFILES_TABLE;
    const { data, error } = await supabase.from(tableToQuery).select('*');

    if (error) {
      // If error, try fallback table names
      const fallbacks = [DEFAULT_PROFILES_TABLE, 'Logika 2026', 'logika_2026', 'mahasiswa'];
      for (const fb of fallbacks) {
        if (fb === tableToQuery) continue;
        const retry = await supabase.from(fb).select('*');
        if (!retry.error && retry.data && retry.data.length > 0) {
          const normalized = retry.data.map((r, i) => normalizeMahasiswaRow(r, i, groupMap));
          return {
            data: normalized,
            isRealData: true,
            sourceTable: fb,
          };
        }
      }

      console.warn(`Supabase query failed on "${tableToQuery}":`, error.message);
      return {
        data: SAMPLE_MAHASISWA,
        isRealData: false,
        sourceTable: tableToQuery,
        error: getIntuitiveErrorMessage(error, `Gagal memuat data dari tabel "${tableToQuery}".`),
      };
    }

    if (!data || data.length === 0) {
      return {
        data: [],
        isRealData: true,
        sourceTable: tableToQuery,
      };
    }

    const normalized = data.map((r, i) => normalizeMahasiswaRow(r, i, groupMap));
    return {
      data: normalized,
      isRealData: true,
      sourceTable: tableToQuery,
    };
  } catch (err: unknown) {
    const errorMsg = getIntuitiveErrorMessage(err, 'Terjadi kendala saat menghubungkan ke database.');
    return {
      data: SAMPLE_MAHASISWA,
      isRealData: false,
      sourceTable: config.tableName || DEFAULT_PROFILES_TABLE,
      error: errorMsg,
    };
  }
}

// Global Query Configuration to disable auto-refetching on window focus or re-mount
export const queryConfig = {
  refetchOnWindowFocus: false,
  refetchOnMount: false,
};

// Fetch photo_logs from Supabase
export async function fetchPhotoLogsFromSupabase(
  customConfig?: SupabaseConfig,
  studentsList: Mahasiswa[] = []
): Promise<PhotoRecord[] | null> {
  const supabase = getSupabaseClient(customConfig);
  if (!supabase) return null;

  try {
    let data: Record<string, unknown>[] | null = null;
    let fetchError: { message?: string } | null = null;

    const tablesToTry = [DEFAULT_PHOTO_LOGS_TABLE, 'photo_logs', 'photo_log', 'photologs'];
    for (const tableName of tablesToTry) {
      const res = await supabase.from(tableName).select('*');

      if (!res.error && res.data) {
        data = res.data as Record<string, unknown>[];
        break;
      } else if (res.error) {
        fetchError = res.error;
      }
    }

    if (!data) {
      if (fetchError) {
        console.warn('Failed to fetch photo_logs from Supabase:', fetchError.message);
      }
      return null;
    }

    const studentMap = new Map<string, Mahasiswa>();
    (studentsList || []).forEach((s) => {
      if (s.nim) {
        const clean = s.nim.toLowerCase().replace(/[\/\s_-]/g, '');
        studentMap.set(clean, s);
        studentMap.set(s.nim.toLowerCase().trim(), s);
      }
    });

    const records: PhotoRecord[] = data.map((row) => {
      let uploaderNim = findValue(row, [
        'user_a_nim',
        'nim_a',
        'user_a',
        'uploader_nim',
        'user_nim_a',
        'nim1',
        'user1',
        'nim_uploader',
      ]);
      let targetNim = findValue(row, [
        'user_b_nim',
        'nim_b',
        'user_b',
        'target_nim',
        'user_nim_b',
        'nim2',
        'user2',
        'nim_target',
      ]);

      const pairKey = findValue(row, ['pair_key', 'pairkey', 'pair', 'pair_id']);
      if (pairKey) {
        const parts = pairKey.split(/[_|:-]/).map((p) => p.trim()).filter(Boolean);
        if ((!uploaderNim || !targetNim) && parts.length >= 2) {
          if (!uploaderNim) uploaderNim = parts[0];
          if (!targetNim) targetNim = parts[1];
        }
      }

      const uploaderClean = uploaderNim.toLowerCase().replace(/[\/\s_-]/g, '');
      const targetClean = targetNim.toLowerCase().replace(/[\/\s_-]/g, '');

      const uploader = studentMap.get(uploaderClean) || studentMap.get(uploaderNim.toLowerCase().trim());
      const target = studentMap.get(targetClean) || studentMap.get(targetNim.toLowerCase().trim());

      const rawPhotoUrl =
        findValue(row, ['photo_url_a', 'photo_url_b', 'photo_url', 'url', 'image_url', 'photo']) ||
        undefined;

      const driveFileIdA = findValue(row, ['drive_file_id_a', 'drive_file_id', 'file_id_a', 'file_id']) || undefined;
      const driveFileIdB = findValue(row, ['drive_file_id_b', 'file_id_b']) || undefined;
      const photoUrlA = findValue(row, ['photo_url_a', 'photo_url']) || undefined;
      const photoUrlB = findValue(row, ['photo_url_b']) || undefined;

      const effectivePairKey = pairKey || (uploaderNim && targetNim ? `${uploaderNim}_${targetNim}` : undefined);

      return {
        id: String(row.id || `photo-${uploaderNim}-${targetNim}-${Date.now()}`),
        uploaderNim,
        uploaderNama: uploader ? uploader.namaLengkap : uploaderNim,
        targetNim,
        targetNama: target ? target.namaLengkap : targetNim,
        targetKelompok: target?.kelompok,
        timestamp: findValue(row, ['created_at', 'timestamp', 'waktu']) || new Date().toISOString(),
        photoUrl: rawPhotoUrl,
        photoFileName: `${target?.namaLengkap || targetNim}_${targetNim.replace(/[\/\s]/g, '-')}.jpg`,
        driveFolderUrl: target?.driveFolderUrl,
        pairKey: effectivePairKey,
        driveFileIdA,
        driveFileIdB,
        photoUrlA,
        photoUrlB,
      };
    });

    return records;
  } catch (err) {
    console.warn('Failed to fetch photo_logs from Supabase:', err);
    return null;
  }
}

// Save photo log directly to Supabase photo_logs table (matching PhotoService schema)
export async function savePhotoLogToSupabase(
  userANim: string,
  userBNim: string,
  photoUrl?: string,
  driveFileId?: string,
  extra?: {
    driveFileIdA?: string;
    driveFileIdB?: string;
    photoUrlA?: string;
    photoUrlB?: string;
  }
): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  try {
    const cleanNimA = userANim.trim();
    const cleanNimB = userBNim.trim();
    const sortedNims = [cleanNimA, cleanNimB].sort();
    const pairKey = `${sortedNims[0]}_${sortedNims[1]}`;

    // Sanitization: NEVER send raw Base64 / data:image URIs to Supabase database
    const sanitizeUrl = (url?: string | null): string | null => {
      if (!url || typeof url !== 'string') return null;
      const trimmed = url.trim();
      if (trimmed.startsWith('data:') || trimmed.length > 500) {
        return null;
      }
      return trimmed;
    };

    const cleanPhotoUrlA = sanitizeUrl(extra?.photoUrlA) || sanitizeUrl(photoUrl);
    const cleanPhotoUrlB = sanitizeUrl(extra?.photoUrlB) || sanitizeUrl(photoUrl);
    const cleanDriveIdA = extra?.driveFileIdA || driveFileId || null;
    const cleanDriveIdB = extra?.driveFileIdB || driveFileId || null;

    // Only proceed if there is valid Drive metadata to update or record
    if (!cleanDriveIdA && !cleanDriveIdB && !cleanPhotoUrlA && !cleanPhotoUrlB) {
      return true; // No valid drive metadata to overwrite, skip gracefully
    }

    const payload: Record<string, unknown> = {
      pair_key: pairKey,
      user_a_nim: cleanNimA,
      user_b_nim: cleanNimB,
      photo_url_a: cleanPhotoUrlA,
      photo_url_b: cleanPhotoUrlB,
      drive_file_id_a: cleanDriveIdA,
      drive_file_id_b: cleanDriveIdB,
    };

    const { error } = await supabase.from(DEFAULT_PHOTO_LOGS_TABLE).upsert(
      payload,
      { onConflict: 'pair_key' }
    );

    if (error) {
      console.warn('Supabase photo_logs upsert error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error saving photo_log to Supabase:', err);
    return false;
  }
}

// Update profile directly to Supabase profiles table (matching ProfileService schema)
export async function saveProfileToSupabase(
  nim: string,
  updatedData: Partial<Mahasiswa>
): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  try {
    const payload: Record<string, unknown> = {};
    if (updatedData.namaLengkap !== undefined) payload.nama_lengkap = updatedData.namaLengkap.trim();
    if (updatedData.namaPanggilan !== undefined) payload.nama_panggilan = updatedData.namaPanggilan.trim();
    if (updatedData.asalRumah !== undefined) payload.asal_rumah = updatedData.asalRumah.trim();
    if (updatedData.alamatRumahDomisili !== undefined) payload.alamat_domisili = updatedData.alamatRumahDomisili.trim();
    if (updatedData.hobi !== undefined) payload.hobi = updatedData.hobi.trim();
    if (updatedData.noWa !== undefined) payload.no_wa = updatedData.noWa.trim();
    if (updatedData.email !== undefined) payload.email = updatedData.email.trim();

    if (updatedData.kelompok !== undefined) {
      const match = updatedData.kelompok.match(/(\d+)/);
      if (match) {
        payload.group_id = parseInt(match[1], 10);
      }
    }

    if (updatedData.driveFolderUrl !== undefined) {
      payload.drive_folder_url = updatedData.driveFolderUrl.trim();
      const folderId = extractDriveFolderId(updatedData.driveFolderUrl);
      if (folderId) {
        payload.drive_folder_id = folderId;
      }
    }

    const { error } = await supabase.from(DEFAULT_PROFILES_TABLE).update(payload).eq('nim', nim.trim());

    if (error) {
      console.warn('Supabase profile update error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error updating profile in Supabase:', err);
    return false;
  }
}

// Subscribe to Supabase Realtime changes for profiles, photo_logs & payment_logs
export function subscribeToSupabaseRealtime(
  onProfilesChange: () => void,
  onPhotoLogsChange: () => void,
  onPaymentLogsChange?: () => void,
  onPhotoTrackingChange?: () => void
): () => void {
  const supabase = getSupabaseClient();
  if (!supabase) return () => {};

  try {
    const uniqueChannelName = `realtime-logika-2026-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
    const channel = supabase.channel(uniqueChannelName);

    channel
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: DEFAULT_PROFILES_TABLE },
        () => {
          onProfilesChange();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: DEFAULT_PHOTO_LOGS_TABLE },
        () => {
          onPhotoLogsChange();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'payment_logs' },
        () => {
          if (onPaymentLogsChange) {
            onPaymentLogsChange();
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: DEFAULT_PHOTO_TRACKING_TABLE },
        () => {
          if (onPhotoTrackingChange) {
            onPhotoTrackingChange();
          }
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          // Connected successfully
        } else if (status === 'CHANNEL_ERROR') {
          // Realtime replication might be disabled in Supabase dashboard. 
          // Silencing the warning to keep the console clean as we use polling fallback.
        } else if (status === 'TIMED_OUT') {
          console.warn('Real-time connection timed out, fallback polling active.');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (err) {
    console.warn('Realtime subscription error:', err);
    return () => {};
  }
}

// Fetch payment logs for a user from Supabase
export async function fetchPaymentLogsFromSupabase(
  nim?: string,
  customConfig?: SupabaseConfig
): Promise<PaymentLog[]> {
  const supabase = getSupabaseClient(customConfig);
  const cleanNim = (
    nim ||
    (typeof window !== 'undefined' ? localStorage.getItem('logika_2026_current_user_nim') : '') ||
    ''
  ).trim();
  if (!supabase || !cleanNim) return [];

  try {
    const { data, error } = await supabase
      .from('payment_logs')
      .select('*')
      .or(`user_nim.eq.${cleanNim},user_id.eq.${cleanNim},nim.eq.${cleanNim}`)
      .order('id', { ascending: false });

    if (error) {
      const fallback = await supabase
        .from('payment_logs')
        .select('*')
        .eq('user_nim', cleanNim)
        .order('id', { ascending: false });

      if (!fallback.error && fallback.data) {
        return fallback.data as PaymentLog[];
      }
      console.warn('Failed to fetch payment_logs:', error.message);
      return [];
    }

    return (data || []) as PaymentLog[];
  } catch (err) {
    console.error('Error fetching payment_logs:', err);
    return [];
  }
}

// Create new payment log in Supabase
export async function createPaymentLogInSupabase(
  payload: {
    user_nim: string;
    amount: number;
    target_tier: string;
    payment_proof_url?: string;
    status: string;
  },
  customConfig?: SupabaseConfig
): Promise<boolean> {
  const supabase = getSupabaseClient(customConfig);
  if (!supabase) return false;

  try {
    const { error } = await supabase.from('payment_logs').insert([payload]);
    if (error) {
      console.warn('Failed to insert payment_logs:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error inserting payment_log:', err);
    return false;
  }
}

// Fetch photo tracking logs for the current user
export async function fetchPhotoTrackingFromSupabase(
  userKey?: string,
  customConfig?: SupabaseConfig
): Promise<Record<string, boolean>> {
  const supabase = getSupabaseClient(customConfig);
  const cleanUser = (
    userKey ||
    (typeof window !== 'undefined' ? localStorage.getItem('logika_2026_current_user_nim') : '') ||
    ''
  ).trim();
  if (!supabase || !cleanUser) return {};

  try {
    // Query photo_tracking for this user
    let rowsData: Record<string, unknown>[] | null = null;
    const { data, error } = await supabase
      .from(DEFAULT_PHOTO_TRACKING_TABLE)
      .select('target_nim, is_checked, user_id')
      .eq('user_id', cleanUser);

    if (!error && data) {
      rowsData = data as Record<string, unknown>[];
    } else {
      const retry = await supabase
        .from(DEFAULT_PHOTO_TRACKING_TABLE)
        .select('target_nim, is_checked, nim')
        .eq('nim', cleanUser);
      if (!retry.error && retry.data) {
        rowsData = retry.data as Record<string, unknown>[];
      }
    }

    const trackingMap: Record<string, boolean> = {};
    if (rowsData) {
      rowsData.forEach((row) => {
        const targetNim = row.target_nim as string | undefined;
        const isChecked = row.is_checked as boolean | string | undefined;
        if (targetNim) {
          const isTrue = isChecked === true || String(isChecked) === 'true';
          const targetStr = String(targetNim);
          const cleanTarget = targetStr.trim();
          const normTarget = cleanTarget.toLowerCase().replace(/[\/\s_-]/g, '');

          trackingMap[targetStr] = isTrue;
          trackingMap[cleanTarget] = isTrue;
          trackingMap[cleanTarget.toUpperCase()] = isTrue;
          trackingMap[normTarget] = isTrue;
        }
      });
    }
    return trackingMap;
  } catch (err) {
    console.error('Error fetching photo_tracking:', err);
    return {};
  }
}

// Upsert photo tracking record (bidirectional / reciprocal sync between user A & user B)
export async function upsertPhotoTrackingInSupabase(
  userKey: string,
  targetNim: string,
  isChecked: boolean
): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase || !userKey || !targetNim) return false;

  try {
    const cleanUser = userKey.trim();
    const cleanTarget = targetNim.trim();
    const now = new Date().toISOString();

    // Reciprocal / bidirectional tracking:
    // If User A marks User B, also mark User B for User A so both users have the checklist filled in real-time
    const records = [
      {
        user_id: cleanUser,
        target_nim: cleanTarget,
        is_checked: isChecked,
        updated_at: now,
      },
    ];

    if (cleanUser.toLowerCase().replace(/[\/\s_-]/g, '') !== cleanTarget.toLowerCase().replace(/[\/\s_-]/g, '')) {
      records.push({
        user_id: cleanTarget,
        target_nim: cleanUser,
        is_checked: isChecked,
        updated_at: now,
      });
    }

    const { error } = await supabase.from(DEFAULT_PHOTO_TRACKING_TABLE).upsert(
      records,
      { onConflict: 'user_id,target_nim' }
    );

    if (error) {
      console.warn('Supabase photo_tracking upsert error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error upserting photo_tracking:', err);
    return false;
  }
}

export function formatPhoneDisplay(rawPhone: string): string {
  if (!rawPhone || rawPhone === '-') return '-';

  const cleaned = rawPhone.replace(/\D/g, '');
  if (!cleaned) return rawPhone;

  if (cleaned.startsWith('628')) {
    return '0' + cleaned.slice(2);
  } else if (cleaned.startsWith('8')) {
    return '0' + cleaned;
  } else if (cleaned.startsWith('08')) {
    return cleaned;
  }

  return rawPhone;
}

export function formatWhatsAppUrl(rawPhone: string, studentName?: string, currentUser?: Mahasiswa | null): string {
  if (!rawPhone || rawPhone === '-') return '';

  let cleaned = rawPhone.replace(/\D/g, '');
  if (!cleaned) return '';

  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1);
  } else if (cleaned.startsWith('8')) {
    cleaned = '62' + cleaned;
  } else if (!cleaned.startsWith('62') && cleaned.length >= 8) {
    cleaned = '62' + cleaned;
  }

  let text = `Halo ${studentName || ''}, salam kenal dari Peserta Logika 2026.\n`;
  if (currentUser) {
    let angkatan = '2026';
    const nimUpper = (currentUser.nim || '').toUpperCase();
    if (nimUpper.includes('F1D026')) {
      angkatan = '2026';
    } else if (nimUpper.includes('F1D025')) {
      angkatan = '2025';
    } else {
      const match = nimUpper.match(/F1D0([0-9]{2})/);
      if (match && match[1]) {
        angkatan = `20${match[1]}`;
      }
    }
    text += `Perkenalkan nama saya ${currentUser.namaLengkap || ''} dengan Nim ${currentUser.nim || ''} dari Teknik Informatika Angkatan ${angkatan}, saya ingin bertanya mengenai`;
  } else {
    text += `Perkenalkan nama saya [nama lengkap] dengan Nim [Nim] dari Teknik Informatika Angkatan [angkatan], saya ingin bertanya mengenai`;
  }

  const message = encodeURIComponent(text);
  return `https://wa.me/${cleaned}?text=${message}`;
}
