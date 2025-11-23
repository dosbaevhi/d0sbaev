import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { Mic, MicOff, Radio, Activity, Volume2 } from 'lucide-react';
import { getAIClient } from '../services/geminiService';
import { createPCM16Blob, decodeAudioData, base64ToUint8Array } from '../utils/audioUtils';

const LIVE_MODEL = 'gemini-2.5-flash-native-audio-preview-09-2025';

const LiveView: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Audio Context Refs
  const inputContextRef = useRef<AudioContext | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  
  // Playback Refs
  const nextStartTimeRef = useRef<number>(0);
  const scheduledSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  
  // Session Ref
  // We store the session promise/controller to close it later
  const sessionRef = useRef<{ close: () => void } | null>(null);

  const stopSession = useCallback(() => {
    // 1. Close API Session
    if (sessionRef.current) {
      try {
        sessionRef.current.close();
      } catch (e) {
        console.error("Error closing session", e);
      }
      sessionRef.current = null;
    }

    // 2. Stop Microphone Stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    // 3. Disconnect Input Nodes
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (inputContextRef.current) {
      inputContextRef.current.close();
      inputContextRef.current = null;
    }

    // 4. Stop Output Audio
    scheduledSourcesRef.current.forEach(source => {
      try {
        source.stop();
      } catch (e) { /* ignore if already stopped */ }
    });
    scheduledSourcesRef.current.clear();

    if (outputContextRef.current) {
      outputContextRef.current.close();
      outputContextRef.current = null;
    }

    setIsActive(false);
    setStatus('disconnected');
    nextStartTimeRef.current = 0;
  }, []);

  const startSession = async () => {
    setErrorMessage(null);
    setStatus('connecting');
    
    try {
      // Initialize Audio Contexts
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      inputContextRef.current = inputCtx;
      outputContextRef.current = outputCtx;

      // Get Microphone Access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const ai = getAIClient();

      // Connect to Live API
      const sessionPromise = ai.live.connect({
        model: LIVE_MODEL,
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
          },
          systemInstruction: "You are a helpful, witty, and concise AI assistant.",
        },
        callbacks: {
          onopen: () => {
            console.log("Live session opened");
            setStatus('connected');
            setIsActive(true);

            // Setup Input Processing
            const source = inputCtx.createMediaStreamSource(stream);
            const processor = inputCtx.createScriptProcessor(4096, 1, 1);
            
            sourceRef.current = source;
            processorRef.current = processor;

            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createPCM16Blob(inputData);
              
              // Send data only when session is established
              sessionPromise.then(session => {
                  session.sendRealtimeInput({ media: pcmBlob });
              });
            };

            source.connect(processor);
            processor.connect(inputCtx.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
             const outputCtx = outputContextRef.current;
             if (!outputCtx) return;

             // Handle Audio Output
             const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
             if (base64Audio) {
               try {
                 const uint8 = base64ToUint8Array(base64Audio);
                 const audioBuffer = await decodeAudioData(uint8, outputCtx, 24000, 1);
                 
                 const source = outputCtx.createBufferSource();
                 source.buffer = audioBuffer;
                 source.connect(outputCtx.destination);
                 
                 // Schedule playback
                 const currentTime = outputCtx.currentTime;
                 if (nextStartTimeRef.current < currentTime) {
                   nextStartTimeRef.current = currentTime;
                 }
                 
                 source.start(nextStartTimeRef.current);
                 nextStartTimeRef.current += audioBuffer.duration;
                 
                 scheduledSourcesRef.current.add(source);
                 source.onended = () => {
                   scheduledSourcesRef.current.delete(source);
                 };
               } catch (err) {
                 console.error("Error decoding audio", err);
               }
             }

             // Handle Interruption
             if (message.serverContent?.interrupted) {
               console.log("Interrupted!");
               scheduledSourcesRef.current.forEach(src => {
                 try { src.stop(); } catch(e){}
               });
               scheduledSourcesRef.current.clear();
               nextStartTimeRef.current = 0;
             }
          },
          onclose: (e) => {
            console.log("Live session closed", e);
            stopSession();
          },
          onerror: (e) => {
            console.error("Live session error", e);
            setErrorMessage("Connection error occurred.");
            stopSession();
            setStatus('error');
          }
        }
      });

      // Store session to allow closing
      // Note: We can't synchronously get the session object, but we can wait for the promise if we needed to access methods immediately.
      // However, to store the 'close' capability, we wrap the result. 
      // The SDK doesn't expose a direct `abort` on the promise, but the session object has `close`.
      sessionPromise.then(session => {
        sessionRef.current = session as any; 
      }).catch(err => {
        console.error("Connection failed", err);
        setErrorMessage("Failed to connect to Gemini Live.");
        setStatus('error');
      });

    } catch (err) {
      console.error("Failed to start session:", err);
      setErrorMessage("Microphone access denied or API unavailable.");
      setStatus('error');
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopSession();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-full p-6 space-y-8 bg-zinc-900/50 rounded-2xl border border-zinc-800 backdrop-blur-sm">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
          Gemini Live
        </h2>
        <p className="text-zinc-400">Real-time, low-latency voice conversation.</p>
      </div>

      <div className="relative group">
        <div className={`absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200 ${isActive ? 'animate-pulse opacity-75' : ''}`}></div>
        <button
          onClick={isActive ? stopSession : startSession}
          disabled={status === 'connecting'}
          className={`relative w-48 h-48 rounded-full flex items-center justify-center border-4 transition-all duration-300 shadow-2xl ${
            isActive 
              ? 'border-red-500 bg-zinc-900' 
              : 'border-blue-500 bg-zinc-900 hover:scale-105'
          }`}
        >
          {status === 'connecting' ? (
             <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          ) : isActive ? (
            <div className="flex flex-col items-center gap-2">
               <MicOff className="w-16 h-16 text-red-500" />
               <span className="text-red-500 font-semibold uppercase tracking-widest text-sm">Stop</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
               <Mic className="w-16 h-16 text-blue-500" />
               <span className="text-blue-500 font-semibold uppercase tracking-widest text-sm">Start</span>
            </div>
          )}
        </button>
      </div>

      {isActive && (
        <div className="flex items-center gap-4 px-6 py-3 bg-zinc-950/80 rounded-full border border-zinc-800">
          <div className="flex gap-1 h-6 items-center">
             {[...Array(5)].map((_, i) => (
                <div key={i} className="w-1 bg-blue-500 rounded-full animate-bounce" style={{ height: `${Math.random() * 100}%`, animationDelay: `${i * 0.1}s` }}></div>
             ))}
          </div>
          <span className="text-green-400 font-mono text-sm flex items-center gap-2">
            <Radio className="w-4 h-4" /> LIVE
          </span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-red-900/20 border border-red-500/50 rounded-lg text-red-200 text-sm max-w-md text-center">
          {errorMessage}
        </div>
      )}
      
      <div className="grid grid-cols-2 gap-4 w-full max-w-md">
        <div className="p-4 bg-zinc-800/50 rounded-xl border border-zinc-700/50">
           <div className="flex items-center gap-2 mb-2 text-zinc-400 text-sm">
             <Activity className="w-4 h-4" /> Latency
           </div>
           <div className="text-xl font-mono text-white">~300ms</div>
        </div>
        <div className="p-4 bg-zinc-800/50 rounded-xl border border-zinc-700/50">
           <div className="flex items-center gap-2 mb-2 text-zinc-400 text-sm">
             <Volume2 className="w-4 h-4" /> Output
           </div>
           <div className="text-xl font-mono text-white">24kHz</div>
        </div>
      </div>

    </div>
  );
};

export default LiveView;
