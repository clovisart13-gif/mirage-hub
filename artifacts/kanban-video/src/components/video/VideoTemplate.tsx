import { useVideoPlayer } from '@/lib/video';
import { AnimatePresence, motion } from 'framer-motion';

import { Scene1 } from './video_scenes/Scene1';
import { KanbanBoard } from './video_scenes/KanbanBoard';
import { Scene4 } from './video_scenes/Scene4';
import { Scene5 } from './video_scenes/Scene5';

const SCENE_DURATIONS = {
  scene1: 4000,
  scene2: 8000,
  scene3: 8000,
  scene4: 6000,
  scene5: 4000,
};

export default function VideoTemplate() {
  const { currentScene } = useVideoPlayer({
    durations: SCENE_DURATIONS,
  });

  return (
    <div
      className="w-[100vw] h-[100vh] overflow-hidden relative bg-bg-dark flex items-center justify-center text-text-primary"
    >
      {/* Background layer */}
      <div className="absolute inset-0 bg-grid-pattern opacity-30 z-0 pointer-events-none" />
      
      {/* Persistent gradient effects */}
      <motion.div
        className="absolute w-[80vw] h-[80vw] rounded-full blur-[120px] opacity-20 z-0 pointer-events-none"
        animate={{
          background: 
            currentScene === 0 ? 'radial-gradient(circle, var(--color-primary) 0%, transparent 70%)' :
            currentScene === 4 ? 'radial-gradient(circle, var(--color-accent) 0%, transparent 70%)' :
            'radial-gradient(circle, var(--color-primary) 0%, transparent 70%)',
          scale: currentScene === 0 ? 1 : currentScene === 4 ? 1.5 : 1.2,
          x: currentScene === 0 ? 0 : currentScene === 4 ? 0 : '-10vw',
          y: currentScene === 0 ? '10vh' : currentScene === 4 ? 0 : '10vh',
        }}
        transition={{ duration: 2, ease: [0.16, 1, 0.3, 1] }}
      />
      
      {/* Persistent Kanban Board for Scenes 1, 2, 3 (indices 1, 2, 3) */}
      <KanbanBoard currentScene={currentScene} />
      
      <div className="relative z-20 w-full h-full pointer-events-none">
        <AnimatePresence mode="popLayout">
          {currentScene === 0 && <Scene1 key="scene1" />}
          {currentScene === 3 && <Scene4 key="scene4" />}
          {currentScene === 4 && <Scene5 key="scene5" />}
        </AnimatePresence>
      </div>
    </div>
  );
}
