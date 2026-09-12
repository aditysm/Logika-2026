import { createClient } from '@supabase/supabase-js';
import { Mahasiswa, SupabaseConfig } from '../types';

const STORAGE_KEY = 'logika_2026_supabase_config';

export const DEFAULT_TABLE_NAME = 'Logika 2026';

// Sample fallback dataset matching the exact structure specified by user
export const SAMPLE_MAHASISWA: Mahasiswa[] = [
  {
    id: 'demo-1',
    timestamp: '2026-08-15 08:30:12',
    email: 'aditya.putra26@mail.ugm.ac.id',
    namaLengkap: 'Aditya Putra Pratama',
    namaPanggilan: 'Adit',
    nim: '26/514238/PA/21045',
    asalRumah: 'Surabaya, Jawa Timur',
    alamatRumahDomisili: 'Jl. Kaliurang KM 5, Gang Pandega Marta No. 12, Sleman, Yogyakarta',
    hobi: 'Badminton, Coding Web, Fotografi',
    noWa: '081234567890',
    kelompok: 'Kelompok 01 - Turing',
  },
  {
    id: 'demo-2',
    timestamp: '2026-08-15 08:42:05',
    email: 'zahra.amelia@mail.ugm.ac.id',
    namaLengkap: 'Zahra Amelia Ramadhani',
    namaPanggilan: 'Zahra',
    nim: '26/513890/PA/21012',
    asalRumah: 'Bandung, Jawa Barat',
    alamatRumahDomisili: 'Kos Putri Melati, Jl. Agro No. 8, Caturtunggal, Depok, Sleman',
    hobi: 'Membaca Novel, Desain UI/UX, Musik Klasik',
    noWa: '085712349988',
    kelompok: 'Kelompok 01 - Turing',
  },
  {
    id: 'demo-3',
    timestamp: '2026-08-15 09:15:33',
    email: 'muhammad.fauzan26@mail.ugm.ac.id',
    namaLengkap: 'Muhammad Fauzan Al-Ghifari',
    namaPanggilan: 'Fauzan',
    nim: '26/515671/PA/21078',
    asalRumah: 'Medan, Sumatera Utara',
    alamatRumahDomisili: 'Wisma Putra Pogung Dalangan No. 45, Mlati, Sleman',
    hobi: 'Catur, Basket, Eksplorasi Linux',
    noWa: '082198765432',
    kelompok: 'Kelompok 02 - Boole',
  },
  {
    id: 'demo-4',
    timestamp: '2026-08-15 09:40:19',
    email: 'clarissa.angelina@mail.ugm.ac.id',
    namaLengkap: 'Clarissa Angelina Wijaya',
    namaPanggilan: 'Clara',
    nim: '26/512903/PA/20980',
    asalRumah: 'Semarang, Jawa Tengah',
    alamatRumahDomisili: 'Apartemen Uttara The Icon, Jl. Kaliurang KM 5.5, Yogyakarta',
    hobi: 'Baking, Menulis Blog, Ilustrasi Digital',
    noWa: '081387654321',
    kelompok: 'Kelompok 02 - Boole',
  },
  {
    id: 'demo-5',
    timestamp: '2026-08-15 10:05:44',
    email: 'dimas.bagaskara@mail.ugm.ac.id',
    namaLengkap: 'Dimas Bagaskara',
    namaPanggilan: 'Dimas',
    nim: '26/516244/PA/21115',
    asalRumah: 'Malang, Jawa Timur',
    alamatRumahDomisili: 'Pogung Baru Blok D No. 18, Sinduadi, Mlati, Sleman',
    hobi: 'Gitar Akustik, Hiking Gunung, Game Strategi',
    noWa: '085698712345',
    kelompok: 'Kelompok 03 - Shannon',
  },
  {
    id: 'demo-6',
    timestamp: '2026-08-15 10:22:10',
    email: 'nadia.safira@mail.ugm.ac.id',
    namaLengkap: 'Nadia Safira Kusuma',
    namaPanggilan: 'Nadia',
    nim: '26/514980/PA/21054',
    asalRumah: 'Balikpapan, Kalimantan Timur',
    alamatRumahDomisili: 'Kos Griya Asri, Gang Gambir No. 6, Karangasem, Caturtunggal',
    hobi: 'Menyanyi, Menonton Film Sci-Fi, Berenang',
    noWa: '081901234567',
    kelompok: 'Kelompok 03 - Shannon',
  },
  {
    id: 'demo-7',
    timestamp: '2026-08-15 11:10:00',
    email: 'rizky.kurniawan@mail.ugm.ac.id',
    namaLengkap: 'Rizky Kurniawan Pratama',
    namaPanggilan: 'Kiki',
    nim: '26/517112/PA/21150',
    asalRumah: 'Makassar, Sulawesi Selatan',
    alamatRumahDomisili: 'Jl. Gejayan, Gang Affandi No. 20, Condongcatur, Depok',
    hobi: 'Robotika, Futsal, Membaca Buku Sains',
    noWa: '081145678901',
    kelompok: 'Kelompok 04 - Gödel',
  },
  {
    id: 'demo-8',
    timestamp: '2026-08-15 11:45:28',
    email: 'sabrina.azzahra@mail.ugm.ac.id',
    namaLengkap: 'Sabrina Nurul Azzahra',
    namaPanggilan: 'Sabrina',
    nim: '26/513456/PA/20999',
    asalRumah: 'Palembang, Sumatera Selatan',
    alamatRumahDomisili: 'Wisma Kartini, Jl. Monjali No. 89, Sinduadi, Mlati',
    hobi: 'Public Speaking, Debat Bahasa Inggris, Traveling',
    noWa: '087812345678',
    kelompok: 'Kelompok 04 - Gödel',
  },
];

export function getActiveSupabaseConfig(): SupabaseConfig {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.url && parsed.anonKey) {
        return {
          url: parsed.url,
          anonKey: parsed.anonKey,
          tableName: parsed.tableName || DEFAULT_TABLE_NAME,
        };
      }
    }
  } catch (e) {
    console.warn('Error reading stored Supabase config:', e);
  }

  // Fallback to environment variables
  const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env || {};
  return {
    url: env.VITE_SUPABASE_URL || '',
    anonKey: env.VITE_SUPABASE_ANON_KEY || '',
    tableName: env.VITE_SUPABASE_TABLE || DEFAULT_TABLE_NAME,
  };
}

export function saveSupabaseConfig(config: SupabaseConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function removeSupabaseConfig(): void {
  localStorage.removeItem(STORAGE_KEY);
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

export function normalizeMahasiswaRow(row: Record<string, unknown>, index: number): Mahasiswa {
  const timestamp = findValue(row, ['Timestamp', 'timestamp', 'created_at', 'waktu']);
  const email = findValue(row, ['Email Address', 'Email', 'email_address', 'email', 'alamat_email']);
  const namaLengkap = findValue(row, ['Nama Lengkap', 'nama_lengkap', 'Nama', 'nama', 'full_name', 'name']);
  const namaPanggilan = findValue(row, ['Nama Panggilan', 'nama_panggilan', 'panggilan', 'nickname']);
  const nim = findValue(row, ['NIM', 'nim', 'nrp', 'nomor_induk', 'id_mahasiswa']);
  const asalRumah = findValue(row, ['ASAL RUMAH', 'Asal Rumah', 'asal_rumah', 'asal', 'kota_asal', 'origin']);
  const alamatRumahDomisili = findValue(row, [
    'ALAMAT RUMAH/DOMISILI',
    'Alamat Rumah/Domisili',
    'ALAMAT RUMAH / DOMISILI',
    'alamat_rumah_domisili',
    'alamat_domisili',
    'alamat',
    'domisili',
    'address',
  ]);
  const hobi = findValue(row, ['HOBI', 'Hobi', 'hobi', 'hobby', 'hobbies', 'minat']);
  const noWa = findValue(row, ['NO WA', 'No WA', 'no_wa', 'nomor_wa', 'whatsapp', 'wa', 'phone', 'telepon']);
  const kelompok = findValue(row, ['KELOMPOK', 'Kelompok', 'kelompok', 'group', 'team']);

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
    raw: row,
  };
}

export async function fetchStudentsFromSupabase(customConfig?: SupabaseConfig): Promise<{
  data: Mahasiswa[];
  isRealData: boolean;
  error?: string;
  sourceTable: string;
}> {
  const config = customConfig || getActiveSupabaseConfig();

  if (!config.url || !config.anonKey) {
    return {
      data: SAMPLE_MAHASISWA,
      isRealData: false,
      sourceTable: config.tableName || DEFAULT_TABLE_NAME,
      error: 'Koneksi Supabase belum dikonfigurasi (URL atau Anon Key kosong). Menampilkan data simulasi Logika 2026.',
    };
  }

  try {
    const supabase = createClient(config.url, config.anonKey);
    const tableToQuery = config.tableName || DEFAULT_TABLE_NAME;

    // Try primary table name
    const { data, error } = await supabase.from(tableToQuery).select('*');

    if (error) {
      // If error might be case sensitivity or quotes in table name (e.g. "logika_2026" vs "Logika 2026")
      const fallbackTable = tableToQuery.toLowerCase().replace(/\s+/g, '_');
      if (fallbackTable !== tableToQuery) {
        const retryResult = await supabase.from(fallbackTable).select('*');
        if (!retryResult.error && retryResult.data && retryResult.data.length > 0) {
          const normalized = retryResult.data.map(normalizeMahasiswaRow);
          return {
            data: normalized,
            isRealData: true,
            sourceTable: fallbackTable,
          };
        }
      }

      console.warn(`Supabase query failed on "${tableToQuery}":`, error.message);
      return {
        data: SAMPLE_MAHASISWA,
        isRealData: false,
        sourceTable: tableToQuery,
        error: `Gagal memuat dari tabel "${tableToQuery}": ${error.message}. Menampilkan data simulasi.`,
      };
    }

    if (!data || data.length === 0) {
      return {
        data: SAMPLE_MAHASISWA,
        isRealData: false,
        sourceTable: tableToQuery,
        error: `Tabel "${tableToQuery}" terhubung tetapi masih kosong. Menampilkan data contoh Logika 2026.`,
      };
    }

    const normalized = data.map(normalizeMahasiswaRow);
    return {
      data: normalized,
      isRealData: true,
      sourceTable: tableToQuery,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Terjadi kesalahan tidak terduga';
    return {
      data: SAMPLE_MAHASISWA,
      isRealData: false,
      sourceTable: config.tableName || DEFAULT_TABLE_NAME,
      error: `Koneksi Supabase gagal: ${errorMsg}`,
    };
  }
}

export function formatWhatsAppUrl(rawPhone: string, studentName?: string): string {
  if (!rawPhone || rawPhone === '-') return '';

  // Clean numbers, remove +, spaces, dashes
  let cleaned = rawPhone.replace(/\D/g, '');

  // Convert Indonesian 08xx to 628xx
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1);
  } else if (!cleaned.startsWith('62') && cleaned.length >= 9) {
    cleaned = '62' + cleaned;
  }

  const message = encodeURIComponent(
    `Halo ${studentName || ''}, salam kenal! Saya mahasiswa Logika 2026.`
  );

  return `https://wa.me/${cleaned}?text=${message}`;
}
