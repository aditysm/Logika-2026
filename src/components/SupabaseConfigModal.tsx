import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertCircle,
  CheckCircle2,
  Code2,
  Database,
  ExternalLink,
  HelpCircle,
  Loader2,
  RefreshCw,
  RotateCcw,
  Save,
  X,
} from 'lucide-react';
import { SupabaseConfig } from '../types';
import {
  DEFAULT_TABLE_NAME,
  getActiveSupabaseConfig,
  removeSupabaseConfig,
  saveSupabaseConfig,
} from '../lib/supabase';
import { createClient } from '@supabase/supabase-js';

interface SupabaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigSaved: () => void;
  currentTableName: string;
  isRealData: boolean;
  errorMessage?: string;
}

export function SupabaseConfigModal({
  isOpen,
  onClose,
  onConfigSaved,
  currentTableName,
  isRealData,
  errorMessage,
}: SupabaseConfigModalProps) {
  const [activeConfig, setActiveConfig] = useState<SupabaseConfig>(getActiveSupabaseConfig);
  const [testState, setTestState] = useState<{
    testing: boolean;
    success?: boolean;
    message?: string;
    rowCount?: number;
  }>({ testing: false });
  const [showSqlHelper, setShowSqlHelper] = useState(false);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    if (!activeConfig.url || !activeConfig.anonKey) {
      setTestState({
        testing: false,
        success: false,
        message: 'Masukkan URL Server dan Kunci Akses terlebih dahulu.',
      });
      return;
    }

    setTestState({ testing: true, message: 'Menghubungkan ke server data...' });

    try {
      const client = createClient(activeConfig.url, activeConfig.anonKey);
      const tableName = activeConfig.tableName || DEFAULT_TABLE_NAME;

      const { data, error } = await client.from(tableName).select('*').limit(5);

      if (error) {
        setTestState({
          testing: false,
          success: false,
          message: `Gagal membaca tabel "${tableName}": ${error.message}`,
        });
      } else {
        setTestState({
          testing: false,
          success: true,
          message: `Berhasil terhubung! Ditemukan ${data?.length || 0} baris contoh di tabel "${tableName}".`,
          rowCount: data?.length || 0,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Kesalahan jaringan';
      setTestState({
        testing: false,
        success: false,
        message: `Koneksi gagal: ${msg}`,
      });
    }
  };

  const handleSave = () => {
    saveSupabaseConfig(activeConfig);
    onConfigSaved();
    onClose();
  };

  const handleResetToDemo = () => {
    removeSupabaseConfig();
    setActiveConfig({
      url: '',
      anonKey: '',
      tableName: DEFAULT_TABLE_NAME,
    });
    setTestState({ testing: false });
    onConfigSaved();
    onClose();
  };

  const sampleSql = `-- Jalankan query ini di SQL Editor Supabase Anda:
CREATE TABLE IF NOT EXISTS public."Logika 2026" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "Timestamp" text,
  "Email Address" text,
  "Nama Lengkap" text NOT NULL,
  "Nama Panggilan" text,
  "NIM" text,
  "ASAL RUMAH" text,
  "ALAMAT RUMAH/DOMISILI" text,
  "HOBI" text,
  "NO WA" text,
  "KELOMPOK" text
);

-- Buka izin baca (Row Level Security / RLS) agar data bisa diakses:
ALTER TABLE public."Logika 2026" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Izinkan publik membaca data Logika 2026"
  ON public."Logika 2026" FOR SELECT USING (true);`;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 sm:p-6">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden z-10 my-8"
        >
          {/* Header */}
          <div className="bg-slate-900 text-white p-6 relative">
            <button
              id="btn-close-supabase-modal"
              type="button"
              onClick={onClose}
              className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Pengaturan Sumber Data</h3>
                <p className="text-xs text-slate-400">
                  Penyimpanan direktori mahasiswa: &quot;Logika 2026&quot;
                </p>
              </div>
            </div>
          </div>

          {/* Form Content */}
          <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
            {/* Status Indicator Banner */}
            <div
              className={`p-3.5 rounded-2xl text-xs flex items-start gap-2.5 border ${
                isRealData
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}
            >
              {isRealData ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-semibold">
                  {isRealData
                    ? `Terhubung ke tabel data "${currentTableName}"`
                    : 'Menggunakan Data Bawaan Logika 2026'}
                </p>
                <p className="text-slate-600 mt-0.5">
                  {errorMessage ||
                    (isRealData
                      ? 'Data langsung disinkronkan secara langsung dari tabel penyimpanan Anda.'
                      : 'Isi URL dan Kunci Akses Publik di bawah ini untuk menghubungkan server penyimpanan Anda, atau biarkan menggunakan data bawaan.')}
                </p>
              </div>
            </div>

            {/* Inputs */}
            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  URL Server Penyimpanan (Project URL)
                </label>
                <input
                  id="input-supabase-url"
                  type="text"
                  placeholder="https://xyzcompany.supabase.co"
                  value={activeConfig.url}
                  onChange={(e) => setActiveConfig({ ...activeConfig, url: e.target.value.trim() })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  URL endpoint layanan penyimpanan data Anda
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Kunci Akses Publik (Public Key / Anon Key)
                </label>
                <input
                  id="input-supabase-key"
                  type="password"
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value={activeConfig.anonKey}
                  onChange={(e) => setActiveConfig({ ...activeConfig, anonKey: e.target.value.trim() })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Kunci akses publik yang aman dibaca oleh aplikasi
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Tabel
                </label>
                <input
                  id="input-supabase-table"
                  type="text"
                  placeholder="Logika 2026"
                  value={activeConfig.tableName}
                  onChange={(e) => setActiveConfig({ ...activeConfig, tableName: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Default: <strong>Logika 2026</strong> (atau logika_2026)
                </span>
              </div>
            </div>

            {/* Test Connection Button and Status */}
            <div className="pt-2">
              <div className="flex items-center gap-2">
                <button
                  id="btn-test-supabase"
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testState.testing || !activeConfig.url}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  {testState.testing ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5 text-slate-600" />
                  )}
                  <span>Uji Koneksi Tabel</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowSqlHelper(!showSqlHelper)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-indigo-600 hover:bg-indigo-50 rounded-xl text-xs font-medium transition-colors"
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span>{showSqlHelper ? 'Sembunyikan SQL' : 'Lihat Format Kolom SQL'}</span>
                </button>
              </div>

              {testState.message && (
                <div
                  className={`mt-2.5 p-3 rounded-xl text-xs flex items-center gap-2 ${
                    testState.success
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  {testState.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span>{testState.message}</span>
                </div>
              )}
            </div>

            {/* SQL Helper Accordion */}
            {showSqlHelper && (
              <div className="mt-3 p-3.5 bg-slate-900 text-slate-200 rounded-2xl text-xs font-mono">
                <div className="flex items-center justify-between text-slate-400 mb-2 font-sans font-medium text-[11px]">
                  <span>Format Kolom Tabel (Klik salin di bawah)</span>
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(sampleSql)}
                    className="text-indigo-400 hover:text-indigo-300"
                  >
                    Salin SQL
                  </button>
                </div>
                <pre className="overflow-x-auto whitespace-pre-wrap text-[11px] text-slate-300">
                  {sampleSql}
                </pre>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex items-center justify-between gap-3">
            <button
              id="btn-reset-supabase-demo"
              type="button"
              onClick={handleResetToDemo}
              className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-rose-600 font-medium transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Gunakan Data Contoh</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                id="btn-cancel-supabase-modal"
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
              >
                Batal
              </button>
              <button
                id="btn-save-supabase-config"
                type="button"
                onClick={handleSave}
                className="inline-flex items-center gap-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Simpan & Terapkan</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
