import { useState, useEffect } from 'react';
import { AlertCircle, X, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Mahasiswa } from '../types';

interface TierWarningBannerProps {
  currentUser?: Mahasiswa | null;
  onOpenPricing: () => void;
}

export function TierWarningBanner({ currentUser, onOpenPricing }: TierWarningBannerProps) {
  const [isVisible, setIsVisible] = useState(true);

  // Reset visibility whenever a user logs in or tier status changes
  useEffect(() => {
    if (currentUser?.nim) {
      setIsVisible(true);
    }
  }, [currentUser?.nim, currentUser?.tier]);

  const handleDismiss = () => {
    setIsVisible(false);
  };

  const currentTier = currentUser?.tier || 'free';

  // Only display if user is logged in, not dismissed, and not in Tier Pro
  if (!currentUser || !isVisible || currentTier === 'pro') return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.aside
          key={`tier-banner-${currentUser.nim}-${currentTier}`}
          initial={{ opacity: 0, y: -8, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: -8, height: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          aria-label="Informasi Status Tier Akun"
          className="w-full bg-amber-50/95 border-b border-amber-200/90 text-amber-950 text-xs shadow-2xs relative z-30 overflow-hidden"
        >
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3">
            {/* Content Left & Center */}
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="w-6 h-6 rounded-lg bg-amber-200/70 border border-amber-300/80 text-amber-800 flex items-center justify-center shrink-0">
                <AlertCircle className="w-3.5 h-3.5 text-amber-800" />
              </div>

              <div className="min-w-0 text-xs leading-snug flex-1">
                {currentTier === 'free' && (
                  <p className="text-amber-900">
                    <span className="font-bold text-amber-950">Status: Tier Free</span> - Upgrade ke{' '}
                    <span className="font-semibold">Tier Basic</span> atau{' '}
                    <span className="font-semibold">Pro</span> untuk membuka akses Google Drive, Upload Foto, dan sinkronisasi cepat.{' '}
                    <button
                      type="button"
                      onClick={onOpenPricing}
                      className="font-bold text-amber-950 underline underline-offset-2 hover:text-amber-800 transition-colors inline-flex items-center gap-0.5 cursor-pointer ml-1"
                    >
                      Lihat Tier Saya
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </p>
                )}

                {currentTier === 'basic' && (
                  <p className="text-amber-900">
                    <span className="font-bold text-amber-950">Status: Tier Basic</span> - Upgrade ke{' '}
                    <span className="font-semibold">Tier Pro</span> untuk menikmati Upload foto tanpa batas &amp; Generate File Biodata!{' '}
                    <button
                      type="button"
                      onClick={onOpenPricing}
                      className="font-bold text-amber-950 underline underline-offset-2 hover:text-amber-800 transition-colors inline-flex items-center gap-0.5 cursor-pointer ml-1"
                    >
                      Lihat Tier Saya
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </p>
                )}
              </div>
            </div>

            {/* Close / Dismiss Button */}
            <button
              id="btn-close-tier-banner"
              type="button"
              onClick={handleDismiss}
              className="p-1.5 text-amber-700/70 hover:text-amber-950 hover:bg-amber-200/50 rounded-lg transition-all shrink-0 cursor-pointer"
              title="Tutup pemberitahuan"
              aria-label="Tutup pemberitahuan"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
