import { motion } from 'framer-motion';
import { Layers } from 'lucide-react';

export function Scene1() {
  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="flex flex-col items-center text-center">
        {/* Logo Icon */}
        <motion.div
          initial={{ scale: 0, rotate: -45 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.2 }}
          className="mb-6 w-24 h-24 bg-primary/20 rounded-2xl flex items-center justify-center border border-primary/40 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-primary/10 backdrop-blur-xl" />
          <Layers className="w-12 h-12 text-primary relative z-10" />
        </motion.div>
        
        {/* Title */}
        <div className="overflow-hidden mb-2">
          <motion.h1 
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.4 }}
            className="text-6xl font-display font-bold text-text-primary tracking-tight"
          >
            Mirage Hub
          </motion.h1>
        </div>
        
        {/* Subtitle */}
        <div className="overflow-hidden mb-8">
          <motion.h2
            initial={{ y: '-100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.5 }}
            className="text-3xl font-body font-medium text-text-secondary"
          >
            Kanban de Produção
          </motion.h2>
        </div>
        
        {/* Accent line */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.8 }}
          className="h-1 w-32 bg-accent rounded-full origin-left"
        />
      </div>
    </motion.div>
  );
}
