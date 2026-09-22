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
          className="fixed bottom-6 right-4 sm:right-6 z-40 flex items-center gap-2 px-3.5 py-3 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-2xl shadow-lg hover:shadow-xl border border-blue-500/30 transition-all cursor-pointer group focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
          title="Kembali ke Paling Atas"
          aria-label="Scroll ke atas"
        >
          <ArrowUp className="w-5 h-5 transition-transform group-hover:-translate-y-0.5" />
          <span className="text-xs font-bold hidden sm:inline pr-1">Ke Atas</span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
