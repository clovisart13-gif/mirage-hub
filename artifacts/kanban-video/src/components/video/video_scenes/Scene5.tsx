import { motion } from 'framer-motion';
import { Layers } from 'lucide-react';

export function Scene5() {
  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-40 bg-bg-dark"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Abstract background elements */}
      <motion.div
        className="absolute w-[100vw] h-[100vh] bg-[radial-gradient(ellipse_at_center,_var(--color-primary)_0%,_transparent_70%)] opacity-10"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1.2, opacity: 0.1 }}
        transition={{ duration: 3, ease: 'easeOut' }}
      />
      
      <div className="flex flex-col items-center text-center relative z-10">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <Layers className="w-10 h-10 text-primary mb-6" />
        </motion.div>
        
        <div className="overflow-hidden mb-6">
          <motion.h2
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            transition={{ duration: 0.8, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="text-5xl md:text-6xl font-display font-bold text-white tracking-tight"
          >
            Do pedido à NF-e,
            <br />
            <span className="text-primary">sem sair do Hub</span>
          </motion.h2>
        </div>
        
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.2, ease: [0.16, 1, 0.3, 1] }}
          className="mt-8 px-6 py-3 rounded-full border border-border bg-bg-panel/50 backdrop-blur-md"
        >
          <span className="font-mono text-text-secondary tracking-widest text-sm">mirage.com.br</span>
        </motion.div>
      </div>
    </motion.div>
  );
}
