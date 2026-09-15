export interface Mahasiswa {
  id: string;
  timestamp: string;
  email: string;
  namaLengkap: string;
  namaPanggilan: string;
  nim: string;
  asalRumah: string;
  alamatRumahDomisili: string;
  hobi: string;
  noWa: string;
  kelompok: string;
  driveFolderUrl?: string;
  tier?: 'free' | 'basic' | 'pro';
  raw?: Record<string, unknown>;
}

export interface PhotoRecord {
  id: string;
  uploaderNim: string;
  uploaderNama: string;
  targetNim: string;
  targetNama: string;
  targetKelompok?: string;
  timestamp: string;
  photoUrl?: string;
  photoFileName: string;
  notes?: string;
  driveFolderUrl?: string;
  pairKey?: string;
  driveFileIdA?: string;
  driveFileIdB?: string;
  photoUrlA?: string;
  photoUrlB?: string;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  tableName: string;
}

export interface ConnectionStatus {
  isConnected: boolean;
  isCustomConfig: boolean;
  tableName: string;
  errorMessage?: string;
  totalLoaded: number;
}

export interface PaymentLog {
  id: number;
  created_at?: string;
  user_nim: string;
  amount: number;
  target_tier: string;
  payment_proof_url?: string;
  status: 'pending' | 'approved' | 'rejected' | string;
  approved_at?: string;
}
