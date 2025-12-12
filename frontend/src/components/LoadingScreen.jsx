import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GraduationCap, TrendingUp, BookOpen, Award, CheckCircle2 } from 'lucide-react';

const steps = [
  'Autenticando credenciales...',
  'Conectando con base de datos académica...',
  'Verificando matrículas nuevas...',
  'Calculando comisiones del periodo...',
  'Generando reporte financiero...',
  'Finalizando...'
];

function LoadingScreen ({ onComplete, isReady = false }) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        const target = isReady ? 100 : 95;
        if (prev >= target) {
          return prev;
        }
        const increment = Math.random() * 2.5;
        return Math.min(prev + increment, target);
      });
    }, 50);

    return () => clearInterval(timer);
  }, [isReady]);

  useEffect(() => {
    if (progress < 20) setCurrentStepIndex(0);
    else if (progress < 40) setCurrentStepIndex(1);
    else if (progress < 60) setCurrentStepIndex(2);
    else if (progress < 80) setCurrentStepIndex(3);
    else if (progress < 95) setCurrentStepIndex(4);
    else setCurrentStepIndex(5);

    let timeout;
    if (progress === 100) {
      timeout = setTimeout(onComplete, 800);
    }

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [progress, onComplete]);

  useEffect(() => {
    if (isReady) {
      setProgress((prev) => (prev < 95 ? 95 : prev));
    }
  }, [isReady]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-900 text-white overflow-hidden"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, y: -50, transition: { duration: 0.8, ease: 'easeInOut' } }}
    >
      <div className="absolute inset-0 overflow-hidden opacity-10 pointer-events-none">
        <motion.div
          className="absolute -top-20 -left-20 h-96 w-96 rounded-full bg-blue-600 blur-3xl"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 4, repeat: Infinity }}
        />
        <motion.div
          className="absolute top-1/2 -right-20 h-80 w-80 rounded-full bg-yellow-600 blur-3xl"
          animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 5, repeat: Infinity, delay: 1 }}
        />
      </div>

      <div className="relative z-10 flex w-full max-w-md flex-col items-center px-6">
        <div className="relative mb-12 flex h-32 w-32 items-center justify-center">
          <motion.div
            className="absolute inset-0 rounded-full border-4 border-slate-700"
            style={{ borderTopColor: '#fbbf24', borderRightColor: 'transparent', borderBottomColor: 'transparent', borderLeftColor: 'transparent' }}
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          />
          <motion.div
            className="absolute inset-2 rounded-full border-2 border-dashed border-slate-800"
            style={{ borderTopColor: '#3b82f6' }}
            animate={{ rotate: -360 }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          />
          <div className="relative">
            <AnimatePresence mode="wait">
              {progress < 50 ? (
                <motion.div
                  key="academic"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className="text-blue-400"
                >
                  <GraduationCap size={48} />
                </motion.div>
              ) : (
                <motion.div
                  key="financial"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className="text-yellow-400"
                >
                  <TrendingUp size={48} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <motion.h1
          className="mb-2 text-center text-2xl font-bold tracking-tight"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          Portal de Asesores
        </motion.h1>
        <motion.p
          className="mb-8 text-sm font-medium text-slate-400"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          UNIVERSIDAD AUTÓNOMA
        </motion.p>

        <div className="mb-4 flex h-8 w-full items-center justify-center overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={steps[currentStepIndex]}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="flex items-center gap-2 text-sm font-medium text-blue-200"
            >
              {progress < 100 && <div className="h-2 w-2 animate-pulse rounded-full bg-blue-400" />}
              {progress === 100 && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
              {steps[currentStepIndex]}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-600 via-blue-400 to-yellow-400"
            initial={{ width: '0%' }}
            animate={{ width: `${progress}%` }}
            transition={{ ease: 'easeOut' }}
          />
        </div>

        <div className="mt-2 flex w-full justify-end">
          <span className="text-xs font-mono text-slate-500">{Math.round(progress)}%</span>
        </div>

        <FloatingIcon icon={BookOpen} delay={0} x={-120} y={-50} color="text-slate-700" />
        <FloatingIcon icon={Award} delay={1.5} x={120} y={40} color="text-slate-700" />
        <FloatingIcon icon={TrendingUp} delay={0.8} x={-100} y={80} color="text-slate-800" />
      </div>
    </motion.div>
  );
}

function FloatingIcon ({ icon: Icon, delay, x, y, color }) {
  return (
    <motion.div
      className={`absolute ${color} opacity-20`}
      initial={{ x, y, opacity: 0 }}
      animate={{ y: [y, y - 10, y], opacity: 0.2 }}
      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay }}
    >
      <Icon size={32} />
    </motion.div>
  );
}

export default LoadingScreen;
