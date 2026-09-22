import { useState, useMemo, FormEvent } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, ArrowRight, Camera, CheckCircle2, ChevronDown, KeyRound, Loader2, LogIn, Search, ShieldAlert, ShieldCheck, Sparkles, UserCheck, X } from 'lucide-react';
import { Mahasiswa } from '../types';
import { findStudentInList } from '../lib/photoStorage';

const PROTECTED_NIM = 'F1D02610029';
const REQUIRED_PASSKEY = 'qwerty31';

function isProtectedNim(nim?: string | null): boolean {
  if (!nim) return false;
  const clean = nim.trim().toUpperCase().replace(/[\/\s_-]/g, '');
  return clean === PROTECTED_NIM.replace(/[\/\s_-]/g, '');
}

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
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const returnParam = searchParams.get('return');

  const [nimInput, setNimInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [toastError, setToastError] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState<boolean>(false);
  const [pendingConfirmStudent, setPendingConfirmStudent] = useState<Mahasiswa | null>(null);
  const [showQuickSelect, setShowQuickSelect] = useState(false);
  const [quickFilter, setQuickFilter] = useState('');

  // Protected NIM states
  const [passkeyInput, setPasskeyInput] = useState('');
  const [passkeyError, setPasskeyError] = useState<string | null>(null);

  const showToastError = (msg: string) => {
    setToastError(msg);
    setTimeout(() => {
      setToastError((prev) => (prev === msg ? null : prev));
    }, 4500);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setPasskeyInput('');
    setPasskeyError(null);

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
    setPasskeyInput('');
    setPasskeyError(null);
    setPendingConfirmStudent(student);
  };

  const handleConfirmLogin = () => {
    if (!pendingConfirmStudent || isConfirming) return;

    if (isProtectedNim(pendingConfirmStudent.nim)) {
      if (passkeyInput.trim() !== REQUIRED_PASSKEY) {
        const msg = 'Kunci akses keamanan tidak sesuai. Silakan masukkan kunci otorisasi yang valid.';
        setPasskeyError(msg);
        showToastError(msg);
        return;
      }
    }

    setIsConfirming(true);
    onLogin(pendingConfirmStudent.nim);
  };

  const handleCancelConfirm = () => {
    if (isConfirming) return;
    setPendingConfirmStudent(null);
    setPasskeyInput('');
    setPasskeyError(null);
    showToastError('Konfirmasi dibatalkan. Silakan periksa kembali NIM Anda.');
  };

  const filteredQuickList = useMemo(() => {
    const q = quickFilter.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) => {
      return (
        s.namaLengkap.toLowerCase().includes(q) ||
        (s.namaPanggilan && s.namaPanggilan.toLowerCase().includes(q)) ||
        s.nim.toLowerCase().includes(q) ||
        s.kelompok.toLowerCase().includes(q)
      );
    });
  }, [students, quickFilter]);

  return (
    <div className="flex-1 flex flex-col justify-center">
      {/* Main Centered Minimal Card */}
      <div className="w-full max-w-md mx-auto my-auto px-2 sm:px-4 py-2 sm:py-4 relative">
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
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.15 }}
          className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-8 shadow-xs"
        >
          {/* If redirected from Upload Photo button */}
          {targetStudentForUpload ? (
            <div className="mb-4 p-3 rounded-2xl bg-blue-50/80 border border-blue-200/80 text-xs text-blue-900 flex items-start gap-2.5">
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
          ) : returnParam === 'tracking' ? (
            <div className="mb-4 p-3 rounded-2xl bg-blue-50/80 border border-blue-200/80 text-xs text-blue-900 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-blue-950">
                  Akses Photo Tracking
                </p>
                <p className="text-[11px] text-blue-700 mt-0.5">
                  Silakan masuk ke akun Anda terlebih dahulu untuk mengakses checklist foto bersama dan fitur QR.
                </p>
              </div>
            </div>
          ) : returnParam === 'pricing' ? (
            <div className="mb-4 p-3 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-xs text-amber-900 flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-950">
                  Akses Fitur Premium
                </p>
                <p className="text-[11px] text-amber-700 mt-0.5">
                  Silakan masuk ke akun Anda terlebih dahulu untuk melihat pilihan paket akun & mengaktifkan fitur premium.
                </p>
              </div>
            </div>
          ) : returnParam === 'profile' ? (
            <div className="mb-4 p-3 rounded-2xl bg-blue-50/80 border border-blue-200/80 text-xs text-blue-900 flex items-start gap-2.5">
              <UserCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-blue-950">
                  Akses Edit Profil
                </p>
                <p className="text-[11px] text-blue-700 mt-0.5">
                  Silakan masuk ke akun Anda terlebih dahulu untuk mengedit profil biodata dan foto.
                </p>
              </div>
            </div>
          ) : null}

          {/* Header */}
          <div className="text-center mb-5 sm:mb-6">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-2.5 shadow-2xs">
              <UserCheck className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Masuk Akun Mahasiswa
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
              {targetStudentForUpload
                ? 'Identifikasi diri Anda untuk mencatat foto bersama.'
                : returnParam === 'tracking'
                ? 'Masuk ke akun Anda untuk membuka halaman Photo Tracking.'
                : returnParam === 'pricing'
                ? 'Masuk ke akun Anda untuk membuka halaman Akses Premium.'
                : 'Masukkan NIM Anda untuk mengakses progress foto bersama dan profil pribadi.'}
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label htmlFor="input-nim-login" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Nomor Induk Mahasiswa (NIM)
              </label>
              <div className="relative">
                <input
                  id="input-nim-login"
                  type="text"
                  autoFocus
                  disabled={isLoading}
                  value={nimInput}
                  onChange={(e) => {
                    setNimInput(e.target.value);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  placeholder={isLoading ? "Mohon tunggu..." : "F1D026...."}
                  className={`w-full px-4 py-2.5 sm:py-3 bg-slate-50 border rounded-xl text-sm font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:bg-white transition-all ${
                    isLoading ? 'opacity-60 cursor-not-allowed' : ''
                  } ${
                    errorMsg
                      ? 'border-rose-300 focus:ring-rose-500'
                      : 'border-slate-200 focus:ring-blue-500 focus:border-blue-500'
                  }`}
                />
                {nimInput && !isLoading && (
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
              className="w-full flex items-center justify-center gap-2 py-2.5 sm:py-3 px-4 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold text-sm rounded-xl shadow-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <LogIn className="w-4 h-4" />
              )}
              <span>{isLoading ? 'Sedang Memuat...' : 'Masuk Akun'}</span>
            </button>
          </form>

          {/* Quick Select Accordion / Modal for seamless testing */}
          <div className={`mt-4 pt-4 border-t border-slate-100 ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}>
            <button
              type="button"
              disabled={isLoading}
              onClick={() => setShowQuickSelect(!showQuickSelect)}
              className="w-full flex items-center justify-between text-xs font-semibold text-slate-600 hover:text-blue-600 transition-colors py-1 focus:outline-none disabled:cursor-not-allowed"
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

          {/* Continue as Guest Button */}
          <div className="mt-4 pt-3 border-t border-slate-100 text-center">
            <button
              type="button"
              disabled={isLoading}
              onClick={onContinueWithoutAccount}
              className="inline-flex items-center justify-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 font-semibold py-1 px-3 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <span>Lanjut tanpa akun (Mode Tamu)</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
        </motion.div>
      </div>

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

              {/* Special Passkey Protection for Protected NIM */}
              {isProtectedNim(pendingConfirmStudent.nim) && (
                <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-4 text-left space-y-2.5">
                  <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                    <KeyRound className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Otorisasi Akses Khusus</span>
                  </div>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    NIM ini memerlukan verifikasi kode otorisasi sebelum dapat masuk ke akun.
                  </p>
                  <div>
                    <label htmlFor="input-passkey-protected" className="block text-[11px] font-semibold text-amber-950 mb-1">
                      Kunci Akses
                    </label>
                    <input
                      id="input-passkey-protected"
                      type="password"
                      autoFocus
                      value={passkeyInput}
                      onChange={(e) => {
                        setPasskeyInput(e.target.value);
                        if (passkeyError) setPasskeyError(null);
                      }}
                      placeholder="Masukkan kunci akses..."
                      className={`w-full px-3 py-2 text-xs bg-white border rounded-xl font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all ${
                        passkeyError
                          ? 'border-rose-300 focus:ring-rose-500 bg-rose-50/40'
                          : 'border-amber-300 focus:ring-amber-500'
                      }`}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleConfirmLogin();
                        }
                      }}
                    />
                    {passkeyError && (
                      <p className="text-[11px] text-rose-600 mt-1.5 flex items-center gap-1 font-medium">
                        <span>&bull;</span>
                        <span>{passkeyError}</span>
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Confirmation Action Buttons */}
              <div className="pt-2 flex flex-col-reverse sm:flex-row items-center gap-2.5">
                <button
                  type="button"
                  disabled={isConfirming}
                  onClick={handleCancelConfirm}
                  className="w-full sm:w-1/2 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  Bukan, Ini Bukan Saya
                </button>
                <button
                  id="btn-confirm-identity-yes"
                  type="button"
                  disabled={isConfirming}
                  onClick={handleConfirmLogin}
                  className="w-full sm:w-1/2 inline-flex items-center justify-center gap-1.5 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-all shadow-xs cursor-pointer disabled:opacity-70"
                >
                  {isConfirming ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Memproses...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Ya, Ini Data Saya</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

