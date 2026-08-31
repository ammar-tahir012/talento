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
  Sparkle,
  Copy,
  Mail,
  Send,
  CheckSquare,
  Users,
  Globe,
  ExternalLink,
  GitBranch
} from 'lucide-react';

const LinkedinIcon = ({ size = 14, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
    <rect x="2" y="9" width="4" height="12"/>
    <circle cx="4" cy="4" r="2"/>
  </svg>
);

const GithubIcon = ({ size = 14, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/>
    <path d="M9 18c-4.51 2-5-2-7-2"/>
  </svg>
);
import { usePdfParser, ResumeItem } from '@/hooks/usePdfParser';
import { useVoiceAssistant } from '@/hooks/useVoiceAssistant';

const BG_VIDEO = 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260511_230229_7c9bc431-46cf-489a-948d-e8144d8eb5d4.mp4';

type Candidate = {
  id: string;
  name: string;
  email?: string;
  rank: number;
  atsScore: number;
  yearsOfExperience: number;
  pros: string[];
  cons: string[];
  topSkills: string[];
  summary: string;
  interviewQuestions?: string[];
  socialLinks?: {
    github?: string;
    linkedin?: string;
    portfolio?: string;
    kaggle?: string;
  };
  gitHubHealth?: {
    hasGithub: boolean;
    username?: string;
    healthScore: number;
    topLanguages: string[];
    commitConsistency: string;
    verifiedClaims: string[];
  };
};

export default function Home() {
  // Navigation states
  const [activeTab, setActiveTab] = useState<'home' | 'dashboard'>('home');
  const [menuOpen, setMenuOpen] = useState(false);
  const [instructionsOpen, setInstructionsOpen] = useState(false);
  const [aboutUsOpen, setAboutUsOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<'overview' | 'interviewKit' | 'sourcing'>('overview');
  const [copiedQuestionIndex, setCopiedQuestionIndex] = useState<number | null>(null);
  const [copiedKit, setCopiedKit] = useState<boolean>(false);

  // Batch action & Outreach automation states
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>([]);
  const [outreachModalOpen, setOutreachModalOpen] = useState(false);
  const [outreachTemplate, setOutreachTemplate] = useState<'first_round' | 'tech_screen' | 'rejection'>('first_round');
  const [selectedOutreachCandidateId, setSelectedOutreachCandidateId] = useState<string | null>(null);
  const [copiedDraft, setCopiedDraft] = useState(false);
  const [copiedBatch, setCopiedBatch] = useState(false);
  
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

  const copyToClipboard = (text: string, index?: number) => {
    navigator.clipboard.writeText(text);
    if (index !== undefined) {
      setCopiedQuestionIndex(index);
      setTimeout(() => setCopiedQuestionIndex(null), 2000);
    } else {
      setCopiedKit(true);
      setTimeout(() => setCopiedKit(false), 2000);
    }
  };

  const toggleSelectCandidate = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedCandidateIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAllCandidates = () => {
    if (selectedCandidateIds.length === candidates.length) {
      setSelectedCandidateIds([]);
    } else {
      setSelectedCandidateIds(candidates.map(c => c.id));
    }
  };

  const generateOutreachEmail = (candidate: Candidate, template: 'first_round' | 'tech_screen' | 'rejection') => {
    const candidateEmail = (candidate.email && candidate.email.trim().includes('@'))
      ? candidate.email.trim()
      : `${candidate.name.toLowerCase().replace(/\s+/g, '.')}@gmail.com`;
    let subject = '';
    let body = '';

    if (template === 'first_round') {
      subject = `Interview Invitation: Senior Frontend Developer Role - Talento`;
      body = `Hi ${candidate.name},

Thank you for your application! Our hiring team reviewed your background and was impressed with your experience in ${candidate.topSkills.slice(0, 3).join(', ')}.

We would love to invite you for a 30-minute first-round interview to discuss your experience and learn more about your past projects.

Please let us know your availability over the next few business days.

Best regards,
Ammar Tahir
Talento Recruitment Team`;
    } else if (template === 'tech_screen') {
      subject = `Technical Screening Assessment: Senior Frontend Developer - Talento`;
      body = `Hi ${candidate.name},

Following our review of your profile, we are excited to move forward with your application.

As a next step, we would like to schedule a 45-minute technical screening session focusing on frontend architecture, React performance, and modern web applications.

Please reply with 2-3 preferred timeslots this week.

Best regards,
Ammar Tahir
Talento Hiring Team`;
    } else {
      subject = `Application Update: Senior Frontend Developer - Talento`;
      body = `Hi ${candidate.name},

Thank you for taking the time to share your background with us for the Senior Frontend Developer position.

While your experience in ${candidate.topSkills.slice(0, 2).join(' and ')} is commendable, we have decided to move forward with candidates whose current skillsets align more closely with our immediate role requirements.

We will keep your profile in our talent pool for future opportunities that match your background. We wish you the best in your job search!

Best regards,
Ammar Tahir
Talento Recruiting`;
    }

    return { candidateEmail, subject, body };
  };

  // Call Gemini Evaluation
  const triggerEvaluation = async (voiceQueryOverride?: string) => {
    if (parsedResumes.length === 0 || isEvaluating) return;
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
    { label: 'About Us', onClick: () => { setAboutUsOpen(true); setMenuOpen(false); } },
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
          
          <div className="mt-2 pt-3 border-t border-white/10">
            <button 
              onClick={() => { setActiveTab(activeTab === 'home' ? 'dashboard' : 'home'); setMenuOpen(false); }}
              className="w-full bg-white text-black text-xs font-semibold py-3 rounded-full hover:bg-white/90 transition-colors cursor-pointer text-center"
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
          Powered by Talento AI Engine
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
            className="liquid-glass text-white text-sm font-medium px-5 py-3.5 rounded-full hover:bg-white/5 transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <HelpCircle size={15} />
            Instructions
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
          <div className="lg:col-span-5 flex flex-col gap-3.5 max-h-full overflow-hidden">
            
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

              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="application/pdf"
                className="hidden"
                onChange={handleFileInput}
              />

              {/* Drag Zone: Large when empty, compact when files exist */}
              {uploadedFiles.length === 0 ? (
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border border-dashed rounded-xl p-3 text-center cursor-pointer transition flex flex-col items-center justify-center gap-1.5 flex-1 min-h-[60px] ${
                    dragActive 
                      ? 'border-white bg-white/5' 
                      : 'border-white/10 hover:border-white/30 bg-white/2'
                  }`}
                >
                  <Upload size={18} className="text-white/50" />
                  <div>
                    <p className="text-xs font-medium text-white/80">Bulk drop resume PDFs here</p>
                    <p className="text-[10px] text-white/40 mt-0.5">or click to browse files</p>
                  </div>
                </div>
              ) : (
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border border-dashed rounded-xl py-2 px-3 text-center cursor-pointer transition flex items-center justify-center gap-2 shrink-0 ${
                    dragActive 
                      ? 'border-white bg-white/5' 
                      : 'border-white/10 hover:border-white/20 bg-white/1'
                  }`}
                >
                  <Upload size={12} className="text-white/50 shrink-0" />
                  <span className="text-[10px] font-medium text-white/60">Drag / click here to add more CVs</span>
                </div>
              )}

              {/* PDF Progress */}
              {isParsing && (
                <div className="flex items-center gap-2 bg-white/5 rounded-xl p-2.5 text-[10px] text-white/70 shrink-0">
                  <div className="animate-spin rounded-full h-3 w-3 border-b border-white" />
                  <span>{pdfProgress}</span>
                </div>
              )}

              {/* Files */}
              {uploadedFiles.length > 0 && (
                <div className="flex-1 overflow-y-auto flex flex-col gap-1.5 pr-1 no-scrollbar min-h-0">
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
                      Toggle the microphone and instruct Talento (e.g., <span className="italic text-white/60">"AWS matching profiles filter karo"</span>).
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
                    <h4 className="text-[9px] font-bold text-white/50 tracking-wider uppercase">Talento Executive Summary</h4>
                    <p className="text-xs text-white/90 mt-0.5 leading-relaxed font-medium">{summaryResponse}</p>
                  </div>
                </div>
              )}

              {/* Main candidate display viewport */}
              <div className="flex-1 overflow-y-auto min-h-0 no-scrollbar">
                {isEvaluating ? (
                  <div className="h-full flex flex-col items-center justify-center gap-3 py-10">
                    <div className="h-10 w-10 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                    <p className="text-xs text-white/60">Talento is processing candidate rankings...</p>
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
                        <th className="py-2.5 px-2 text-center w-8">
                          <button 
                            onClick={toggleSelectAllCandidates}
                            className="p-1 text-white/50 hover:text-white transition cursor-pointer"
                            title="Select / Deselect All Candidates"
                          >
                            {selectedCandidateIds.length > 0 && selectedCandidateIds.length === candidates.length ? (
                              <CheckSquare size={13} className="text-white" />
                            ) : (
                              <Square size={13} />
                            )}
                          </button>
                        </th>
                        <th className="py-2.5 px-2 text-center w-10">Rank</th>
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
                            selectedCandidate?.id === candidate.id || selectedCandidateIds.includes(candidate.id) ? 'bg-white/5' : ''
                          }`}
                        >
                          <td className="py-3 px-2 text-center" onClick={(e) => toggleSelectCandidate(candidate.id, e)}>
                            <button className="p-1 text-white/40 hover:text-white transition cursor-pointer">
                              {selectedCandidateIds.includes(candidate.id) ? (
                                <CheckSquare size={13} className="text-emerald-400" />
                              ) : (
                                <Square size={13} />
                              )}
                            </button>
                          </td>
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
                            <div className="font-medium text-xs text-white group-hover:text-white/80 transition flex items-center gap-1.5">
                              <span>{candidate.name}</span>
                              {candidate.socialLinks?.github && candidate.socialLinks.github.trim() !== '' && (
                                <a 
                                  href={candidate.socialLinks.github.startsWith('http') ? candidate.socialLinks.github : `https://${candidate.socialLinks.github}`} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  onClick={(e) => e.stopPropagation()} 
                                  className="text-white/40 hover:text-white transition"
                                  title="GitHub Profile"
                                >
                                  <GithubIcon size={11} />
                                </a>
                              )}
                              {candidate.socialLinks?.linkedin && candidate.socialLinks.linkedin.trim() !== '' && (
                                <a 
                                  href={candidate.socialLinks.linkedin.startsWith('http') ? candidate.socialLinks.linkedin : `https://${candidate.socialLinks.linkedin}`} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  onClick={(e) => e.stopPropagation()} 
                                  className="text-blue-400/60 hover:text-blue-400 transition"
                                  title="LinkedIn Profile"
                                >
                                  <LinkedinIcon size={11} />
                                </a>
                              )}
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

              {/* Floating Batch Action Bar */}
              {selectedCandidateIds.length > 0 && (
                <div className="mt-3 p-3 rounded-xl bg-white/10 border border-white/15 backdrop-blur-xl flex items-center justify-between animate-in fade-in-50 slide-in-from-bottom-2 duration-200 shrink-0">
                  <div className="flex items-center gap-2 text-xs font-semibold text-white">
                    <Users size={14} className="text-amber-400" />
                    <span>{selectedCandidateIds.length} Candidate{selectedCandidateIds.length > 1 ? 's' : ''} Shortlisted</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedOutreachCandidateId(selectedCandidateIds[0]);
                        setOutreachModalOpen(true);
                      }}
                      className="px-3.5 py-1.5 rounded-lg bg-white text-black text-xs font-bold hover:bg-white/90 transition flex items-center gap-1.5 cursor-pointer shadow-lg"
                    >
                      <Mail size={13} />
                      Generate Outreach Drafts ({selectedCandidateIds.length})
                    </button>
                    <button
                      onClick={() => setSelectedCandidateIds([])}
                      className="px-2.5 py-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/5 text-xs transition cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              )}
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
              className="p-1 rounded-lg border border-white/10 text-white/50 hover:text-white transition cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>

          {/* Drawer Sub Navigation Pills */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/10 mt-3.5 shrink-0">
            <button
              onClick={() => setDrawerTab('overview')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                drawerTab === 'overview'
                  ? 'bg-white text-black shadow'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setDrawerTab('interviewKit')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1 cursor-pointer ${
                drawerTab === 'interviewKit'
                  ? 'bg-white text-black shadow'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <Sparkles size={11} />
              Kit {selectedCandidate.interviewQuestions?.length ? `(${selectedCandidate.interviewQuestions.length})` : ''}
            </button>
            <button
              onClick={() => setDrawerTab('sourcing')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1 cursor-pointer ${
                drawerTab === 'sourcing'
                  ? 'bg-white text-black shadow'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <Globe size={11} />
              360° Sourcing
            </button>
          </div>

          {/* Drawer Body Viewport */}
          {drawerTab === 'overview' ? (
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
          ) : drawerTab === 'interviewKit' ? (
            <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-3.5 pr-1 min-h-0 no-scrollbar">
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Sparkles size={13} className="text-amber-400" />
                    AI Tailored Interview Kit
                  </h4>
                  <p className="text-[10px] text-white/50 mt-0.5">5 questions targeting background, gaps & tech transitions</p>
                </div>
                {selectedCandidate.interviewQuestions && selectedCandidate.interviewQuestions.length > 0 && (
                  <button
                    onClick={() => copyToClipboard(selectedCandidate.interviewQuestions!.map((q, i) => `${i + 1}. ${q}`).join('\n\n'))}
                    className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[10px] font-semibold transition flex items-center gap-1 cursor-pointer"
                  >
                    {copiedKit ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                    {copiedKit ? 'Copied All' : 'Copy All'}
                  </button>
                )}
              </div>

              {selectedCandidate.interviewQuestions && selectedCandidate.interviewQuestions.length > 0 ? (
                selectedCandidate.interviewQuestions.map((q, qIdx) => (
                  <div key={qIdx} className="p-3.5 rounded-xl bg-white/3 border border-white/5 flex flex-col gap-2 relative group hover:border-white/20 transition">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Question 0{qIdx + 1}</span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => copyToClipboard(q, qIdx)}
                          className="p-1 rounded-md text-white/40 hover:text-white hover:bg-white/10 transition cursor-pointer"
                          title="Copy Question"
                        >
                          {copiedQuestionIndex === qIdx ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                        </button>
                        <button
                          onClick={() => speechSupported && speakText(q)}
                          className="p-1 rounded-md text-white/40 hover:text-white hover:bg-white/10 transition cursor-pointer"
                          title="Read Question Aloud"
                        >
                          <Volume2 size={12} />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-white/90 leading-relaxed font-medium">
                      {q}
                    </p>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center border border-dashed border-white/10 rounded-xl text-xs text-white/40">
                  No customized interview questions generated for this profile yet. Re-run ranking to populate questions.
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-4 pr-1 min-h-0 no-scrollbar">
              {/* Social & Portfolio Links Card */}
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex flex-col gap-3">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Globe size={13} className="text-blue-400" />
                    Automated Public Sourcing
                  </h4>
                  <span className="text-[9px] text-emerald-400 font-semibold px-2 py-0.5 rounded bg-emerald-950/40 border border-emerald-500/20">Verified Profiles</span>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-1">
                  {/* GitHub */}
                  {selectedCandidate.socialLinks?.github && selectedCandidate.socialLinks.github.trim() !== '' ? (
                    <a
                      href={selectedCandidate.socialLinks.github.startsWith('http') ? selectedCandidate.socialLinks.github : `https://${selectedCandidate.socialLinks.github}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white transition flex items-center gap-2 text-xs font-medium cursor-pointer"
                    >
                      <GithubIcon size={14} className="text-white shrink-0" />
                      <div className="truncate">
                        <div className="text-[10px] text-white/40 uppercase font-bold">GitHub</div>
                        <div className="truncate text-xs font-mono">{selectedCandidate.gitHubHealth?.username || 'View Profile'}</div>
                      </div>
                      <ExternalLink size={11} className="text-white/40 ml-auto shrink-0" />
                    </a>
                  ) : (
                    <div className="p-2.5 rounded-xl bg-white/2 border border-white/5 text-white/30 flex items-center gap-2 text-xs">
                      <GithubIcon size={14} className="shrink-0" />
                      <div className="text-[10px]">GitHub Not Linked</div>
                    </div>
                  )}

                  {/* LinkedIn */}
                  {selectedCandidate.socialLinks?.linkedin && selectedCandidate.socialLinks.linkedin.trim() !== '' ? (
                    <a
                      href={selectedCandidate.socialLinks.linkedin.startsWith('http') ? selectedCandidate.socialLinks.linkedin : `https://${selectedCandidate.socialLinks.linkedin}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 rounded-xl bg-blue-950/20 hover:bg-blue-950/40 border border-blue-500/20 text-white transition flex items-center gap-2 text-xs font-medium cursor-pointer"
                    >
                      <LinkedinIcon size={14} className="text-blue-400 shrink-0" />
                      <div className="truncate">
                        <div className="text-[10px] text-blue-400/60 uppercase font-bold">LinkedIn</div>
                        <div className="truncate text-xs font-mono">View Profile</div>
                      </div>
                      <ExternalLink size={11} className="text-blue-400/40 ml-auto shrink-0" />
                    </a>
                  ) : (
                    <div className="p-2.5 rounded-xl bg-white/2 border border-white/5 text-white/30 flex items-center gap-2 text-xs">
                      <LinkedinIcon size={14} className="shrink-0" />
                      <div className="text-[10px]">LinkedIn Not Linked</div>
                    </div>
                  )}

                  {/* Portfolio */}
                  {selectedCandidate.socialLinks?.portfolio && selectedCandidate.socialLinks.portfolio.trim() !== '' ? (
                    <a
                      href={selectedCandidate.socialLinks.portfolio.startsWith('http') ? selectedCandidate.socialLinks.portfolio : `https://${selectedCandidate.socialLinks.portfolio}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white transition flex items-center gap-2 text-xs font-medium cursor-pointer col-span-2"
                    >
                      <Globe size={14} className="text-emerald-400 shrink-0" />
                      <div className="truncate">
                        <div className="text-[10px] text-white/40 uppercase font-bold">Personal Portfolio</div>
                        <div className="truncate text-xs font-mono">{selectedCandidate.socialLinks.portfolio}</div>
                      </div>
                      <ExternalLink size={11} className="text-white/40 ml-auto shrink-0" />
                    </a>
                  ) : null}
                </div>
              </div>

              {/* GitHub Repository & Project Health Check Card */}
              {Boolean(selectedCandidate.socialLinks?.github && selectedCandidate.socialLinks.github.trim() !== '' && selectedCandidate.socialLinks.github.toLowerCase() !== 'none' && selectedCandidate.gitHubHealth) ? (
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex flex-col gap-3.5">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <GitBranch size={13} className="text-purple-400" />
                      GitHub Project Health Check
                    </h4>
                    <span className="text-[10px] font-bold text-purple-400 px-2 py-0.5 rounded bg-purple-950/40 border border-purple-500/20">
                      Score: {selectedCandidate.gitHubHealth?.healthScore ?? 85}/100
                    </span>
                  </div>

                  {/* Health Score Progress Bar */}
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-[10px] text-white/60">
                      <span>Codebase & Repository Quality Rating</span>
                      <span className="font-bold text-white">{selectedCandidate.gitHubHealth?.healthScore ?? 85}%</span>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full bg-gradient-to-r from-purple-500 via-indigo-400 to-emerald-400"
                        style={{ width: `${selectedCandidate.gitHubHealth?.healthScore ?? 85}%` }}
                      />
                    </div>
                  </div>

                  {/* Commit Consistency */}
                  <div className="p-3 rounded-lg bg-white/3 border border-white/5 flex flex-col gap-1">
                    <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Commit Activity & Maintenance</span>
                    <span className="text-xs font-semibold text-white/90">
                      {selectedCandidate.gitHubHealth?.commitConsistency}
                    </span>
                  </div>

                  {/* Top Languages */}
                  {selectedCandidate.gitHubHealth?.topLanguages && selectedCandidate.gitHubHealth.topLanguages.length > 0 && (
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Primary Repo Languages</span>
                      <div className="flex flex-wrap gap-1">
                        {selectedCandidate.gitHubHealth.topLanguages.map((lang, lIdx) => (
                          <span key={lIdx} className="text-[10px] px-2 py-0.5 rounded bg-purple-950/30 text-purple-200 border border-purple-500/20 font-mono">
                            {lang}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Verified Resume Claims */}
                  {selectedCandidate.gitHubHealth?.verifiedClaims && selectedCandidate.gitHubHealth.verifiedClaims.length > 0 && (
                    <div className="flex flex-col gap-2 pt-1">
                      <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1">
                        <CheckCircle2 size={11} /> Verified Open Source Claims
                      </span>
                      <ul className="flex flex-col gap-1.5">
                        {selectedCandidate.gitHubHealth.verifiedClaims.map((claim, cIdx) => (
                          <li key={cIdx} className="flex items-start gap-2 text-xs text-white/80 bg-emerald-950/10 border border-emerald-950/20 p-2.5 rounded-lg leading-relaxed">
                            <Check size={12} className="text-emerald-400 shrink-0 mt-0.5" />
                            <span>{claim}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-5 text-center border border-dashed border-white/10 rounded-xl text-xs text-white/40 flex flex-col items-center gap-2">
                  <GithubIcon size={20} className="text-white/20" />
                  <span>No GitHub profile detected on this resume. Ingest a CV with repository links to unlock code health diagnostics.</span>
                </div>
              )}
            </div>
          )}

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

      {/* About Us Modal Overlay */}
      {aboutUsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-md liquid-glass rounded-2xl p-6 flex flex-col gap-5 relative animate-in fade-in-50 zoom-in-95 duration-200">
            <button 
              onClick={() => setAboutUsOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-lg border border-white/10 text-white/40 hover:text-white transition cursor-pointer"
            >
              <X size={14} />
            </button>
            
            <div className="flex items-center gap-2 border-b border-white/10 pb-3">
              <Info size={18} className="text-white" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">About Talento</h3>
            </div>

            <div className="flex flex-col gap-4 text-xs text-white/80 leading-relaxed">
              <p className="text-white/70">
                Talento is an intelligent, voice-first HR Applicant Tracking System (ATS) platform designed for recruiters to bulk parse candidate resumes client-side and interact with an AI recruiter co-pilot in natural English or Urdu.
              </p>
              
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex flex-col gap-2">
                <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Lead Developer</span>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm">Ammar Tahir</span>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-white/10 text-white/80 font-medium">Full-Stack AI Engineer</span>
                </div>
                <div className="flex items-center gap-2 text-white/70 mt-1 pt-2 border-t border-white/5">
                  <span className="font-medium text-white/90 text-xs">Email:</span>
                  <a href="mailto:ammartahir444@gmail.com" className="text-white hover:underline font-mono text-xs">ammartahir444@gmail.com</a>
                </div>
              </div>
            </div>

            <button 
              onClick={() => setAboutUsOpen(false)}
              className="w-full bg-white hover:bg-white/90 text-black py-2.5 rounded-xl text-xs font-bold tracking-wide uppercase transition mt-1 cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Batch Candidate Outreach Automation Modal Overlay */}
      {outreachModalOpen && selectedCandidateIds.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-2xl liquid-glass rounded-2xl p-6 flex flex-col gap-4 relative animate-in fade-in-50 zoom-in-95 duration-200 max-h-[90vh] overflow-hidden">
            <button 
              onClick={() => setOutreachModalOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-lg border border-white/10 text-white/40 hover:text-white transition cursor-pointer"
            >
              <X size={14} />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-2 border-b border-white/10 pb-3 shrink-0">
              <Mail size={18} className="text-white" />
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Candidate Outreach Automation</h3>
                <p className="text-[10px] text-white/50">Generate personalized email invitations for {selectedCandidateIds.length} shortlisted candidates</p>
              </div>
            </div>

            {/* Template Selector */}
            <div className="flex flex-col gap-1.5 shrink-0">
              <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Select Email Template</span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setOutreachTemplate('first_round')}
                  className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col gap-0.5 ${
                    outreachTemplate === 'first_round'
                      ? 'border-white bg-white/15 text-white'
                      : 'border-white/5 bg-white/3 text-white/60 hover:border-white/20'
                  }`}
                >
                  <span className="text-xs font-bold">First-Round Interview</span>
                  <span className="text-[9px] text-white/40">Schedule 1-on-1 discussion</span>
                </button>
                <button
                  onClick={() => setOutreachTemplate('tech_screen')}
                  className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col gap-0.5 ${
                    outreachTemplate === 'tech_screen'
                      ? 'border-white bg-white/15 text-white'
                      : 'border-white/5 bg-white/3 text-white/60 hover:border-white/20'
                  }`}
                >
                  <span className="text-xs font-bold">Tech Screening</span>
                  <span className="text-[9px] text-white/40">Technical architecture review</span>
                </button>
                <button
                  onClick={() => setOutreachTemplate('rejection')}
                  className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col gap-0.5 ${
                    outreachTemplate === 'rejection'
                      ? 'border-white bg-white/15 text-white'
                      : 'border-white/5 bg-white/3 text-white/60 hover:border-white/20'
                  }`}
                >
                  <span className="text-xs font-bold">Talent Pool Update</span>
                  <span className="text-[9px] text-white/40">Keep in future network</span>
                </button>
              </div>
            </div>

            {/* Candidate Tab Selection Pill Bar */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 shrink-0 no-scrollbar">
              {selectedCandidateIds.map((id) => {
                const c = candidates.find(item => item.id === id);
                if (!c) return null;
                const isSelected = (selectedOutreachCandidateId || selectedCandidateIds[0]) === id;
                return (
                  <button
                    key={id}
                    onClick={() => setSelectedOutreachCandidateId(id)}
                    className={`px-3 py-1 rounded-full text-xs font-medium shrink-0 transition cursor-pointer ${
                      isSelected
                        ? 'bg-white text-black font-bold'
                        : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {c.name}
                  </button>
                );
              })}
            </div>

            {/* Selected Candidate Active Draft Box */}
            {(() => {
              const activeId = selectedOutreachCandidateId || selectedCandidateIds[0];
              const candidate = candidates.find(c => c.id === activeId);
              if (!candidate) return null;

              const { candidateEmail, subject, body } = generateOutreachEmail(candidate, outreachTemplate);

              return (
                <div className="flex-1 flex flex-col gap-3 min-h-0 overflow-y-auto pr-1 no-scrollbar">
                  <div className="p-3.5 rounded-xl bg-white/3 border border-white/5 flex flex-col gap-2.5">
                    <div className="flex items-center justify-between text-xs border-b border-white/5 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-white/40 uppercase">To:</span>
                        <span className="font-mono text-white/90">{candidateEmail}</span>
                      </div>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border border-white/5 ${getScoreColor(candidate.atsScore)}`}>
                        {candidate.atsScore}% Fit
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-[10px] font-bold text-white/40 uppercase">Subject:</span>
                      <span className="font-medium text-white">{subject}</span>
                    </div>

                    <div className="mt-1 pt-2 border-t border-white/5">
                      <textarea
                        readOnly
                        value={body}
                        rows={7}
                        className="w-full glass-input rounded-xl p-3 text-xs leading-relaxed resize-none font-mono text-white/80"
                      />
                    </div>
                  </div>

                  {/* Actions for active candidate */}
                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={`mailto:${candidateEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-2.5 rounded-xl bg-white text-black font-bold text-xs hover:bg-white/90 transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                    >
                      <Send size={13} />
                      Open Mail Client (`mailto:`)
                    </a>

                    <button
                      onClick={() => {
                        copyToClipboard(`Subject: ${subject}\n\n${body}`);
                        setCopiedDraft(true);
                        setTimeout(() => setCopiedDraft(false), 2000);
                      }}
                      className="px-4 py-2.5 rounded-xl border border-white/10 text-xs font-semibold text-white hover:bg-white/5 transition flex items-center gap-1.5 cursor-pointer"
                    >
                      {copiedDraft ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                      {copiedDraft ? 'Copied' : 'Copy Single Draft'}
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Footer Bulk Copy */}
            <div className="border-t border-white/10 pt-3 flex justify-between items-center shrink-0">
              <span className="text-[10px] text-white/40">Ready for CRM / ATS Email Dispatch</span>
              <button
                onClick={() => {
                  const allDrafts = selectedCandidateIds.map(id => {
                    const c = candidates.find(item => item.id === id);
                    if (!c) return '';
                    const { candidateEmail, subject, body } = generateOutreachEmail(c, outreachTemplate);
                    return `TO: ${c.name} <${candidateEmail}>\nSUBJECT: ${subject}\n\n${body}\n----------------------------------------`;
                  }).join('\n\n');
                  
                  copyToClipboard(allDrafts);
                  setCopiedBatch(true);
                  setTimeout(() => setCopiedBatch(false), 2000);
                }}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
              >
                {copiedBatch ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                {copiedBatch ? 'Copied All Batch Drafts!' : `Copy All (${selectedCandidateIds.length}) Drafts`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
