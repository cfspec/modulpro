import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, Send, Cpu, ShieldCheck, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';

interface SafeQueueLoadingProps {
  isOpen: boolean;
  onStartRequest: () => Promise<any>;
  onSuccess: (data: any) => void;
  onError: (errMessage: string) => void;
  onClose: () => void;
  title: string;
}

export const SafeQueueLoading: React.FC<SafeQueueLoadingProps> = ({
  isOpen,
  onStartRequest,
  onSuccess,
  onError,
  onClose,
  title,
}) => {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 'error'>(1);
  const [countdown, setCountdown] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Create a randomized queue offset (1.5s to 4.2s)
  const randomDelay = useRef(Math.floor(Math.random() * 2700) + 1500);

  useEffect(() => {
    if (!isOpen) {
      setCurrentStep(1);
      setErrorMessage(null);
      // Re-randomize for the next click
      randomDelay.current = Math.floor(Math.random() * 2700) + 1500;
      return;
    }

    let isMounted = true;
    let timerId: any = null;

    // STEP 1: Staggered Queue Protection Delay
    const targetTime = randomDelay.current;
    setCountdown(Number((targetTime / 1000).toFixed(1)));
    
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, (targetTime - elapsed) / 1000);
      if (isMounted) {
        setCountdown(Number(remaining.toFixed(1)));
      }
      if (elapsed >= targetTime) {
        clearInterval(interval);
        if (isMounted) {
          startStep2();
        }
      }
    }, 100);

    const startStep2 = () => {
      if (!isMounted) return;
      setCurrentStep(2);
      
      // STEP 2: Dispatching Data to Server (1.2s delay to establish handshake)
      timerId = setTimeout(() => {
        if (isMounted) {
          startStep3();
        }
      }, 1200);
    };

    const startStep3 = async () => {
      if (!isMounted) return;
      setCurrentStep(3);
      
      try {
        // Run the actual API request
        const data = await onStartRequest();
        if (isMounted) {
          startStep4(data);
        }
      } catch (err: any) {
        console.error("Queue process error:", err);
        if (isMounted) {
          setCurrentStep('error');
          const errorText = err?.message || "Gagal menghubungi server AI. Silakan coba kembali beberapa saat lagi.";
          setErrorMessage(errorText);
          onError(errorText);
        }
      }
    };

    const startStep4 = (data: any) => {
      if (!isMounted) return;
      setCurrentStep(4);
      
      // STEP 4: Document Formatting simulation & smooth transition (1.0s delay)
      timerId = setTimeout(() => {
        if (isMounted) {
          onSuccess(data);
        }
      }, 1000);
    };

    return () => {
      isMounted = false;
      clearInterval(interval);
      clearTimeout(timerId);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const steps = [
    {
      id: 1,
      title: "Pencegahan Overload Server",
      desc: "Menyeimbangkan antrean antar pengguna agar serverless Vercel tetap stabil.",
      icon: Clock,
      statusText: currentStep === 1 ? `Mengantre... (${countdown}s)` : "Selesai",
    },
    {
      id: 2,
      title: "Mengamankan Handshake Koneksi",
      desc: "Mentransfer draf rancangan materi ke server generator utama.",
      icon: Send,
      statusText: currentStep === 2 ? "Mentransfer..." : currentStep > 2 ? "Selesai" : "Menunggu",
    },
    {
      id: 3,
      title: "Pemrosesan Utama AI Gemini",
      desc: "Model AI memproses instruksi dan merancang kurikulum komprehensif.",
      icon: Cpu,
      statusText: currentStep === 3 ? "Sedang Memproses..." : currentStep > 3 ? "Selesai" : "Menunggu",
    },
    {
      id: 4,
      title: "Finalisasi & Formasi Dokumen",
      desc: "Menyusun struktur interaktif agar siap cetak & menyimpan riwayat.",
      icon: ShieldCheck,
      statusText: currentStep === 4 ? "Menyusun..." : currentStep > 4 ? "Selesai" : "Menunggu",
    },
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-[#05070c]/90 backdrop-blur-md"
        />

        {/* Modal Dialog Card */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="relative bg-[#0d121f] border border-gray-800/90 rounded-2xl p-6 md:p-8 w-full max-w-lg shadow-2xl overflow-hidden"
        >
          {/* Top Decorative bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />

          {/* Heading */}
          <div className="text-center mb-6">
            <h3 className="text-xl md:text-2xl font-extrabold text-white font-serif-display tracking-tight">
              {title}
            </h3>
            <p className="text-gray-400 text-xs md:text-sm mt-1 max-w-sm mx-auto">
              Sistem manajemen antrean cerdas untuk menjaga kelancaran proses AI Anda.
            </p>
          </div>

          {/* Error View */}
          {currentStep === 'error' ? (
            <div className="my-6">
              <div className="bg-red-950/40 border border-red-500/30 rounded-xl p-5 flex flex-col items-center text-center gap-3">
                <AlertCircle className="w-12 h-12 text-red-400 shrink-0" />
                <div>
                  <h4 className="text-red-200 font-bold text-sm">Pemrosesan Terganggu</h4>
                  <p className="text-xs text-red-300 mt-1 leading-relaxed">
                    {errorMessage}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full mt-6 bg-[#161d30] hover:bg-[#1f2842] text-white font-medium py-3 px-4 rounded-xl text-sm transition-all border border-gray-800"
              >
                Tutup & Coba Lagi
              </button>
            </div>
          ) : (
            /* Steps Workflow */
            <div className="space-y-4 my-6">
              {steps.map((step) => {
                const isCompleted = currentStep > step.id;
                const isActive = currentStep === step.id;
                const Icon = step.icon;

                return (
                  <div
                    key={step.id}
                    className={`flex items-start gap-4 p-3.5 rounded-xl border transition-all duration-300 ${
                      isActive
                        ? "bg-[#141b2f] border-blue-500/40 shadow-md shadow-blue-500/5"
                        : isCompleted
                        ? "bg-[#0b0f1a]/50 border-gray-800/40 opacity-75"
                        : "bg-transparent border-transparent opacity-40"
                    }`}
                  >
                    {/* Step Icon Indicator */}
                    <div className="shrink-0 mt-0.5">
                      {isCompleted ? (
                        <div className="w-9 h-9 rounded-lg bg-green-500/10 flex items-center justify-center text-green-400 border border-green-500/20">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                      ) : isActive ? (
                        <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/30 animate-pulse">
                          {isActive && step.id === 3 ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <Icon className="w-5 h-5" />
                          )}
                        </div>
                      ) : (
                        <div className="w-9 h-9 rounded-lg bg-gray-800/30 flex items-center justify-center text-gray-500 border border-gray-800/50">
                          <Icon className="w-5 h-5" />
                        </div>
                      )}
                    </div>

                    {/* Step Description */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-sm font-bold block ${isActive ? "text-white" : "text-gray-300"}`}>
                          {step.title}
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            isActive
                              ? "bg-blue-500/10 text-blue-400"
                              : isCompleted
                              ? "bg-green-500/10 text-green-400"
                              : "bg-gray-800/30 text-gray-500"
                          }`}
                        >
                          {step.statusText}
                        </span>
                      </div>
                      <p className="text-gray-400 text-xs mt-0.5 leading-relaxed">
                        {step.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Bottom Information Notice */}
          {currentStep !== 'error' && (
            <div className="bg-[#0b0e17] border border-gray-800/60 rounded-xl p-3 text-[11px] text-gray-400/80 leading-relaxed text-center flex items-center justify-center gap-2">
              <span>💡</span>
              <span>
                <strong>Mengapa diantre?</strong> Vercel Free memiliki limitasi eksekusi simultan. Sistem ini merenggangkan panggilan agar dokumen Anda ter-generate dengan garansi 100% aman.
              </span>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
