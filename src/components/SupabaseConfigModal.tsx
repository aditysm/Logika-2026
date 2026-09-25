import { useState, useEffect, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Database,
  KeyRound,
  Globe,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  X,
  Copy,
  Check,
  ShieldCheck,
  ExternalLink,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import {
  getActiveSupabaseConfig,
  saveSupabaseConfig,
  removeSupabaseConfig,
  getSupabaseClient,
  SUPABASE_URL_IN_CODE,
  DEFAULT_PROFILES_TABLE,
} from '../lib/supabase';
import { SupabaseConfig } from '../types';

interface SupabaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigSaved: () => void;
  initialError?: string | null;
}

export function SupabaseConfigModal({
  isOpen,
  onClose,
  onConfigSaved,
  initialError,
}: SupabaseConfigModalProps) {
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    status: 'idle' | 'success' | 'error';
    message?: string;
  }>({ status: 'idle' });
  const [copiedLink, setCopiedLink] = useState(false);
  const [isStoredInLocalStorage, setIsStoredInLocalStorage] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const active = getActiveSupabaseConfig();
      setUrl(active.url || SUPABASE_URL_IN_CODE);
      setAnonKey(active.anonKey || '');
      setTestResult({ status: 'idle' });
      
      const storedKey = typeof window !== 'undefined' ? localStorage.getItem('VITE_SUPABASE_ANON_KEY') || localStorage.getItem('supabase_anon_key') : null;
      setIsStoredInLocalStorage(Boolean(storedKey));
    }
  }, [isOpen]);

  const handleTestAndSave = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    const cleanUrl = url.trim().replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '');
    const cleanKey = anonKey.trim();

    if (!cleanUrl) {
      setTestResult({
        status: 'error',
        message: 'URL Project Supabase tidak boleh kosong.',
      });
      return;
    }

    if (!cleanKey) {
      setTestResult({
        status: 'error',
        message: 'Supabase Anon Key tidak boleh kosong.',
      });
      return;
    }

    setIsTesting(true);
    setTestResult({ status: 'idle' });

    try {
      // Test direct fetch
      const testConfig: SupabaseConfig = {
        url: cleanUrl,
        anonKey: cleanKey,
        tableName: DEFAULT_PROFILES_TABLE,
      };

      const client = getSupabaseClient(testConfig);
      if (!client) {
        throw new Error('Gagal menginisialisasi Supabase client dengan kredensial tersebut.');
      }

      const { count, error } = await client
        .from(DEFAULT_PROFILES_TABLE)
        .select('*', { count: 'exact', head: true });

      if (error) {
        throw new Error(error.message || 'Gagal mengakses tabel profiles.');
      }

      // Save valid configuration
      saveSupabaseConfig(testConfig);
      setIsStoredInLocalStorage(true);

      setTestResult({
        status: 'success',
        message: `Koneksi berhasil! Ditemukan ${count ?? 0} data pada tabel ${DEFAULT_PROFILES_TABLE}. Pengaturan telah disimpan di browser ini.`,
      });

      setTimeout(() => {
        onConfigSaved();
        onClose();
      }, 1200);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setTestResult({
        status: 'error',
        message: `Koneksi gagal: ${msg}. Pastikan URL dan Anon Key sudah benar serta tabel "${DEFAULT_PROFILES_TABLE}" memiliki RLS SELECT public/anon enabled.`,
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleClearConfig = () => {
    if (confirm('Apakah Anda yakin ingin menghapus konfigurasi Supabase dari browser ini?')) {
      removeSupabaseConfig();
      setAnonKey('');
      setIsStoredInLocalStorage(false);
      setTestResult({
        status: 'idle',
        message: 'Konfigurasi browser telah dibersihkan.',
      });
      onConfigSaved();
    }
  };

  const handleCopyShareLink = () => {
    if (!anonKey) return;
    const origin = window.location.origin + window.location.pathname;
    const shareableUrl = `${origin}?anon_key=${encodeURIComponent(anonKey.trim())}`;
    
    navigator.clipboard.writeText(shareableUrl).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8"
        >
          {/* Header */}
          <div className="px-6 pt-6 pb-4 border-b border-slate-100 flex items-start justify-between gap-4 bg-gradient-to-r from-blue-50/50 to-indigo-50/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Konfigurasi Koneksi Supabase
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Atur kredensial Supabase untuk GitHub Pages & Hosting Statis
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <form onSubmit={handleTestAndSave} className="p-6 space-y-5">
            {initialError && testResult.status === 'idle' && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2.5 text-amber-800 text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1 leading-relaxed font-medium">
                  {initialError}
                </div>
              </div>
            )}

            {/* Info Box explaining GitHub Pages static build */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-slate-800">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <span>Kenapa ini muncul di GitHub Pages?</span>
              </div>
              <p className="leading-relaxed">
                GitHub Pages adalah hosting file statis. Jika berkas <code className="font-mono bg-white px-1 py-0.5 rounded border border-slate-200">.env</code> tidak diinjeksi saat build, Anda dapat memasukkan <strong>Supabase Anon Key</strong> di bawah ini sekali saja. Kunci akan tersimpan aman di browser (<code className="font-mono bg-white px-1 py-0.5 rounded border border-slate-200">localStorage</code>).
              </p>
            </div>

            <div className="space-y-4">
              {/* URL */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-blue-600" />
                  <span>Project URL Supabase</span>
                </label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://xyzcompany.supabase.co"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                  required
                />
              </div>

              {/* Anon Key */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Supabase Anon Key (Public Key)</span>
                </label>
                <textarea
                  value={anonKey}
                  onChange={(e) => setAnonKey(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  rows={3}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all resize-none"
                  required
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Ambil dari Dashboard Supabase &rarr; Project Settings &rarr; API &rarr; <strong>anon / public key</strong> (BUKAN service_role key).
                </p>
              </div>
            </div>

            {/* Test Result Message */}
            {testResult.status === 'success' && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-2.5 text-emerald-800 text-xs animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed font-semibold">{testResult.message}</div>
              </div>
            )}

            {testResult.status === 'error' && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-rose-800 text-xs animate-in fade-in">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">{testResult.message}</div>
              </div>
            )}

            {/* Share link generator */}
            {anonKey.trim() && (
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                <div className="text-[11px] text-slate-500">
                  Ingin bagikan link otomatis agar teman/tim tidak perlu input key?
                </div>
                <button
                  type="button"
                  onClick={handleCopyShareLink}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                      <span>Salin Link</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Action buttons */}
            <div className="pt-2 flex items-center justify-between gap-3">
              {isStoredInLocalStorage ? (
                <button
                  type="button"
                  onClick={handleClearConfig}
                  className="px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                  title="Hapus dari LocalStorage"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isTesting}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isTesting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Menguji & Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Simpan & Sambungkan</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
