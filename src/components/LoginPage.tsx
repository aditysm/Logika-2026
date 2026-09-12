import { useState, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, ArrowRight, Camera, CheckCircle2, ChevronDown, LogIn, Search, ShieldCheck, UserCheck, X } from 'lucide-react';
import { Mahasiswa } from '../types';
import { findStudentInList } from '../lib/photoStorage';

interface LoginPageProps {
  students: Mahasiswa[];
  isLoading: boolean;
  onLogin: (nim: string) => void;
  onContinueWithoutAccount: () => void;
  targetStudentForUpload?: Mahasiswa | null;
}

export function LoginPage({
  students,
  isLoading,
  onLogin,
  onContinueWithoutAccount,
  targetStudentForUpload,
}: LoginPageProps) {
  const [nimInput, setNimInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [toastError, setToastError] = useState<string | null>(null);
  const [pendingConfirmStudent, setPendingConfirmStudent] = useState<Mahasiswa | null>(null);
  const [showQuickSelect, setShowQuickSelect] = useState(false);
  const [quickFilter, setQuickFilter] = useState('');

  const showToastError = (msg: string) => {
    setToastError(msg);
    setTimeout(() => {
      setToastError((prev) => (prev === msg ? null : prev));
    }, 4500);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmed = nimInput.trim();
    if (!trimmed) {
      const msg = 'Silakan masukkan NIM Anda terlebih dahulu.';
      setErrorMsg(msg);
      showToastError(msg);
      return;
    }

    const student = findStudentInList(students, trimmed);
    if (student) {
      setErrorMsg(null);
      setPendingConfirmStudent(student);
    } else {
      const msg = `NIM "${trimmed}" tidak ditemukan dalam direktori data mahasiswa Logika 2026. Silakan periksa kembali.`;
      setErrorMsg(msg);
      showToastError(msg);
    }
  };

  const handleSelectStudent = (student: Mahasiswa) => {
    setErrorMsg(null);
    setPendingConfirmStudent(student);
  };

  const handleConfirmLogin = () => {
    if (pendingConfirmStudent) {
      onLogin(pendingConfirmStudent.nim);
      setPendingConfirmStudent(null);
    }
  };

  const handleCancelConfirm = () => {
    setPendingConfirmStudent(null);
    showToastError('Konfirmasi dibatalkan. Silakan periksa kembali NIM Anda.');
  };

  const filteredQuickList = quickFilter.trim()
    ? students.filter((s) => {
        const q = quickFilter.toLowerCase();
        return (
          s.namaLengkap.toLowerCase().includes(q) ||
          (s.namaPanggilan && s.namaPanggilan.toLowerCase().includes(q)) ||
          s.nim.toLowerCase().includes(q) ||
          s.kelompok.toLowerCase().includes(q)
        );
      })
    : students;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Top Header Bar */}
      <header className="bg-white/90 backdrop-blur-md border-b border-slate-200 py-3.5 px-4 sm:px-6">
        <div className="max-w-6xl w-full mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-sm shadow-xs">
              L
            </div>
            <div>
              <span className="text-sm font-bold text-slate-800 tracking-tight block leading-tight">
                Logika 2026
              </span>
              <span className="text-[11px] text-slate-400 hidden sm:block">
                Autentikasi Mahasiswa
              </span>
            </div>
          </div>

          {/* Tanpa Akun Button */}
          <button
            id="btn-login-tanpa-akun"
            type="button"
            onClick={onContinueWithoutAccount}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-blue-700 bg-white hover:bg-slate-50 border border-slate-200/90 rounded-xl transition-all shadow-xs cursor-pointer"
            title="Lanjut ke pencarian direktori tanpa login"
          >
            <span>Tanpa Akun</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>
      </header>

      {/* Main Centered Minimal Card */}
      <main className="w-full max-w-md mx-auto my-auto px-4 py-8 relative">
        {/* Floating Toast Error Notification */}
        <AnimatePresence>
          {toastError && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-rose-950/95 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-rose-800 text-xs font-medium max-w-md w-[92%] backdrop-blur-md"
            >
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span className="flex-1 text-rose-100">{toastError}</span>
              <button
                type="button"
                onClick={() => setToastError(null)}
                className="p-1 text-rose-300 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="bg-white border border-slate-200 rounded-3xl p-7 sm:p-9 shadow-xs"
        >
          {/* If redirected from Upload Photo button */}
          {targetStudentForUpload && (
            <div className="mb-6 p-3.5 rounded-2xl bg-blue-50/80 border border-blue-200/80 text-xs text-blue-900 flex items-start gap-2.5">
              <Camera className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-blue-950">
                  Unggah Foto Bersama {targetStudentForUpload.namaPanggilan || targetStudentForUpload.namaLengkap}
                </p>
                <p className="text-[11px] text-blue-700 mt-0.5">
                  Silakan pilih atau masukkan akun Anda di bawah untuk melanjutkan perekaman foto bersama.
                </p>
              </div>
            </div>
          )}

          {/* Header */}
          <div className="text-center mb-7">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-3.5 shadow-2xs">
              <UserCheck className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Masuk Akun Mahasiswa
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1.5 leading-relaxed">
              {targetStudentForUpload
                ? 'Identifikasi diri Anda untuk mencatat foto bersama ke database.'
                : 'Masukkan NIM Anda untuk mengakses progress foto bersama dan profil pribadi.'}
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="input-nim-login" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Nomor Induk Mahasiswa (NIM)
              </label>
              <div className="relative">
                <input
                  id="input-nim-login"
                  type="text"
                  autoFocus
                  value={nimInput}
                  onChange={(e) => {
                    setNimInput(e.target.value);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  placeholder="F1D026...."
                  className={`w-full px-4 py-3 bg-slate-50 border rounded-xl text-sm font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:bg-white transition-all ${
                    errorMsg
                      ? 'border-rose-300 focus:ring-rose-500'
                      : 'border-slate-200 focus:ring-blue-500 focus:border-blue-500'
                  }`}
                />
                {nimInput && (
                  <button
                    type="button"
                    onClick={() => setNimInput('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 font-medium px-1"
                  >
                    Hapus
                  </button>
                )}
              </div>

              {errorMsg && (
                <p className="text-xs text-rose-600 mt-2 flex items-center gap-1 font-medium">
                  <span>&bull;</span>
                  <span>{errorMsg}</span>
                </p>
              )}
            </div>

            <button
              id="btn-submit-login"
              type="submit"
              disabled={isLoading || !nimInput.trim()}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold text-sm rounded-xl shadow-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>Masuk Akun</span>
            </button>
          </form>

          {/* Quick Select Accordion / Modal for seamless testing */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowQuickSelect(!showQuickSelect)}
              className="w-full flex items-center justify-between text-xs font-semibold text-slate-600 hover:text-blue-600 transition-colors py-1 focus:outline-none"
            >
              <span>Atau pilih nama Anda langsung</span>
              <ChevronDown
                className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                  showQuickSelect ? 'rotate-180' : ''
                }`}
              />
            </button>

            {showQuickSelect && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 space-y-2"
              >
                {/* Search Filter for Quick Select */}
                {students.length > 5 && (
                  <div className="relative mb-2">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={quickFilter}
                      onChange={(e) => setQuickFilter(e.target.value)}
                      placeholder="Cari nama atau kelompok..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                )}

                <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                  {filteredQuickList.length > 0 ? (
                    filteredQuickList.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => handleSelectStudent(m)}
                        className="w-full flex items-center justify-between p-2 rounded-xl text-left text-xs hover:bg-blue-50/80 transition-colors group"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px] shrink-0">
                            {m.namaLengkap.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900 group-hover:text-blue-700 truncate">
                              {m.namaLengkap}
                            </p>
                            <p className="text-[10px] font-mono text-slate-400 truncate">
                              {m.nim} &bull; {m.kelompok}
                            </p>
                          </div>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-600 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 text-center py-2">
                      Mahasiswa tidak ditemukan.
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </main>

      {/* Identity Confirmation Modal */}
      <AnimatePresence>
        {pendingConfirmStudent && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto"
            onClick={handleCancelConfirm}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 relative my-6 text-center space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-2xs border border-blue-100">
                <ShieldCheck className="w-7 h-7" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Konfirmasi Identitas Mahasiswa
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
                  Apakah ini benar data akun Anda?
                </p>
              </div>

              {/* Data Card displaying Nama Lengkap, NIM, and Kelompok */}
              <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 text-left space-y-2.5 text-xs">
                <div className="flex justify-between items-start border-b border-slate-200/60 pb-2">
                  <span className="text-slate-500 shrink-0">Nama Lengkap</span>
                  <span className="font-bold text-slate-900 text-right max-w-[210px] break-words">
                    {pendingConfirmStudent.namaLengkap}
                  </span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-200/60 pb-2">
                  <span className="text-slate-500">NIM</span>
                  <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
                    {pendingConfirmStudent.nim}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Kelompok</span>
                  <span className="font-semibold text-slate-800 bg-slate-200/70 px-2.5 py-1 rounded-lg">
                    {pendingConfirmStudent.kelompok}
                  </span>
                </div>
              </div>

              {/* Confirmation Action Buttons */}
              <div className="pt-2 flex flex-col-reverse sm:flex-row items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleCancelConfirm}
                  className="w-full sm:w-1/2 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Bukan, Ini Bukan Saya
                </button>
                <button
                  type="button"
                  onClick={handleConfirmLogin}
                  className="w-full sm:w-1/2 inline-flex items-center justify-center gap-1.5 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-all shadow-xs cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Ya, Ini Data Saya</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer matching the search view */}
      <footer className="mt-auto border-t border-slate-200 bg-white/80 py-6 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-center text-center">
          <p className="font-medium text-slate-600">
            Data Peserta Logika 2026 &bull; Powered by <span className="font-bold text-slate-800">Dity Store</span>
          </p>
        </div>
      </footer>
    </div>
  );
}

