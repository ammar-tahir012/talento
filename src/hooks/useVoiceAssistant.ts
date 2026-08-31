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

  // Initialize Speech Recognition when language or transcript dependencies change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        setSpeechSupported(true);
        const rec = new SpeechRecognition();
        rec.continuous = false; // Single utterance
        rec.interimResults = true; // Show interim text
        rec.lang = language;

        rec.onstart = () => {
          setIsListening(true);
          setTranscript('');
        };

        rec.onresult = (event: any) => {
          let currentTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript;
          }
          setTranscript(currentTranscript);
        };

        rec.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
        };

        rec.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = rec;
      }
    }
  }, [language]);

  // Handle final transcript callback on recognition completion
  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.onend = () => {
        setIsListening(false);
        if (onTranscriptComplete && transcript.trim()) {
          onTranscriptComplete(transcript);
        }
      };
    }
  }, [transcript, onTranscriptComplete]);

  const startListening = () => {
    if (isSpeaking) {
      stopSpeaking();
    }
    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error('Failed to start speech recognition:', err);
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  };

  const speakText = (text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis || !ttsEnabled) {
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    if (!text.trim()) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language;
    
    // Choose a voice matching our language
    const voices = window.speechSynthesis.getVoices();
    
    // Attempt to locate a voice matching the language code (e.g. 'ur' or 'en')
    const langPrefix = language.split('-')[0].toLowerCase();
    const preferredVoice = voices.find(
      (v) =>
        v.lang.toLowerCase().startsWith(langPrefix) &&
        (v.name.includes('Natural') || v.localService)
    ) || voices.find((v) => v.lang.toLowerCase().startsWith(langPrefix));
    
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onstart = () => {
      setIsSpeaking(true);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
    };

    utterance.onerror = (err) => {
      console.error('Speech synthesis error:', err);
      setIsSpeaking(false);
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
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
