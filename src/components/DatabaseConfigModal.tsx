import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Database,
  Key,
  Globe,
  CheckCircle2,
  AlertTriangle,
  X,
  RefreshCw,
  Trash2,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';
import { getActiveSupabaseConfig, saveSupabaseConfig, removeSupabaseConfig, testSupabaseConnection } from '../lib/supabase';
import { SupabaseConfig } from '../types';

interface DatabaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigSaved: () => void;
}

export function DatabaseConfigModal({
  isOpen,
  onClose,
  onConfigSaved,
}: DatabaseConfigModalProps) {
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    details?: string;
  } | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const active = getActiveSupabaseConfig();
      setUrl(active.url || 'https://cvjjdsxguzuhnnnxneec.supabase.co');
      setAnonKey(active.anonKey || '');
      setTestResult(null);
      setSaveSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    if (!url.trim() || !anonKey.trim()) {
      setTestResult({
        success: false,
        message: 'Harap masukkan Supabase URL dan Anon Key terlebih dahulu.',
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const cleanUrl = url.trim().replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '');
      const testConfig: SupabaseConfig = {
        url: cleanUrl,
        anonKey: anonKey.trim(),
        tableName: 'profiles',
      };

      const res = await testSupabaseConnection(testConfig);
      if (res.success) {
        setTestResult({
          success: true,
          message: `Koneksi berhasil! Terhubung ke tabel '${res.tableName}' (${res.count || 0} data ditemukan).`,
        });
      } else {
        setTestResult({
          success: false,
          message: res.error || 'Gagal terhubung ke Supabase dengan kunci ini.',
        });
      }
    } catch (err: unknown) {
      setTestResult({
        success: false,
        message: err instanceof Error ? err.message : 'Terjadi kendala saat mengetes koneksi.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    if (!url.trim() || !anonKey.trim()) {
      setTestResult({
        success: false,
        message: 'URL dan Anon Key tidak boleh kosong.',
      });
      return;
    }

    const cleanUrl = url.trim().replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '');
    const newConfig: SupabaseConfig = {
      url: cleanUrl,
      anonKey: anonKey.trim(),
      tableName: 'profiles',
    };

    saveSupabaseConfig(newConfig);
    setSaveSuccess(true);
    setTimeout(() => {
      onConfigSaved();
      onClose();
    }, 600);
  };

  const handleReset = () => {
    removeSupabaseConfig();
    const active = getActiveSupabaseConfig();
    setUrl(active.url || 'https://cvjjdsxguzuhnnnxneec.supabase.co');
    setAnonKey(active.anonKey || '');
    setTestResult({
      success: true,
      message: 'Kunci tersimpan di browser telah dihapus/direset.',
    });
    setTimeout(() => {
      onConfigSaved();
    }, 400);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-100/80">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Konfigurasi Supabase Anon Key</h3>
                <p className="text-xs text-slate-500">Atur kunci anonim publik langsung di frontend</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Body */}
          <div className="p-6 space-y-4 overflow-y-auto">
            {/* Warning Security Info */}
            <div className="p-3.5 bg-emerald-50/70 border border-emerald-200/70 rounded-2xl flex items-start gap-2.5 text-xs text-emerald-900">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Keamanan Kunci:</span>
                <p className="text-emerald-800 text-[11px] leading-relaxed">
                  Gunakan hanya <strong>`anon` `public` key</strong> dari Dashboard Supabase Anda. Kunci ini aman disimpan di browser dan bekerja berdampingan dengan kebijakan RLS.
                </p>
              </div>
            </div>

            {/* Supabase URL */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-slate-400" />
                <span>Supabase Project URL</span>
              </label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://xyzcompany.supabase.co"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              />
            </div>

            {/* Supabase Anon Key */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-slate-400" />
                <span>Supabase Anon Public Key (JWT)</span>
              </label>
              <textarea
                rows={4}
                value={anonKey}
                onChange={(e) => setAnonKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all leading-relaxed"
              />
            </div>

            {/* Test Result Feedback */}
            {testResult && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                  testResult.success
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="font-semibold">{testResult.message}</p>
                </div>
              </div>
            )}
          </div>

          {/* Actions Footer */}
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 px-3 py-2 rounded-xl hover:bg-rose-50 transition-colors w-full sm:w-auto justify-center"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Reset Kunci</span>
            </button>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                <span>Tes Koneksi</span>
              </button>

              <button
                type="button"
                onClick={handleSave}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{saveSuccess ? 'Tersimpan!' : 'Simpan Kunci'}</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
