import { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function ScrollToTopButton() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY || document.documentElement.scrollTop || 0;
      setIsVisible(currentScrollY > 250);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    // Check initial scroll
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          id="btn-scroll-to-top"
          type="button"
          onClick={scrollToTop}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.15 }}
          className="fixed bottom-4 right-3 sm:bottom-6 sm:right-6 z-40 flex items-center justify-center gap-1.5 p-2.5 sm:px-3.5 sm:py-3 bg-blue-600/90 hover:bg-blue-700 active:scale-95 text-white rounded-xl sm:rounded-2xl shadow-md sm:shadow-lg border border-blue-500/30 transition-all cursor-pointer group focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 backdrop-blur-xs"
          title="Kembali ke Paling Atas"
          aria-label="Scroll ke atas"
        >
          <ArrowUp className="w-4 h-4 sm:w-5 sm:h-5 transition-transform group-hover:-translate-y-0.5" />
          <span className="text-xs font-bold hidden sm:inline pr-1">Ke Atas</span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
