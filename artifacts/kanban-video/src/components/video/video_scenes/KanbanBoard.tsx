import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Clock, Factory, Scissors, MoveRight, ScissorsLineDashed, PackageCheck, Truck } from 'lucide-react';

const COLUMNS = [
  { id: 'inicio', title: 'Início', icon: Clock },
  { id: 'modelagem', title: 'Modelagem', icon: ScissorsLineDashed },
  { id: 'corte', title: 'Corte', icon: Scissors },
  { id: 'costura', title: 'Costura', icon: Factory },
  { id: 'acabamento', title: 'Acabamento', icon: MoveRight },
  { id: 'expedicao', title: 'Expedição', icon: Truck },
];

export function KanbanBoard({ currentScene }: { currentScene: number }) {
  // Whether kanban should be visible
  const isVisible = currentScene >= 1 && currentScene <= 3;
  const isExit = currentScene >= 4;
  
  // Internal state for the dragging card
  const [cardColIndex, setCardColIndex] = useState(0);
  const [showProgress, setShowProgress] = useState(false);
  const [progressWidth, setProgressWidth] = useState(0);
  
  useEffect(() => {
    // Reset state when restarting video
    if (currentScene === 0) {
      setCardColIndex(0);
      setShowProgress(false);
      setProgressWidth(0);
    }
    
    // Scene 2 (index 2): Drag from Início to Modelagem then Corte
    if (currentScene === 2) {
      setShowProgress(true);
      
      const timer1 = setTimeout(() => {
        setCardColIndex(1); // Modelagem
        setProgressWidth(33);
      }, 1000);
      
      const timer2 = setTimeout(() => {
        setCardColIndex(2); // Corte
        setProgressWidth(66);
      }, 4500);
      
      return () => { clearTimeout(timer1); clearTimeout(timer2); };
    }
    
    // Scene 3 (index 3): Fast forward to Expedição
    if (currentScene === 3) {
      const timer1 = setTimeout(() => {
        setCardColIndex(3); // Costura
        setProgressWidth(75);
      }, 300);
      
      const timer2 = setTimeout(() => {
        setCardColIndex(4); // Acabamento
        setProgressWidth(85);
      }, 900);
      
      const timer3 = setTimeout(() => {
        setCardColIndex(5); // Expedição
        setProgressWidth(100);
      }, 1600);
      
      return () => { clearTimeout(timer1); clearTimeout(timer2); clearTimeout(timer3); };
    }
  }, [currentScene]);

  return (
    <motion.div
      className="absolute inset-0 z-10 flex items-center justify-center p-8 lg:p-12 pointer-events-none"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ 
        opacity: isVisible ? 1 : 0,
        scale: isVisible ? 1 : (isExit ? 1.1 : 0.9),
        filter: isVisible ? 'blur(0px)' : 'blur(10px)'
      }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="w-full max-w-[1400px] h-[75vh] flex flex-col bg-bg-panel/40 backdrop-blur-xl border border-border rounded-3xl overflow-hidden shadow-2xl">
        {/* Kanban Header */}
        <div className="h-16 border-b border-border flex items-center px-6 justify-between bg-bg-panel/80">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <div className="w-3 h-3 rounded-full bg-green-500" />
          </div>
          <div className="font-display font-semibold text-text-secondary text-sm tracking-wide uppercase">
            Visão de Produção
          </div>
          <div className="w-24"></div>
        </div>
        
        {/* Kanban Columns */}
        <div className="flex-1 p-6 flex gap-4 overflow-hidden relative">
          {COLUMNS.map((col, idx) => {
            const Icon = col.icon;
            return (
              <motion.div 
                key={col.id}
                className="flex-1 flex flex-col bg-bg-column/50 border border-border/50 rounded-2xl overflow-hidden relative"
                initial={{ opacity: 0, y: 20 }}
                animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                transition={{ duration: 0.5, delay: currentScene === 1 ? 0.3 + (idx * 0.1) : 0 }}
              >
                {/* Column Header */}
                <div className="p-4 border-b border-border/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-primary" />
                    <span className="font-medium text-sm text-text-primary">{col.title}</span>
                  </div>
                  <span className="text-xs text-text-secondary font-mono bg-bg-dark px-2 py-0.5 rounded-full">
                    {idx === 0 ? '4' : idx === 2 ? '2' : '0'}
                  </span>
                </div>
                
                {/* Drop Zone Placeholder */}
                <div className="flex-1 p-3 relative">
                  {/* Decorative background cards (fake tasks to populate board) */}
                  {idx === 0 && currentScene >= 1 && (
                    <div className="absolute top-3 left-3 right-3 opacity-30">
                      <div className="bg-bg-card border border-border rounded-xl p-4 h-24 mb-3"></div>
                      <div className="bg-bg-card border border-border rounded-xl p-4 h-24 mt-[160px]"></div>
                    </div>
                  )}
                  {idx === 2 && currentScene >= 1 && (
                    <div className="absolute top-3 left-3 right-3 opacity-30">
                      <div className="bg-bg-card border border-border rounded-xl p-4 h-24 mt-4"></div>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
          
          {/* THE HERO CARD */}
          <motion.div
            className="absolute top-20 left-[calc(1.5rem+8px)] w-[calc((100%-6rem)/6-8px)] bg-bg-card border border-primary/40 rounded-xl p-4 shadow-xl z-20 flex flex-col"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={isVisible ? { 
              opacity: 1, 
              scale: currentScene === 2 && cardColIndex > 0 ? 1.05 : 1, // slight scale when dragging
              x: `calc(${cardColIndex} * 100% + ${cardColIndex * 16}px)`,
              y: 0,
              boxShadow: currentScene === 2 && cardColIndex > 0 ? '0 25px 50px -12px rgba(22, 163, 74, 0.25)' : '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
              borderColor: currentScene === 3 ? 'var(--color-success)' : 'rgba(74, 222, 128, 0.4)'
            } : { opacity: 0, scale: 0.8 }}
            transition={{ 
              opacity: { duration: 0.4, delay: currentScene === 1 ? 1.2 : 0 },
              scale: { duration: 0.4 },
              x: { type: 'spring', stiffness: 80, damping: 15 },
              boxShadow: { duration: 0.4 }
            }}
          >
            <div className="flex justify-between items-start mb-3">
              <span className="text-xs font-mono font-bold text-accent bg-accent/10 px-2 py-1 rounded">OP #1042</span>
              {currentScene === 3 ? (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                >
                  <PackageCheck className="w-5 h-5 text-success" />
                </motion.div>
              ) : (
                <div className="w-6 h-6 rounded-full bg-border flex items-center justify-center">
                  <div className="w-4 h-4 rounded-full border-2 border-text-secondary border-t-accent animate-spin" />
                </div>
              )}
            </div>
            
            <h3 className="font-display font-semibold text-sm mb-1 line-clamp-2 leading-tight">
              Camiseta Básica Algodão
            </h3>
            
            <div className="text-xs text-text-secondary mb-4 flex gap-2">
              <span>500 un</span>
              <span>•</span>
              <span className="text-primary font-medium">R$ 4.200</span>
            </div>
            
            {/* Progress bar inside card */}
            <div className="mt-auto pt-3 border-t border-border/50">
              <div className="flex justify-between text-[10px] text-text-secondary mb-1">
                <span>Progresso</span>
                <span className="text-text-primary font-medium">
                  {Math.round(progressWidth)}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-bg-dark rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-accent"
                  initial={{ width: 0 }}
                  animate={{ width: `${progressWidth}%` }}
                  transition={{ type: 'spring', stiffness: 50, damping: 15 }}
                />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
