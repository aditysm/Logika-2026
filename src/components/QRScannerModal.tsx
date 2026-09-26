import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Html5Qrcode } from 'html5-qrcode';
import {
  X,
  QrCode,
  RefreshCw,
  AlertCircle,
  Info,
  Scan,
  UserCircle,
  ArrowRight,
  RotateCcw,
  CheckCircle2,
  Users,
  MapPin,
  Sparkles,
  ExternalLink,
  Check,
  UserCheck,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { QRCodeCanvas } from 'qrcode.react';
import { Mahasiswa } from '../types';
import { normalizeNim } from '../lib/photoStorage';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  students?: Mahasiswa[];
  currentUser: Mahasiswa | null;
  onScanSuccess?: (decodedText: string) => void;
  onSelectStudent?: (student: Mahasiswa) => void;
  // Tracking mode support
  mode?: 'default' | 'tracking';
  trackingMap?: Record<string, boolean>;
  onChecklistStudent?: (student: Mahasiswa) => Promise<boolean | void> | void;
  initialShowOwnQr?: boolean;
}

export function QRScannerModal({
  isOpen,
  onClose,
  students = [],
  currentUser,
  onScanSuccess,
  onSelectStudent,
  mode = 'default',
  trackingMap = {},
  onChecklistStudent,
  initialShowOwnQr = false,
}: QRScannerModalProps) {
  const [error, setError] = useState<{ message: string; isPermission: boolean } | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [isShowingOwnQr, setIsShowingOwnQr] = useState(initialShowOwnQr);
  const [scannedStudent, setScannedStudent] = useState<Mahasiswa | null>(null);
  const [unrecognizedQrText, setUnrecognizedQrText] = useState<string | null>(null);
  const [checklistSuccess, setChecklistSuccess] = useState<boolean>(false);
  const [isProcessingChecklist, setIsProcessingChecklist] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerId = 'qr-reader';

  // Sync initial state when modal opens
  useEffect(() => {
    if (isOpen) {
      setIsShowingOwnQr(initialShowOwnQr);
      setScannedStudent(null);
      setUnrecognizedQrText(null);
      setChecklistSuccess(false);
      setIsProcessingChecklist(false);
    }
  }, [isOpen, initialShowOwnQr]);

  const getProfileUrl = () => {
    if (!currentUser) return window.location.origin;
    const url = new URL(window.location.origin);
    url.searchParams.set('search', currentUser.nim);
    return url.toString();
  };

  // Helper to extract matching student from decoded QR string
  const findStudentFromQr = (decodedText: string): Mahasiswa | null => {
    if (!decodedText || students.length === 0) return null;
    let query = decodedText.trim();

    try {
      const url = new URL(decodedText);
      const mhsMatch = url.pathname.match(/\/mhs\/([^/]+)/);
      if (mhsMatch && mhsMatch[1]) {
        query = decodeURIComponent(mhsMatch[1]);
      } else if (url.searchParams.get('search')) {
        query = url.searchParams.get('search')!;
      } else if (url.searchParams.get('nim')) {
        query = url.searchParams.get('nim')!;
      } else if (url.hash) {
        const hashMhs = url.hash.match(/mhs=([^&]+)/) || url.hash.match(/search=([^&]+)/);
        if (hashMhs && hashMhs[1]) {
          query = decodeURIComponent(hashMhs[1]);
        }
      }
    } catch {
      // Not a URL, use raw string
    }

    const cleanQuery = query.toLowerCase().replace(/[^a-z0-9]/g, '');

    // 1. Match by exact normalized NIM or ID
    const directMatch = students.find((s) => {
      const sNim = (s.nim || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const sId = (s.id || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      return (sNim && sNim === cleanQuery) || (sId && sId === cleanQuery);
    });
    if (directMatch) return directMatch;

    // 2. Match by partial NIM or exact name
    const nameMatch = students.find((s) => {
      const sNim = (s.nim || '').toLowerCase();
      const sName = (s.namaLengkap || '').toLowerCase();
      const sNick = (s.namaPanggilan || '').toLowerCase();
      const lowerQuery = query.toLowerCase();

      return (
        sNim === lowerQuery ||
        sName === lowerQuery ||
        (sNick && sNick === lowerQuery) ||
        sName.includes(lowerQuery)
      );
    });

    return nameMatch || null;
  };

  const stopScanner = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (err) {
        console.warn('Error stopping scanner:', err);
      }
    }
  };

  useEffect(() => {
    if (!isOpen || isShowingOwnQr || scannedStudent || unrecognizedQrText) {
      stopScanner();
      return;
    }

    const startScanner = async () => {
      setIsInitializing(true);
      setError(null);

      try {
        // Wait for the DOM element to be available (Portal might take a frame)
        let element = document.getElementById(scannerId);
        let attempts = 0;
        while (!element && attempts < 10) {
          await new Promise((resolve) => setTimeout(resolve, 100));
          element = document.getElementById(scannerId);
          attempts++;
        }

        if (!element) {
          throw new Error('HTML Element with id=qr-reader not found');
        }

        if (scannerRef.current) {
          try {
            if (scannerRef.current.isScanning) {
              await scannerRef.current.stop();
            }
            scannerRef.current.clear();
          } catch (e) {
            console.warn('Cleanup error:', e);
          }
        }

        const html5QrCode = new Html5Qrcode(scannerId);
        scannerRef.current = html5QrCode;

        const config = {
          fps: 20,
        };

        await html5QrCode.start(
          { facingMode: 'environment' },
          config,
          (decodedText) => {
            // Stop scanner immediately upon detection
            stopScanner();
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
              try { navigator.vibrate(60); } catch { /* ignore */ }
            }

            const found = findStudentFromQr(decodedText);
            if (found) {
              setScannedStudent(found);
              setChecklistSuccess(false);
            } else {
              setUnrecognizedQrText(decodedText);
            }
          },
          () => {}
        );
        setIsInitializing(false);
      } catch (err: any) {
        console.error('QR Scanner Error:', err);

        let displayMessage = 'Gagal mengakses kamera. Pastikan izin kamera telah diberikan.';
        let isPermission = false;

        if (err?.name === 'NotAllowedError' || err?.message?.includes('Permission denied')) {
          displayMessage =
            'Izin kamera ditolak. Silahkan klik ikon gembok di bilah alamat browser Anda dan aktifkan kamera.';
          isPermission = true;
        } else if (err?.name === 'NotFoundError') {
          displayMessage = 'Kamera tidak ditemukan pada perangkat Anda.';
        } else if (err?.message?.includes('not found')) {
          displayMessage = 'Sistem gagal memuat area pemindaian. Silahkan coba lagi.';
        }

        setError({ message: displayMessage, isPermission });
        setIsInitializing(false);
      }
    };

    const timer = setTimeout(startScanner, 400);

    return () => {
      clearTimeout(timer);
      stopScanner();
    };
  }, [isOpen, retryCount, isShowingOwnQr, scannedStudent, unrecognizedQrText]);

  const handleRetry = () => {
    setScannedStudent(null);
    setUnrecognizedQrText(null);
    setChecklistSuccess(false);
    setRetryCount((prev) => prev + 1);
  };

  const handleConfirmStudent = () => {
    if (!scannedStudent) return;
    const studentToOpen = scannedStudent;
    setScannedStudent(null);
    setUnrecognizedQrText(null);
    stopScanner();
    onClose();

    if (onSelectStudent) {
      onSelectStudent(studentToOpen);
    } else if (onScanSuccess) {
      onScanSuccess(studentToOpen.nim || studentToOpen.id);
    }
  };

  const handleExecuteChecklist = async () => {
    if (!scannedStudent || !onChecklistStudent) return;
    setIsProcessingChecklist(true);

    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try { navigator.vibrate([40, 60, 40]); } catch { /* ignore */ }
      }
      await onChecklistStudent(scannedStudent);
      setChecklistSuccess(true);
    } catch (err) {
      console.error('Checklist error from QR:', err);
    } finally {
      setIsProcessingChecklist(false);
    }
  };

  const handleFallbackSearch = () => {
    if (!unrecognizedQrText) return;
    const text = unrecognizedQrText;
    setScannedStudent(null);
    setUnrecognizedQrText(null);
    stopScanner();
    onClose();

    if (onScanSuccess) {
      onScanSuccess(text);
    }
  };

  const handleCloseAll = () => {
    setScannedStudent(null);
    setUnrecognizedQrText(null);
    setChecklistSuccess(false);
    stopScanner();
    onClose();
  };

  if (!isOpen) return null;

  const isScannedSelf = currentUser && scannedStudent && normalizeNim(currentUser.nim) === normalizeNim(scannedStudent.nim);
  const isAlreadyChecked = scannedStudent ? (trackingMap[scannedStudent.nim] || false) : false;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center sm:p-4 overflow-hidden">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-slate-950/90 backdrop-blur-md"
        />

        {/* Immersive Scanner / Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full h-full sm:h-auto sm:max-w-md sm:aspect-[3/4] bg-slate-900 sm:rounded-[36px] overflow-hidden flex flex-col shadow-2xl border border-slate-800"
        >
          {/* Top Control Bar */}
          <div className="absolute top-0 left-0 right-0 p-5 flex items-center justify-between z-30 pointer-events-none">
            <div className="flex items-center gap-3 pointer-events-auto">
              <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 text-white flex items-center justify-center shadow-lg">
                <QrCode className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white tracking-tight">
                  {mode === 'tracking' ? 'QR Tracking Foto' : 'Pindai QR Code'}
                </h3>
                <p className="text-[10px] text-slate-400 font-medium">Logika 2026</p>
              </div>
            </div>
            <button
              onClick={handleCloseAll}
              className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 text-white hover:bg-white/20 transition-all flex items-center justify-center cursor-pointer pointer-events-auto active:scale-90"
              aria-label="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Core Viewport */}
          <div className="flex-1 relative overflow-hidden flex items-center justify-center">
            {/* 1. Scanned Student Confirmation Modal */}
            {scannedStudent ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="absolute inset-0 z-40 bg-slate-950/95 backdrop-blur-xl p-6 flex flex-col justify-between overflow-y-auto"
              >
                <div className="pt-16 pb-4 flex flex-col items-center text-center">
                  {/* Status Badge */}
                  {checklistSuccess ? (
                    <motion.div 
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold mb-4 shadow-lg shadow-emerald-950"
                    >
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>Checklist Berhasil Dicatat!</span>
                    </motion.div>
                  ) : isAlreadyChecked ? (
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-500/40 text-blue-300 text-xs font-semibold mb-4">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                      <span>Sudah Dichecklist</span>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold mb-4">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Mahasiswa Terdeteksi</span>
                    </div>
                  )}

                  {/* Student Avatar / Initials */}
                  <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-500 text-white flex items-center justify-center text-2xl font-black shadow-xl shadow-blue-900/40 border-2 border-white/20 mb-3">
                    {scannedStudent.namaLengkap
                      ? scannedStudent.namaLengkap
                          .split(' ')
                          .filter(Boolean)
                          .slice(0, 2)
                          .map((n) => n[0])
                          .join('')
                          .toUpperCase()
                      : 'M'}
                  </div>

                  {/* Student Name */}
                  <h4 className="text-xl font-extrabold text-white tracking-tight leading-snug max-w-xs">
                    {scannedStudent.namaLengkap}
                  </h4>
                  {scannedStudent.namaPanggilan && (
                    <p className="text-xs text-blue-400 font-semibold mt-0.5">
                      Panggilan: &quot;{scannedStudent.namaPanggilan}&quot;
                    </p>
                  )}

                  {/* Student Metadata Card with Prominent Kelompok */}
                  <div className="w-full mt-4 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 text-left space-y-3 shadow-inner">
                    {/* Kelompok Highlight Badge */}
                    <div className="flex items-center justify-between text-xs pb-2.5 border-b border-slate-800 gap-2">
                      <span className="text-slate-400 font-medium shrink-0 flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-blue-400" />
                        Kelompok
                      </span>
                      <span className="font-extrabold text-blue-300 text-right bg-blue-950/60 px-2.5 py-1 rounded-lg border border-blue-800/60">
                        {scannedStudent.kelompok || 'Belum ada kelompok'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs pb-2.5 border-b border-slate-800">
                      <span className="text-slate-400 font-medium">NIM</span>
                      <span className="font-mono font-bold text-white tracking-wider bg-slate-800 px-2.5 py-0.5 rounded-lg border border-slate-700">
                        {scannedStudent.nim || '-'}
                      </span>
                    </div>

                    {(scannedStudent.asalRumah || scannedStudent.alamatRumahDomisili) && (
                      <div className="flex items-start justify-between text-xs gap-2">
                        <span className="text-slate-400 font-medium shrink-0 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                          Asal
                        </span>
                        <span className="font-normal text-slate-300 text-right truncate max-w-[180px]">
                          {scannedStudent.asalRumah || scannedStudent.alamatRumahDomisili}
                        </span>
                      </div>
                    )}
                  </div>

                  {isScannedSelf && (
                    <div className="mt-3 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
                      Ini adalah QR Code profil akun Anda sendiri.
                    </div>
                  )}

                  {!isScannedSelf && (
                    <p className="text-xs text-slate-400 mt-3 leading-relaxed max-w-xs">
                      {mode === 'tracking'
                        ? isAlreadyChecked
                          ? 'Foto bersama mahasiswa ini sudah tercatat dichecklist.'
                          : 'Tekan tombol di bawah untuk menandai foto bersama secara instan.'
                        : 'Apakah ini mahasiswa yang ingin Anda tuju?'}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="space-y-2 pt-2 pb-2">
                  {/* Mode Tracking: Instant Checklist Button */}
                  {mode === 'tracking' && !isScannedSelf && onChecklistStudent ? (
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={handleExecuteChecklist}
                        disabled={isProcessingChecklist}
                        className={`w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl text-xs font-black transition-all shadow-lg active:scale-95 cursor-pointer ${
                          isAlreadyChecked
                            ? 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30'
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
                        }`}
                      >
                        {isProcessingChecklist ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : isAlreadyChecked ? (
                          <RotateCcw className="w-4 h-4" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4" />
                        )}
                        <span>
                          {isProcessingChecklist
                            ? 'Menyimpan...'
                            : isAlreadyChecked
                              ? 'Batal / Hapus Checklist'
                              : 'Ya, Checklist Foto'}
                        </span>
                      </button>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={handleRetry}
                          className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all border border-slate-700 active:scale-95 cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Pindai Lain</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleConfirmStudent}
                          className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-blue-600/30 hover:bg-blue-600/50 text-blue-200 text-xs font-bold transition-all border border-blue-500/30 active:scale-95 cursor-pointer"
                        >
                          <span>Buka Detail</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Default Mode Actions */
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={handleRetry}
                        className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all border border-slate-700 active:scale-95 cursor-pointer"
                      >
                        <RotateCcw className="w-4 h-4" />
                        <span>Pindai Ulang</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleConfirmStudent}
                        className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-lg shadow-blue-600/30 active:scale-95 cursor-pointer"
                      >
                        <span>Ya, Buka Detail</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            ) : unrecognizedQrText ? (
              /* 2. Unrecognized QR Code Result Modal */
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute inset-0 z-40 bg-slate-950/95 backdrop-blur-xl p-6 flex flex-col justify-between"
              >
                <div className="pt-20 flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mb-4">
                    <AlertCircle className="w-8 h-8" />
                  </div>
                  <h4 className="text-lg font-bold text-white mb-2">Data Mahasiswa Tidak Ditemukan</h4>
                  <p className="text-xs text-slate-400 mb-4 max-w-xs leading-relaxed">
                    QR Code yang dipindai tidak terdaftar dalam database mahasiswa Logika 2026.
                  </p>

                  <div className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-left">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">
                      Konten QR:
                    </p>
                    <p className="text-xs font-mono text-slate-300 break-all">{unrecognizedQrText}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-4 pb-2">
                  <button
                    type="button"
                    onClick={handleRetry}
                    className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all border border-slate-700 active:scale-95 cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Pindai Ulang</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleFallbackSearch}
                    className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-lg shadow-blue-600/30 active:scale-95 cursor-pointer"
                  >
                    <span>Cari di Daftar</span>
                    <ExternalLink className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ) : isShowingOwnQr ? (
              /* 3. Own QR Code Display with Group Highlighting */
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-slate-950 z-20 overflow-y-auto">
                <div className="mt-12 mb-3 text-center">
                  <span className="px-3 py-1 bg-blue-500/20 border border-blue-500/40 text-blue-300 rounded-full text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-1.5 mb-2">
                    <UserCheck className="w-3.5 h-3.5" />
                    QR Profil Anda
                  </span>
                  <h4 className="text-base font-bold text-white leading-snug">
                    {currentUser?.namaLengkap || 'Profil Saya'}
                  </h4>
                  {currentUser?.kelompok && (
                    <p className="text-xs font-bold text-blue-400 mt-0.5">
                      {currentUser.kelompok}
                    </p>
                  )}
                  {currentUser?.nim && (
                    <p className="text-[11px] font-mono text-slate-400">
                      NIM: {currentUser.nim}
                    </p>
                  )}
                </div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white p-5 rounded-[2.5rem] shadow-2xl border-4 border-blue-500/20"
                >
                  <QRCodeCanvas
                    value={getProfileUrl()}
                    size={180}
                    level="H"
                    includeMargin={false}
                    imageSettings={{
                      src: `${window.location.origin}/favicon.ico`,
                      x: undefined,
                      y: undefined,
                      height: 32,
                      width: 32,
                      excavate: true,
                    }}
                  />
                </motion.div>
                <div className="mt-4 text-center max-w-xs">
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Tunjukkan QR ini ke teman Anda saat foto bersama. Teman cukup scan untuk langsung mencatat checklist foto & mendeteksi kelompok Anda secara instan.
                  </p>
                </div>
              </div>
            ) : (
              /* 4. Active Scanner Camera View */
              <>
                {isInitializing && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white z-20">
                    <RefreshCw className="w-10 h-10 animate-spin text-blue-500 mb-4" />
                    <p className="text-xs text-white/60">Memuat Kamera...</p>
                  </div>
                )}

                {error ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-10 text-center text-white z-20 bg-slate-950/90 backdrop-blur-xl">
                    <div className="w-20 h-20 rounded-[2rem] bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mb-6">
                      <AlertCircle className="w-10 h-10" />
                    </div>
                    <h4 className="text-xl font-bold mb-3">Butuh Akses Kamera</h4>
                    <p className="text-sm text-slate-400 mb-8 leading-relaxed max-w-xs mx-auto">
                      {error.message}
                    </p>
                    <div className="flex flex-col w-full max-w-xs gap-3">
                      <button
                        onClick={handleRetry}
                        className="flex items-center justify-center gap-3 px-8 py-4 bg-white text-slate-950 font-bold rounded-2xl text-sm transition-all shadow-xl active:scale-95 cursor-pointer"
                      >
                        <RefreshCw className="w-5 h-5" />
                        <span>Coba Lagi</span>
                      </button>
                      <button
                        onClick={handleCloseAll}
                        className="px-8 py-4 bg-white/5 text-white/60 font-bold rounded-2xl text-sm transition-all border border-white/10 active:scale-95 cursor-pointer"
                      >
                        Tutup
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <style>{`
                      #${scannerId} {
                        width: 100% !important;
                        height: 100% !important;
                        position: absolute !important;
                        inset: 0 !important;
                        border: none !important;
                        padding: 0 !important;
                        overflow: hidden !important;
                      }
                      #${scannerId} video {
                        width: 100% !important;
                        height: 100% !important;
                        min-width: 100% !important;
                        min-height: 100% !important;
                        object-fit: cover !important;
                        position: absolute !important;
                        inset: 0 !important;
                      }
                      #${scannerId} img[alt="Info icon"] { display: none !important; }
                      #${scannerId} div { border: none !important; }
                    `}</style>

                    <div id={scannerId} className="w-full h-full bg-black relative" />

                    {/* Laser Scanner Reticle Frame */}
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-8 pointer-events-none">
                      <div className="relative w-64 h-64 sm:w-72 sm:h-72">
                        {/* 4 Glowing Corner Highlights */}
                        <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-2xl shadow-[0_0_15px_rgba(59,130,246,0.8)]" />
                        <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-2xl shadow-[0_0_15px_rgba(59,130,246,0.8)]" />
                        <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-2xl shadow-[0_0_15px_rgba(59,130,246,0.8)]" />
                        <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-2xl shadow-[0_0_15px_rgba(59,130,246,0.8)]" />

                        {/* Animated Laser Scanning Line */}
                        <motion.div
                          animate={{ y: [0, 240, 0] }}
                          transition={{
                            duration: 2.2,
                            repeat: Infinity,
                            ease: 'easeInOut',
                          }}
                          className="w-full h-0.5 bg-gradient-to-r from-transparent via-blue-400 to-transparent shadow-[0_0_12px_rgba(96,165,250,1)]"
                        />
                      </div>

                      {/* Instruction Pill */}
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-6 px-4 py-2 bg-slate-950/80 backdrop-blur-md rounded-full border border-white/10 flex items-center gap-2 text-white shadow-xl pointer-events-auto"
                      >
                        <div className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center">
                          <Info className="w-3 h-3" />
                        </div>
                        <p className="text-[11px] font-medium text-slate-100 leading-tight">
                          {mode === 'tracking'
                            ? 'Arahkan kamera ke QR teman untuk checklist foto'
                            : 'Arahkan kamera ke QR Code teman untuk memindai'}
                        </p>
                      </motion.div>
                    </div>
                  </>
                )}
              </>
            )}
          </div>

          {/* Toggle Button Container (Bottom) */}
          {currentUser && !scannedStudent && !unrecognizedQrText && (
            <div className="absolute bottom-5 left-0 right-0 z-40 flex justify-center px-6">
              <button
                onClick={() => setIsShowingOwnQr(!isShowingOwnQr)}
                className="group flex flex-col items-center gap-2 cursor-pointer transition-all active:scale-95"
              >
                <div className="flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 rounded-2xl text-white transition-all shadow-lg">
                  {isShowingOwnQr ? (
                    <>
                      <Scan className="w-4 h-4 text-blue-400" />
                      <span className="text-xs font-bold">Scan QR</span>
                    </>
                  ) : (
                    <>
                      <UserCircle className="w-4 h-4 text-blue-400" />
                      <span className="text-xs font-bold">Tampilkan QR Saya</span>
                    </>
                  )}
                </div>
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
