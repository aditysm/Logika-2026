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
  raw?: Record<string, unknown>;
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
