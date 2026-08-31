'use client';

import { useState, useEffect, useRef } from 'react';

interface UseVoiceAssistantProps {
  onTranscriptComplete?: (finalText: string) => void;
  language?: string; // 'en-US' or 'ur-PK'
}

export function useVoiceAssistant({ onTranscriptComplete, language = 'en-US' }: UseVoiceAssistantProps = {}) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [speechSupported, setSpeechSupported] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);

  const recognitionRef = useRef<any>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const latestTranscriptRef = useRef<string>('');
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const onTranscriptCompleteRef = useRef(onTranscriptComplete);

  // Keep callback reference updated
  useEffect(() => {
    onTranscriptCompleteRef.current = onTranscriptComplete;
  }, [onTranscriptComplete]);

  // Initialize Speech Recognition when language changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        setSpeechSupported(true);
        const rec = new SpeechRecognition();
        rec.continuous = true; // Continuous listening so pauses don't cut off mid-sentence
        rec.interimResults = true; // Show interim text in real-time
        rec.lang = language;

        rec.onstart = () => {
          setIsListening(true);
          setTranscript('');
          latestTranscriptRef.current = '';
        };

        rec.onresult = (event: any) => {
          let currentText = '';
          for (let i = 0; i < event.results.length; i++) {
            currentText += event.results[i][0].transcript;
          }
          setTranscript(currentText);
          latestTranscriptRef.current = currentText;

          // Clear existing silence timer and reset for 3.5s of total silence
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
          }
          
          silenceTimerRef.current = setTimeout(() => {
            // Auto finish after 3.5s of absolute silence
            if (rec && isListening) {
              try {
                rec.stop();
              } catch (e) {
                // Ignore if already stopped
              }
            }
          }, 3500);
        };

        rec.onerror = (event: any) => {
          if (event.error !== 'no-speech') {
            console.error('Speech recognition error:', event.error);
          }
        };

        rec.onend = () => {
          setIsListening(false);
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }
          
          // Submit final full transcript on completion, then reset ref so it won't fire twice
          const finalText = latestTranscriptRef.current.trim();
          if (onTranscriptCompleteRef.current && finalText) {
            const textToSubmit = finalText;
            latestTranscriptRef.current = ''; // Clear to prevent duplicate evaluation requests
            onTranscriptCompleteRef.current(textToSubmit);
          }
        };

        recognitionRef.current = rec;
      }
    }

    return () => {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
    };
  }, [language]);

  const startListening = () => {
    if (isSpeaking) {
      stopSpeaking();
    }
    if (recognitionRef.current) {
      try {
        setTranscript('');
        latestTranscriptRef.current = '';
        recognitionRef.current.start();
      } catch (err) {
        console.error('Failed to start speech recognition:', err);
      }
    }
  };

  const stopListening = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        // Ignore if already stopped
      }
    }
  };

  const speakText = (text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis || !ttsEnabled) {
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    if (!text.trim()) return;

    // Small delay (60ms) to allow browser audio engine to reset after cancel()
    setTimeout(() => {
      if (typeof window === 'undefined' || !window.speechSynthesis) return;

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language;
      utterance.rate = 0.95; // Unhurried, natural human cadence
      utterance.pitch = 1.0;

      const voices = window.speechSynthesis.getVoices();
      const langPrefix = language.split('-')[0].toLowerCase();

      // Advanced Voice Selection: prioritize Natural, Online, Neural, and clear female/male accents
      let selectedVoice = voices.find((v) => {
        const name = v.name.toLowerCase();
        const lang = v.lang.toLowerCase();
        return lang.startsWith(langPrefix) && (name.includes('natural') || name.includes('online') || name.includes('neural'));
      });

      if (!selectedVoice) {
        selectedVoice = voices.find((v) => {
          const name = v.name.toLowerCase();
          const lang = v.lang.toLowerCase();
          return lang.startsWith(langPrefix) && (name.includes('google') || name.includes('premium') || name.includes('samantha') || name.includes('aria') || name.includes('jenny'));
        });
      }

      if (!selectedVoice) {
        selectedVoice = voices.find((v) => v.lang.toLowerCase().startsWith(langPrefix));
      }

      // Fallback for Urdu if offline Urdu voice is missing on OS (use Hindi for near-identical phonetic accuracy)
      if (!selectedVoice && langPrefix === 'ur') {
        selectedVoice = voices.find((v) => {
          const lang = v.lang.toLowerCase();
          const name = v.name.toLowerCase();
          return (lang.startsWith('hi') || name.includes('hindi')) && (name.includes('natural') || name.includes('google'));
        }) || voices.find((v) => v.lang.toLowerCase().startsWith('hi'));
      }

      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }

      utterance.onstart = () => {
        setIsSpeaking(true);
      };

      utterance.onend = () => {
        setIsSpeaking(false);
      };

      utterance.onerror = (err: any) => {
        // Filter out normal cancellation interrupts
        if (err.error !== 'interrupted' && err.error !== 'canceled') {
          console.warn('Speech synthesis notice:', err.error || err);
        }
        setIsSpeaking(false);
      };

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    }, 60);
  };

  const stopSpeaking = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  // Pre-load voices list
  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      const handleVoicesChanged = () => {
        window.speechSynthesis.getVoices();
      };
      window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged);
      // Load once initially
      window.speechSynthesis.getVoices();
      return () => {
        window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
      };
    }
  }, []);

  return {
    isListening,
    isSpeaking,
    transcript,
    setTranscript,
    speechSupported,
    startListening,
    stopListening,
    speakText,
    stopSpeaking,
    ttsEnabled,
    setTtsEnabled,
  };
}
