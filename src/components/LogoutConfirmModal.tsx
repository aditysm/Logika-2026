import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, LogOut, X } from 'lucide-react';
import { Mahasiswa } from '../types';

interface LogoutConfirmModalProps {
  isOpen: boolean;
  currentUser: Mahasiswa | null;
  onConfirm: () => void;
  onClose: () => void;
}

export function LogoutConfirmModal({
  isOpen,
  currentUser,
  onConfirm,
  onClose,
}: LogoutConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        />

        {/* Modal Dialog */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.15 }}
          className="relative bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 z-10 space-y-5"
          role="dialog"
          aria-modal="true"
          aria-labelledby="logout-dialog-title"
        >
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            title="Batal"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Warning Icon & Title */}
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center shrink-0">
              <LogOut className="w-6 h-6" />
            </div>
            <div className="min-w-0 pr-4">
              <h3 id="logout-dialog-title" className="text-base font-bold text-slate-900 leading-tight">
                Konfirmasi Keluar Akun
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Apakah Anda yakin ingin keluar dari sesi mahasiswa ini?
              </p>
            </div>
          </div>

          {/* User Preview Box */}
          {currentUser && (
            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Akun Terhubung
              </span>
              <p className="font-bold text-slate-900 truncate text-sm">
                {currentUser.namaLengkap}
              </p>
              <p className="font-mono text-slate-500 text-xs truncate">{currentUser.nim}</p>
            </div>
          )}

          {/* Info note */}
          <div className="flex items-start gap-2 text-[11px] text-slate-500 bg-blue-50/70 border border-blue-100 rounded-xl p-2.5">
            <AlertCircle className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
            <span>
              Anda tetap dapat melihat direktori mahasiswa dan dapat masuk kembali kapan saja menggunakan NIM Anda.
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-1">
            <button
              id="btn-cancel-logout"
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200/80 active:scale-[0.98] text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer text-center"
            >
              Batal
            </button>
            <button
              id="btn-confirm-logout"
              type="button"
              onClick={() => {
                onClose();
                onConfirm();
              }}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer text-center"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Ya, Keluar</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
