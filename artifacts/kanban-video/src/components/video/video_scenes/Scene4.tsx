import { motion } from 'framer-motion';
import { FileCheck2 } from 'lucide-react';
import { useEffect, useState } from 'react';

export function Scene4() {
  const [showOverlay, setShowOverlay] = useState(false);

  useEffect(() => {
    // Show overlay after the card reaches the Expedição column (around 1600ms)
    const timer = setTimeout(() => {
      setShowOverlay(true);
    }, 2200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 z-30 pointer-events-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {showOverlay && (
        <motion.div
          className="absolute bottom-24 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-success/10 border border-success/30 backdrop-blur-xl px-8 py-5 rounded-2xl shadow-2xl shadow-success/20"
          initial={{ y: 50, opacity: 0, scale: 0.9 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        >
          <div className="w-12 h-12 bg-success rounded-full flex items-center justify-center shadow-lg shadow-success/40">
            <FileCheck2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-display font-bold text-white text-xl">NF-e emitida automaticamente</h3>
            <p className="text-success/80 text-sm font-medium">Sincronizado com SEFAZ</p>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
