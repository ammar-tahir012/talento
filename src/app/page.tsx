'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Infinity,
  ChevronDown, 
  Menu, 
  X,
  Upload, 
  Trash2, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  FileText, 
  Sparkles, 
  Square, 
  Check, 
  CheckCircle2, 
  AlertTriangle, 
  ChevronRight, 
  Award, 
  Info,
  HelpCircle,
  ArrowRight,
  Sparkle
} from 'lucide-react';
import { usePdfParser, ResumeItem } from '@/hooks/usePdfParser';
import { useVoiceAssistant } from '@/hooks/useVoiceAssistant';

const BG_VIDEO = 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260511_230229_7c9bc431-46cf-489a-948d-e8144d8eb5d4.mp4';

type Candidate = {
  id: string;
  name: string;
  rank: number;
  atsScore: number;
  yearsOfExperience: number;
  pros: string[];
  cons: string[];
  topSkills: string[];
  summary: string;
};

export default function Home() {
  // Navigation states
  const [activeTab, setActiveTab] = useState<'home' | 'dashboard'>('home');
  const [menuOpen, setMenuOpen] = useState(false);
  const [instructionsOpen, setInstructionsOpen] = useState(false);
  
  // Recruiter settings states
  const [jobDescription, setJobDescription] = useState(
    'We are looking for a Senior Frontend Developer with 5+ years of experience. Required skills: React, TypeScript, Tailwind CSS, Next.js, and AWS cloud deployment. Leadership or mentoring experience is a plus.'
  );
  const [language, setLanguage] = useState<'en-US' | 'ur-PK'>('en-US');
  
  // Data states
  const [uploadedFiles, setUploadedFiles] = useState<{ file: File; id: string; status: 'pending' | 'parsing' | 'done' | 'error'; text?: string }[]>([]);
  const [parsedResumes, setParsedResumes] = useState<ResumeItem[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [summaryResponse, setSummaryResponse] = useState<string>('');
  
  // UI control states
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [dragActive, setDragActive] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // PDF Extraction hook
  const { parsePdf, isParsing, progress: pdfProgress } = usePdfParser();
  
  // Voice complete trigger
  const handleVoiceCommandComplete = (voiceText: string) => {
    // Slide in the dashboard if it was closed
    setActiveTab('dashboard');
    if (parsedResumes.length > 0) {
      triggerEvaluation(voiceText);
    }
  };

  // Voice assistant hook
  const {
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
  } = useVoiceAssistant({
    onTranscriptComplete: handleVoiceCommandComplete,
    language,
  });

  // Dynamic instruction when voice starts listening on home screen
  useEffect(() => {
    if (isListening && activeTab !== 'dashboard') {
      // Just focus or show a tip
    }
  }, [isListening, activeTab]);

  // Drag & Drop Handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const files = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf');
      if (files.length > 0) {
        setActiveTab('dashboard'); // Auto-slide to dashboard on file drop
        await addFiles(files);
      }
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const files = Array.from(e.target.files).filter(f => f.type === 'application/pdf');
      if (files.length > 0) {
        setActiveTab('dashboard');
        await addFiles(files);
      }
    }
  };

  const addFiles = async (files: File[]) => {
    const newUploads = files.map(file => ({
      file,
      id: Math.random().toString(36).substring(2, 9),
      status: 'pending' as const
    }));
    
    setUploadedFiles(prev => [...prev, ...newUploads]);
    
    // Parse sequentially
    for (const upload of newUploads) {
      setUploadedFiles(prev => prev.map(u => u.id === upload.id ? { ...u, status: 'parsing' } : u));
      try {
        const text = await parsePdf(upload.file);
        
        const resumeItem: ResumeItem = {
          id: upload.id,
          fileName: upload.file.name,
          rawText: text
        };
        
        setParsedResumes(prev => [...prev, resumeItem]);
        setUploadedFiles(prev => prev.map(u => u.id === upload.id ? { ...u, status: 'done', text } : u));
      } catch (err) {
        console.error('Failed to parse file:', upload.file.name, err);
        setUploadedFiles(prev => prev.map(u => u.id === upload.id ? { ...u, status: 'error' } : u));
      }
    }
  };

  const removeFile = (id: string) => {
    setUploadedFiles(prev => prev.filter(u => u.id !== id));
    setParsedResumes(prev => prev.filter(r => r.id !== id));
    if (selectedCandidate && selectedCandidate.id === id) {
      setSelectedCandidate(null);
    }
  };

  const clearAllFiles = () => {
    setUploadedFiles([]);
    setParsedResumes([]);
    setCandidates([]);
    setSummaryResponse('');
    setSelectedCandidate(null);
    stopSpeaking();
  };

  // Call Gemini Evaluation
  const triggerEvaluation = async (voiceQueryOverride?: string) => {
    if (parsedResumes.length === 0) return;
    setIsEvaluating(true);
    stopSpeaking();
    
    try {
      const activeVoiceQuery = voiceQueryOverride !== undefined ? voiceQueryOverride : transcript;
      
      const response = await fetch('/api/rank-resumes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobDescription,
          resumes: parsedResumes,
          voiceQuery: activeVoiceQuery,
          language,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.details ? `${data.error} (Details: ${data.details})` : (data.error || 'Failed to evaluate resumes'));
      }

      setCandidates(data.candidates || []);
      setSummaryResponse(data.summaryResponse || '');
      
      if (data.summaryResponse) {
        speakText(data.summaryResponse);
      }
    } catch (err: any) {
      console.error(err);
      alert(`Evaluation Error: ${err.message}`);
    } finally {
      setIsEvaluating(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400 bg-emerald-950/20';
    if (score >= 60) return 'text-amber-400 bg-amber-950/20';
    return 'text-rose-400 bg-rose-950/20';
  };

  const getScoreBarColor = (score: number) => {
    if (score >= 80) return 'bg-emerald-400/90';
    if (score >= 60) return 'bg-amber-400/90';
    return 'bg-rose-400/90';
  };

  // Nav Links
  const navLinks = [
    { label: 'Home', active: activeTab === 'home', onClick: () => { setActiveTab('home'); setMenuOpen(false); } },
    { label: 'ATS Dashboard', active: activeTab === 'dashboard', onClick: () => { setActiveTab('dashboard'); setMenuOpen(false); } },
    { label: 'How It Works', onClick: () => { setInstructionsOpen(true); setMenuOpen(false); } },
  ];

  return (
    <div className="relative w-full h-screen overflow-hidden flex flex-col">
      {/* Background Looping Video */}
      <video
        className="absolute inset-0 w-full h-full object-cover -z-20"
        autoPlay
        muted
        loop
        playsInline
        src={BG_VIDEO}
      />
      
      {/* Dark overlay to ensure contrast */}
      <div className="absolute inset-0 bg-black/60 -z-10" />

      {/* Navbar */}
      <header className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-5 sm:px-8 py-5 h-[72px]">
        {/* Logo (left) */}
        <button 
          onClick={() => setActiveTab('home')}
          className="flex items-center gap-2 text-white font-medium text-base hover:opacity-90 transition cursor-pointer"
        >
          <Infinity size={22} strokeWidth={1.5} className="text-white" />
          <span>Talento</span>
        </button>

        {/* Central Nav Pill (center) */}
        <nav className="hidden md:flex liquid-glass items-center gap-1 rounded-xl px-2 py-1.5">
          {navLinks.map((link, idx) => (
            <button
              key={idx}
              onClick={link.onClick}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 cursor-pointer ${
                link.active 
                  ? 'bg-white/15 text-white' 
                  : 'text-white/70 hover:text-white hover:bg-white/5'
              }`}
            >
              {link.label}
            </button>
          ))}
        </nav>

        {/* CTAs (right) */}
        <div className="hidden md:flex items-center gap-3">
          <button 
            onClick={() => setInstructionsOpen(true)}
            className="liquid-glass text-white text-xs font-medium px-4 py-2 rounded-full hover:bg-white/5 transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <HelpCircle size={14} />
            Instructions
          </button>
          <button 
            onClick={() => setActiveTab(activeTab === 'home' ? 'dashboard' : 'home')}
            className="bg-white text-black text-xs font-semibold px-4 py-2 rounded-full hover:bg-white/90 transition-colors cursor-pointer"
          >
            {activeTab === 'home' ? 'Begin Now' : 'Show Landing'}
          </button>
        </div>

        {/* Mobile Toggle */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden liquid-glass text-white p-2 rounded-lg cursor-pointer"
        >
          {menuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </header>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="absolute top-[72px] left-4 right-4 z-30 md:hidden liquid-glass rounded-2xl p-4 flex flex-col gap-1">
          {navLinks.map((link, idx) => (
            <button
              key={idx}
              onClick={link.onClick}
              className="flex items-center justify-between w-full px-4 py-3 rounded-lg text-sm text-white/80 hover:text-white hover:bg-white/5 transition cursor-pointer"
            >
              <span>{link.label}</span>
              <ChevronRight size={14} className="text-white/40" />
            </button>
          ))}
          
          <div className="flex gap-2 mt-2 pt-3 border-t border-white/10">
            <button 
              onClick={() => { setInstructionsOpen(true); setMenuOpen(false); }}
              className="flex-1 liquid-glass text-white text-xs font-medium py-3 rounded-full hover:bg-white/5 transition-colors cursor-pointer text-center"
            >
              Instructions
            </button>
            <button 
              onClick={() => { setActiveTab(activeTab === 'home' ? 'dashboard' : 'home'); setMenuOpen(false); }}
              className="flex-1 bg-white text-black text-xs font-semibold py-3 rounded-full hover:bg-white/90 transition-colors cursor-pointer text-center"
            >
              {activeTab === 'home' ? 'Begin Now' : 'Show Landing'}
            </button>
          </div>
        </div>
      )}

      {/* Landing View Hero Content (Bottom-Left) */}
      <div 
        className={`absolute bottom-0 left-0 z-10 px-6 sm:px-12 pb-10 sm:pb-16 max-w-2xl transition-all duration-750 transform ${
          activeTab === 'home' 
            ? 'opacity-100 translate-y-0 pointer-events-auto' 
            : 'opacity-0 translate-y-10 pointer-events-none'
        }`}
      >
        <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white/70 text-[10px] uppercase tracking-wider font-semibold mb-4">
          <Sparkle size={10} className="text-white animate-pulse" />
          Powered by Gemini 2.5 Flash
        </div>
        <h1 className="text-white text-4xl sm:text-5xl lg:text-6xl font-semibold leading-tight tracking-tight mb-4">
          Recruit Smarter, Build Teams Every Day
        </h1>
        <p className="text-white/60 text-sm leading-relaxed mb-7 max-w-md">
          Take charge of your hiring with an AI recruiter co-pilot—bulk parse candidate CVs client-side in seconds, set criteria, and speak natural commands to rank talent instantly.
        </p>
        
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className="bg-white text-black text-sm font-semibold px-6 py-3.5 rounded-full hover:bg-white/90 transition-colors cursor-pointer flex items-center gap-2"
          >
            Start Screening
            <ArrowRight size={16} />
          </button>
          <button 
            onClick={() => setInstructionsOpen(true)}
            className="liquid-glass text-white text-sm font-medium px-6 py-3.5 rounded-full hover:bg-white/5 transition-colors cursor-pointer"
          >
            Discover How
          </button>
        </div>
      </div>

      {/* Interactive Recruiter Dashboard Panel (Slides in from the right) */}
      <div 
        className={`absolute top-[72px] bottom-0 left-0 right-0 z-15 w-full transition-all duration-500 transform ${
          activeTab === 'dashboard'
            ? 'translate-x-0'
            : 'translate-x-full'
        }`}
      >
        {/* Inner layout wrapper */}
        <div className="w-full h-full p-4 md:p-6 px-5 sm:px-8 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden bg-black/45 backdrop-blur-[2px] items-stretch">
          
          {/* Left Controls (Columns 1-5) */}
          <div className="lg:col-span-5 flex flex-col gap-3.5 h-full overflow-hidden">
            
            {/* Criteria */}
            <div className="liquid-glass rounded-2xl p-4 flex flex-col gap-2.5 flex-1 min-h-0">
              <h3 className="text-xs font-bold tracking-wider text-white/50 uppercase flex items-center gap-1.5 shrink-0">
                <Award size={14} className="text-white/70" />
                Job Matching Parameters
              </h3>
              <textarea
                className="w-full flex-1 glass-input rounded-xl p-3 text-xs resize-none"
                placeholder="Specify the qualifications, years of experience, or skills you seek..."
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
              />
            </div>

            {/* Ingest */}
            <div className="liquid-glass rounded-2xl p-4 flex flex-col gap-2.5 flex-1 min-h-0">
              <div className="flex items-center justify-between shrink-0">
                <h3 className="text-xs font-bold tracking-wider text-white/50 uppercase flex items-center gap-1.5">
                  <Upload size={14} className="text-white/70" />
                  PDF Resume Ingestion
                </h3>
                {uploadedFiles.length > 0 && (
                  <button 
                    onClick={clearAllFiles}
                    className="text-[10px] text-white/40 hover:text-white transition flex items-center gap-1"
                  >
                    <Trash2 size={11} /> Clear
                  </button>
                )}
              </div>

              {/* Drag Zone */}
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border border-dashed rounded-xl p-3 text-center cursor-pointer transition flex flex-col items-center justify-center gap-1.5 flex-1 min-h-[50px] ${
                  dragActive 
                    ? 'border-white bg-white/5' 
                    : 'border-white/10 hover:border-white/30 bg-white/2'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="application/pdf"
                  className="hidden"
                  onChange={handleFileInput}
                />
                <Upload size={16} className="text-white/50" />
                <div>
                  <p className="text-xs font-medium text-white/80">Bulk drop resume PDFs here</p>
                  <p className="text-[10px] text-white/40 mt-0.5">or click to browse files</p>
                </div>
              </div>

              {/* PDF Progress */}
              {isParsing && (
                <div className="flex items-center gap-2 bg-white/5 rounded-xl p-2.5 text-[10px] text-white/70 shrink-0">
                  <div className="animate-spin rounded-full h-3 w-3 border-b border-white" />
                  <span>{pdfProgress}</span>
                </div>
              )}

              {/* Files */}
              {uploadedFiles.length > 0 && (
                <div className="max-h-24 overflow-y-auto flex flex-col gap-1.5 pr-1 shrink-0 no-scrollbar">
                  {uploadedFiles.map((upload) => (
                    <div 
                      key={upload.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-black/35 border border-white/5 text-[11px]"
                    >
                      <div className="flex items-center gap-2 min-w-0 max-w-[85%]">
                        <FileText size={13} className={upload.status === 'error' ? 'text-rose-400' : 'text-white/60'} />
                        <span className="truncate text-white/80 font-medium">{upload.file.name}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {upload.status === 'parsing' && <span className="text-[9px] text-white/50 animate-pulse">Parsing...</span>}
                        {upload.status === 'done' && <Check size={12} className="text-emerald-400" />}
                        {upload.status === 'error' && <AlertTriangle size={12} className="text-rose-400" />}
                        <button 
                          onClick={(e) => { e.stopPropagation(); removeFile(upload.id); }}
                          className="text-white/30 hover:text-white p-0.5 transition"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Voice Console */}
            <div className="liquid-glass rounded-2xl p-4 flex flex-col gap-2.5 relative flex-1 min-h-0 justify-between">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold tracking-wider text-white/50 uppercase flex items-center gap-1.5">
                  <Mic size={14} className="text-white/70" />
                  Voice Recruiter Assistant
                </h3>
                
                <div className="flex items-center gap-1.5">
                  {/* Language switch */}
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as any)}
                    className="bg-black/40 border border-white/10 rounded-lg text-[9px] font-semibold text-white/80 px-2 py-1 focus:outline-none cursor-pointer"
                  >
                    <option value="en-US">English (US)</option>
                    <option value="ur-PK">Urdu (اردو)</option>
                  </select>

                  <button
                    onClick={() => setTtsEnabled(!ttsEnabled)}
                    className={`p-1 rounded-lg border transition ${
                      ttsEnabled 
                        ? 'border-white/20 bg-white/10 text-white' 
                        : 'border-white/5 bg-transparent text-white/30'
                    }`}
                  >
                    {ttsEnabled ? <Volume2 size={12} /> : <VolumeX size={12} />}
                  </button>

                  {isSpeaking && (
                    <button
                      onClick={stopSpeaking}
                      className="p-1 rounded-lg bg-rose-500/20 border border-rose-500/30 text-rose-300 hover:bg-rose-500/30 transition flex items-center gap-1 text-[8px] uppercase tracking-wider font-bold"
                    >
                      <Square size={8} className="fill-current" /> Stop
                    </button>
                  )}
                </div>
              </div>

              {/* Dictation visual block */}
              <div className="flex items-start gap-4 mt-1">
                <button
                  disabled={!speechSupported}
                  onClick={isListening ? stopListening : startListening}
                  className={`h-12 w-12 shrink-0 rounded-full flex items-center justify-center border transition-all duration-300 ${
                    !speechSupported
                      ? 'border-white/5 bg-white/2 text-white/20 cursor-not-allowed'
                      : isListening
                        ? 'border-white bg-white/20 text-white mic-active scale-105'
                        : 'border-white/10 bg-white/5 text-white/80 hover:border-white/30 hover:bg-white/10'
                  }`}
                >
                  {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                </button>

                <div className="flex-1 min-w-0">
                  <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest block">
                    {isListening ? 'Recording Audio feed...' : isSpeaking ? 'Audio readout active' : 'Speech-to-Text Input'}
                  </span>
                  
                  {isListening || transcript ? (
                    <p className="text-xs text-white/90 italic mt-0.5 break-words max-h-16 overflow-y-auto">
                      &ldquo;{transcript || 'Dictating filter query...'}&rdquo;
                    </p>
                  ) : (
                    <p className="text-[11px] text-white/40 mt-0.5">
                      Toggle the microphone and instruct Gemini (e.g., <span className="italic text-white/60">"AWS matching profiles filter karo"</span>).
                    </p>
                  )}
                </div>
              </div>

              {/* Text search override */}
              <div className="flex gap-2 mt-2">
                <input
                  type="text"
                  placeholder="Text command (Urdu / English)..."
                  className="flex-1 glass-input rounded-xl px-3 py-2 text-xs"
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') triggerEvaluation(); }}
                />
                <button
                  onClick={() => triggerEvaluation()}
                  disabled={isEvaluating || parsedResumes.length === 0}
                  className="px-3 py-2 rounded-xl bg-white text-black font-semibold text-xs hover:bg-white/90 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  Rank
                  <ArrowRight size={12} />
                </button>
              </div>

              {/* Wave visualizer */}
              {(isListening || isSpeaking) && (
                <div className="flex items-center justify-center gap-1 h-6 mt-1.5 bg-black/40 rounded-xl px-3">
                  <span className="text-[8px] font-bold text-white/40 uppercase tracking-widest mr-2">Audio Visualizer</span>
                  <div className="flex items-center h-full py-2">
                    {Array.from({ length: 10 }).map((_, idx) => (
                      <span 
                        key={idx} 
                        className="wave-bar bg-white/70"
                        style={{
                          animationDuration: `${0.6 + Math.random() * 0.8}s`,
                          animationDelay: `${idx * 0.08}s`
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* Right Panel - Leaderboard & Executive Summary (Columns 6-12) */}
          <div className="lg:col-span-7 flex flex-col gap-6 overflow-hidden max-h-full">
            <div className="liquid-glass rounded-2xl p-5 flex flex-col gap-4 flex-1 overflow-hidden">
              <div className="flex items-center justify-between border-b border-white/5 pb-3 shrink-0">
                <div>
                  <h3 className="text-xs font-bold tracking-wider text-white/50 uppercase flex items-center gap-1.5">
                    <Award size={14} className="text-white/70" />
                    ATS Matching Leaderboard
                  </h3>
                </div>
                {candidates.length > 0 && (
                  <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full text-white/80 font-medium">
                    {candidates.length} Profiles
                  </span>
                )}
              </div>

              {/* Executive summary banner */}
              {summaryResponse && (
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 flex gap-3 shrink-0">
                  <div className="h-7 w-7 rounded bg-white/10 flex items-center justify-center text-white shrink-0 mt-0.5">
                    <Sparkles size={13} />
                  </div>
                  <div>
                    <h4 className="text-[9px] font-bold text-white/50 tracking-wider uppercase">Gemini Executive Summary</h4>
                    <p className="text-xs text-white/90 mt-0.5 leading-relaxed font-medium">{summaryResponse}</p>
                  </div>
                </div>
              )}

              {/* Main candidate display viewport */}
              <div className="flex-1 overflow-y-auto min-h-0 no-scrollbar">
                {isEvaluating ? (
                  <div className="h-full flex flex-col items-center justify-center gap-3 py-10">
                    <div className="h-10 w-10 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                    <p className="text-xs text-white/60">Gemini is processing candidate rankings...</p>
                  </div>
                ) : candidates.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 border border-dashed border-white/5 bg-white/1 rounded-xl gap-3">
                    <div className="h-9 w-9 rounded-lg bg-white/5 flex items-center justify-center text-white/40">
                      <Award size={18} />
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-white/80">Leaderboard Awaiting Input</h4>
                      <p className="text-[11px] text-white/40 mt-0.5 max-w-xs">
                        Ingest resume files, set parameters, and initiate ranking on the left panel to populate candidates.
                      </p>
                    </div>
                  </div>
                ) : (
                  /* Leaderboard list */
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/5 text-[9px] text-white/40 uppercase tracking-widest font-bold">
                        <th className="py-2.5 px-2 text-center w-12">Rank</th>
                        <th className="py-2.5 px-3">Profile Info</th>
                        <th className="py-2.5 px-3 w-36">Match Score</th>
                        <th className="py-2.5 px-2 text-center w-16">Exp</th>
                        <th className="py-2.5 px-2 text-right w-12"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {candidates.map((candidate) => (
                        <tr
                          key={candidate.id}
                          onClick={() => setSelectedCandidate(candidate)}
                          className={`group border-b border-white/5 hover:bg-white/3 transition cursor-pointer ${
                            selectedCandidate?.id === candidate.id ? 'bg-white/5' : ''
                          }`}
                        >
                          <td className="py-3 px-2 text-center">
                            <div className={`h-5 w-5 mx-auto rounded-full flex items-center justify-center font-bold text-[10px] ${
                              candidate.rank === 1 
                                ? 'bg-white text-black font-extrabold' 
                                : 'bg-white/10 text-white/80'
                            }`}>
                              {candidate.rank}
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-medium text-xs text-white group-hover:text-white/80 transition">
                              {candidate.name}
                            </div>
                            <div className="flex flex-wrap gap-1 mt-1 max-w-[240px]">
                              {candidate.topSkills.slice(0, 3).map((skill, sIdx) => (
                                <span 
                                  key={sIdx}
                                  className="text-[8px] px-1.5 py-0.5 rounded bg-white/5 text-white/50 border border-white/5"
                                >
                                  {skill}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex items-center justify-between gap-2.5">
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border border-white/5 ${getScoreColor(candidate.atsScore)}`}>
                                {candidate.atsScore}%
                              </span>
                              <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full progress-bar-fill ${getScoreBarColor(candidate.atsScore)}`}
                                  style={{ width: `${candidate.atsScore}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-2 text-center text-xs text-white/80 font-medium">
                            {candidate.yearsOfExperience}y
                          </td>
                          <td className="py-3 px-2 text-right">
                            <ChevronRight size={13} className="text-white/30 group-hover:translate-x-0.5 transition" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Sliding Candidate Detail Drawer (Overlay) */}
      {selectedCandidate && (
        <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[460px] bg-black/85 backdrop-blur-2xl border-l border-white/10 shadow-2xl p-6 flex flex-col transition-all duration-300">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-4 shrink-0">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center font-bold text-xs text-white">
                #{selectedCandidate.rank}
              </div>
              <div>
                <h3 className="text-sm font-bold text-white leading-tight">{selectedCandidate.name}</h3>
                <p className="text-[10px] text-white/40 mt-0.5">Estimated Experience: {selectedCandidate.yearsOfExperience} Years</p>
              </div>
            </div>
            <button 
              onClick={() => setSelectedCandidate(null)}
              className="p-1 rounded-lg border border-white/10 text-white/50 hover:text-white transition"
            >
              <X size={14} />
            </button>
          </div>

          {/* Drawer Body Scroll */}
          <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-5 pr-1 min-h-0">
            {/* Quick Profile Summary */}
            <div className="p-3.5 rounded-xl bg-white/3 border border-white/5 flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Match Assessment</span>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border border-white/5 ${getScoreColor(selectedCandidate.atsScore)}`}>
                  {selectedCandidate.atsScore}% Fit
                </span>
              </div>
              <p className="text-xs text-white/80 leading-relaxed italic">
                &ldquo;{selectedCandidate.summary}&rdquo;
              </p>
            </div>

            {/* Skills */}
            <div className="flex flex-col gap-1.5">
              <h4 className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Extracted Stack</h4>
              <div className="flex flex-wrap gap-1 mt-1">
                {selectedCandidate.topSkills.map((skill, sIdx) => (
                  <span 
                    key={sIdx} 
                    className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-white/80 border border-white/5"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            {/* Pros */}
            <div className="flex flex-col gap-2">
              <h4 className="text-[9px] font-bold text-emerald-400/90 uppercase tracking-widest flex items-center gap-1">
                <CheckCircle2 size={12} /> Key Highlights
              </h4>
              <ul className="flex flex-col gap-1.5">
                {selectedCandidate.pros.map((pro, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs text-white/80 bg-emerald-950/5 border border-emerald-950/10 p-2.5 rounded-lg leading-relaxed">
                    <Check size={12} className="text-emerald-400 shrink-0 mt-0.5" />
                    <span>{pro}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Cons */}
            <div className="flex flex-col gap-2">
              <h4 className="text-[9px] font-bold text-rose-400/90 uppercase tracking-widest flex items-center gap-1">
                <AlertTriangle size={12} /> Observed Gaps
              </h4>
              <ul className="flex flex-col gap-1.5">
                {selectedCandidate.cons.map((con, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs text-white/80 bg-rose-950/5 border border-rose-950/10 p-2.5 rounded-lg leading-relaxed">
                    <X size={12} className="text-rose-400 shrink-0 mt-0.5" />
                    <span>{con}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="border-t border-white/10 pt-4 flex gap-3 shrink-0">
            <button 
              onClick={() => {
                if (speechSupported) {
                  const text = language === 'ur-PK'
                    ? `${selectedCandidate.name} کا اسکور ${selectedCandidate.atsScore} فیصد ہے۔ ${selectedCandidate.summary}`
                    : `Candidate ${selectedCandidate.name} matches at ${selectedCandidate.atsScore} percent. ${selectedCandidate.summary}`;
                  speakText(text);
                }
              }}
              disabled={isSpeaking}
              className="flex-1 py-2.5 rounded-xl border border-white/10 text-xs font-semibold text-white hover:bg-white/5 transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Volume2 size={13} />
              Speak Candidate Summary
            </button>
          </div>
        </div>
      )}

      {/* Instructions Modal Overlay */}
      {instructionsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-md liquid-glass rounded-2xl p-6 flex flex-col gap-4 relative animate-in fade-in-50 zoom-in-95 duration-200">
            <button 
              onClick={() => setInstructionsOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-lg border border-white/10 text-white/40 hover:text-white transition"
            >
              <X size={14} />
            </button>
            
            <div className="flex items-center gap-2 border-b border-white/10 pb-3">
              <HelpCircle size={18} className="text-white" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">How to Use Talento</h3>
            </div>

            <div className="flex flex-col gap-3 text-xs text-white/70 leading-relaxed">
              <div className="flex items-start gap-2">
                <span className="h-4 w-4 shrink-0 rounded-full bg-white/10 flex items-center justify-center text-[9px] text-white font-bold mt-0.5">1</span>
                <p>Drag and drop candidate CVs (PDF formats) to automatically parse their text in-browser memory. <strong>No file uploads to servers.</strong></p>
              </div>
              <div className="flex items-start gap-2">
                <span className="h-4 w-4 shrink-0 rounded-full bg-white/10 flex items-center justify-center text-[9px] text-white font-bold mt-0.5">2</span>
                <p>Optionally edit the <strong>Job matching criteria</strong> or technology stack required for the role.</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="h-4 w-4 shrink-0 rounded-full bg-white/10 flex items-center justify-center text-[9px] text-white font-bold mt-0.5">3</span>
                <p>Select your voice language (<strong>Urdu</strong> or <strong>English</strong>) next to the microphone icon.</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="h-4 w-4 shrink-0 rounded-full bg-white/10 flex items-center justify-center text-[9px] text-white font-bold mt-0.5">4</span>
                <p>Click the microphone, wait for the chime, and dictate screening filters (e.g. <em>"Rank candidates who have AWS and React skills"</em>). When done speaking, the evaluation is automatically queried.</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="h-4 w-4 shrink-0 rounded-full bg-white/10 flex items-center justify-center text-[9px] text-white font-bold mt-0.5">5</span>
                <p>The leaderboard displays profiles ranked by matching score. If audio summary is enabled, the AI will speak its executive summary back to you in Urdu or English.</p>
              </div>
            </div>

            <button 
              onClick={() => setInstructionsOpen(false)}
              className="w-full bg-white hover:bg-white/90 text-black py-2.5 rounded-xl text-xs font-bold tracking-wide uppercase transition mt-2 cursor-pointer"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
