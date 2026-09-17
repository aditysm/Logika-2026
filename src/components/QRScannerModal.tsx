import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { X, QrCode, RefreshCw, AlertCircle, Info, Scan, UserCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { QRCodeCanvas } from 'qrcode.react';
import { Mahasiswa } from '../types';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (decodedText: string) => void;
  currentUser: Mahasiswa | null;
}

export function QRScannerModal({ isOpen, onClose, onScanSuccess, currentUser }: QRScannerModalProps) {
  const [error, setError] = useState<{message: string, isPermission: boolean} | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [isShowingOwnQr, setIsShowingOwnQr] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerId = "qr-reader";

  const getProfileUrl = () => {
    if (!currentUser) return window.location.origin;
    const url = new URL(window.location.origin);
    url.searchParams.set('search', currentUser.nim);
    return url.toString();
  };

  useEffect(() => {
    if (!isOpen || isShowingOwnQr) {
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
          await new Promise(resolve => setTimeout(resolve, 100));
          element = document.getElementById(scannerId);
          attempts++;
        }

        if (!element) {
          throw new Error("HTML Element with id=qr-reader not found");
        }

        if (scannerRef.current) {
          try {
            if (scannerRef.current.isScanning) {
              await scannerRef.current.stop();
            }
            scannerRef.current.clear();
          } catch (e) {
            console.warn("Cleanup error:", e);
          }
        }

        const html5QrCode = new Html5Qrcode(scannerId);
        scannerRef.current = html5QrCode;

        const config = { 
          fps: 15, 
          aspectRatio: 1.0
        };

        await html5QrCode.start(
          { facingMode: "environment" },
          config,
          (decodedText) => {
            onScanSuccess(decodedText);
            stopScanner();
            onClose();
          },
          () => {}
        );
        setIsInitializing(false);
      } catch (err: any) {
        console.error("QR Scanner Error:", err);
        
        let displayMessage = "Gagal mengakses kamera. Pastikan izin kamera telah diberikan.";
        let isPermission = false;

        if (err?.name === 'NotAllowedError' || err?.message?.includes('Permission denied')) {
          displayMessage = "Izin kamera ditolak. Silakan klik ikon gembok di bilah alamat browser Anda dan aktifkan kamera.";
          isPermission = true;
        } else if (err?.name === 'NotFoundError') {
          displayMessage = "Kamera tidak ditemukan pada perangkat Anda.";
        } else if (err?.message?.includes('not found')) {
          displayMessage = "Sistem gagal memuat area pemindaian. Silakan coba lagi.";
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
  }, [isOpen, retryCount, isShowingOwnQr]);

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
  };

  const stopScanner = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (err) {
        console.error("Error stopping scanner:", err);
      }
    }
  };

  if (!isOpen) return null;

  // Use Portal to render at the document body to ensure it's on top of everything
  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center sm:p-4 overflow-hidden">
        {/* Backdrop - Solid Dark for immersion */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-slate-950"
        />

        {/* Immersive Scanner Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full h-full sm:h-auto sm:max-w-md sm:aspect-[3/4] bg-black sm:rounded-[40px] overflow-hidden flex flex-col"
        >
          {/* Top Control Bar - Minimalist */}
          <div className="absolute top-0 left-0 right-0 p-6 flex items-center justify-between z-30 pointer-events-none">
            <div className="flex items-center gap-3 pointer-events-auto">
              <div className="w-11 h-11 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 text-white flex items-center justify-center">
                <QrCode className="w-6 h-6" />
              </div>
              <div className="hidden xs:block">
                <h3 className="text-sm font-bold text-white">Scanner</h3>
                <p className="text-[10px] text-white/50">Google Lens Mode</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-11 h-11 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 text-white hover:bg-white/20 transition-all flex items-center justify-center cursor-pointer pointer-events-auto active:scale-90"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Core Viewport */}
          <div className="flex-1 relative overflow-hidden flex items-center justify-center">
            {isShowingOwnQr ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-8 bg-slate-950 z-20">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white p-6 rounded-[2.5rem] shadow-2xl border-4 border-blue-500/20"
                >
                  <QRCodeCanvas 
                    value={getProfileUrl()} 
                    size={220}
                    level="H"
                    includeMargin={false}
                    imageSettings={{
                      src: `${window.location.origin}/favicon.ico`,
                      x: undefined,
                      y: undefined,
                      height: 40,
                      width: 40,
                      excavate: true,
                    }}
                  />
                </motion.div>
                <div className="mt-8 text-center">
                  <h4 className="text-lg font-bold text-white mb-2">QR Profil Saya</h4>
                  <p className="text-xs text-slate-400 max-w-[200px] mx-auto leading-relaxed">
                    Tunjukkan ini ke teman untuk mempermudah pencarian profil Anda
                  </p>
                </div>
              </div>
            ) : (
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
                    <h4 className="text-xl font-bold mb-3">Butuh Akses</h4>
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
                        onClick={onClose}
                        className="px-8 py-4 bg-white/5 text-white/60 font-bold rounded-2xl text-sm transition-all border border-white/10 active:scale-95 cursor-pointer"
                      >
                        Tutup
                      </button>
                    </div>
                  </div>
                ) : (
                  <div id={scannerId} className="w-full h-full [&_video]:object-cover" />
                )}

                {/* Immersive Overlay */}
                {!isInitializing && !error && (
                  <>
                    <div className="absolute inset-0 pointer-events-none z-10 border-[32px] sm:border-[48px] border-black/40">
                       {/* Center Focus Area */}
                       <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[260px] h-[260px] border-2 border-white/10 rounded-3xl">
                          {/* Corner Accents - Thicker & More Modern */}
                          <div className="absolute top-[-4px] left-[-4px] w-12 h-12 border-t-[5px] border-l-[5px] border-blue-500 rounded-tl-[1.5rem]" />
                          <div className="absolute top-[-4px] right-[-4px] w-12 h-12 border-t-[5px] border-r-[5px] border-blue-500 rounded-tr-[1.5rem]" />
                          <div className="absolute bottom-[-4px] left-[-4px] w-12 h-12 border-b-[5px] border-l-[5px] border-blue-500 rounded-bl-[1.5rem]" />
                          <div className="absolute bottom-[-4px] right-[-4px] w-12 h-12 border-b-[5px] border-r-[5px] border-blue-500 rounded-br-[1.5rem]" />
                          
                          {/* Scanning Line */}
                          <motion.div
                            animate={{ top: ['5%', '95%', '5%'] }}
                            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                            className="absolute left-4 right-4 h-[3px] bg-gradient-to-r from-transparent via-blue-400 to-transparent shadow-[0_0_20px_rgba(59,130,246,1)] z-20"
                          />
                       </div>
                    </div>

                    {/* Instruction Bottom Bar */}
                    <div className="absolute bottom-0 left-0 right-0 p-8 z-30 flex flex-col items-center gap-6 pointer-events-none">
                      <motion.div 
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-2xl p-4 flex items-center gap-3 max-w-xs shadow-2xl"
                      >
                        <div className="w-8 h-8 rounded-xl bg-blue-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/20">
                          <Info className="w-4 h-4" />
                        </div>
                        <p className="text-[11px] text-white leading-tight">
                          Arahkan kamera ke QR Code teman untuk pencarian instan
                        </p>
                      </motion.div>

                      <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                    </div>
                  </>
                )}
              </>
            )}
          </div>

          {/* Toggle Button Container */}
          <div className="absolute bottom-6 left-0 right-0 z-40 flex justify-center px-6">
            <button
              onClick={() => setIsShowingOwnQr(!isShowingOwnQr)}
              className="group flex flex-col items-center gap-2 cursor-pointer transition-all active:scale-95"
            >
              <div className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 rounded-2xl text-white transition-all">
                {isShowingOwnQr ? (
                  <>
                    <Scan className="w-4 h-4" />
                    <span className="text-xs font-bold underline underline-offset-4 decoration-white/40">Scan QR Teman</span>
                  </>
                ) : (
                  <>
                    <UserCircle className="w-4 h-4" />
                    <span className="text-xs font-bold underline underline-offset-4 decoration-white/40">Tampilkan QR Saya</span>
                  </>
                )}
              </div>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
