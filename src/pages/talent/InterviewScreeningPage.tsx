import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

// ============================================================
// INTERVIEW INVITATION PAGE - Shows details and verification
// ============================================================
const InterviewScreeningPage = () => {
  const { token } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [interviewData, setInterviewData] = useState<any>(null);
  const [organization, setOrganization] = useState<any>(null);
  
  const [step, setStep] = useState<'details' | 'interview'>('details');
  const [candidateName, setCandidateName] = useState('');
  const [candidateEmail, setCandidateEmail] = useState('');
  const [emailMatchError, setEmailMatchError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Interview modal states
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [questions, setQuestions] = useState<any[]>([
    { id: 1, text: 'Tell me about yourself' },
    { id: 2, text: 'What are your strengths?' },
    { id: 3, text: 'Why do you want this position?' },
    { id: 4, text: 'How do you handle challenges?' },
    { id: 5, text: 'What are your career goals?' },
  ]);
  const [recording, setRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [time, setTime] = useState(45 * 60);
  const [isComplete, setIsComplete] = useState(false);
  const [submittingResponse, setSubmittingResponse] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<any>(null);

  // Load interview data from token
  useEffect(() => {
    let isActive = true;
    const timeout = setTimeout(() => {
      if (isActive && loading) {
        console.log('⏱️ Request timeout - setting error state');
        setError('Interview invitation not found or has expired. Please check your email link and try again.');
        setLoading(false);
      }
    }, 5000);

    const fetchData = async () => {
      try {
        console.log('🔍 Attempting to fetch interview with token:', token);
        
        if (!token) {
          if (isActive) {
            console.log('❌ No token provided');
            setError('Interview invitation not found or has expired. Please check your email link and try again.');
            setLoading(false);
          }
          return;
        }

        console.log('📡 Calling API endpoint: /api/interviews/public/by-link/' + token);
        const response = await fetch(`/api/interviews/public/by-link/${token}`);
        
        console.log('📊 API Response Status:', response.status);
        const data = await response.json();
        console.log('📦 API Response Data:', data);
        
        if (!isActive) return;

        if (!response.ok || !data.success) {
          console.log('❌ API returned error:', data);
          setError('Interview invitation not found or has expired. Please check your email link and try again.');
          setLoading(false);
          clearTimeout(timeout);
          return;
        }

        if (data.data) {
          console.log('✅ Successfully loaded interview:', data.data);
          setInterviewData(data.data);
          setCandidateName(data.data.candidateName || '');
          setCandidateEmail(data.data.candidateEmail || '');
          setOrganization({
            name: data.data.company || 'CardinalTalent',
          });
          setLoading(false);
          clearTimeout(timeout);
        }
      } catch (error) {
        console.error('❌ Error fetching interview:', error);
        if (isActive) {
          setError('Interview invitation not found or has expired. Please check your email link and try again.');
          setLoading(false);
        }
      }
    };

    fetchData();
    
    return () => {
      isActive = false;
      clearTimeout(timeout);
    };
  }, [token]);

  // Interview modal setup
  // Initialize webcam
  useEffect(() => {
    if (step !== 'interview') return;
    
    const initWebcam = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch (error) {
        console.error('Error accessing webcam:', error);
      }
    };

    initWebcam();

    return () => {
      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, [step]);

  // Timer
  useEffect(() => {
    if (step !== 'interview' || !recording || isComplete) return;
    const timer = setInterval(() => setTime(t => t - 1), 1000);
    return () => clearInterval(timer);
  }, [recording, isComplete, step]);

  // Speech recognition setup
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.onresult = (event: any) => {
        let text = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          text += event.results[i][0].transcript;
        }
        setTranscript(text);
      };
      recognitionRef.current = recognition;
    }
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleStartInterview = () => {
    if (!candidateName.trim() || !candidateEmail.trim()) {
      setEmailMatchError(true);
      return;
    }
    if (candidateEmail !== interviewData?.candidateEmail) {
      setEmailMatchError(true);
      return;
    }
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setStep('interview');
    }, 500);
  };

  const startRecording = () => {
    if (!videoRef.current?.srcObject) return;
    const stream = videoRef.current.srcObject as MediaStream;
    const mediaRecorder = new MediaRecorder(stream);
    
    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start();
    setRecording(true);
    
    if (recognitionRef.current) recognitionRef.current.start();
  };

  const stopRecording = async () => {
    if (!mediaRecorderRef.current) return;
    mediaRecorderRef.current.stop();
    if (recognitionRef.current) recognitionRef.current.stop();
    setRecording(false);
    setSubmittingResponse(true);

    setTimeout(() => {
      setSubmittingResponse(false);
      if (currentQuestion === questions.length - 1) {
        setIsComplete(true);
      } else {
        setCurrentQuestion(currentQuestion + 1);
        setTranscript('');
      }
    }, 1000);
  };

  // ============================================================
  // LOADING STATE
  // ============================================================
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-cardinal" />
        <p className="text-muted-foreground">Loading Interview...</p>
      </div>
    );
  }

  // ============================================================
  // ERROR STATE
  // ============================================================
  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="bg-secondary border border-border rounded-2xl p-8 max-w-md text-center space-y-6">
          <div className="flex justify-center">
            <AlertCircle className="h-12 w-12 text-cardinal" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">
            Unable to Access Interview
          </h2>
          <p className="text-muted-foreground">{error}</p>
          <Button 
            onClick={() => navigate('/talent/interviews')}
            className="w-full bg-cardinal text-white hover:bg-cardinal/90"
          >
            Return to Home
          </Button>
        </div>
      </div>
    );
  }

  // ============================================================
  // INTERVIEW DETAILS & VERIFICATION PAGE
  // ============================================================
  if (step === 'details') {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-2">
              Interview Invitation
            </h1>
            <p className="text-muted-foreground">
              {organization?.name || 'CardinalTalent'}
            </p>
          </div>

          {/* Interview Details Cards */}
          <div className="grid md:grid-cols-2 gap-4 mb-12">
            <div className="bg-secondary border border-border rounded-xl p-6 space-y-2 hover:border-cardinal/50 transition-colors">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Position</p>
              <p className="text-xl font-bold text-foreground">
                {interviewData?.interviewTitle || 'New Interview'}
              </p>
            </div>
            <div className="bg-secondary border border-border rounded-xl p-6 space-y-2 hover:border-cardinal/50 transition-colors">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Company</p>
              <p className="text-xl font-bold text-foreground">
                {organization?.name || 'Company'}
              </p>
            </div>
            <div className="bg-secondary border border-border rounded-xl p-6 space-y-2 hover:border-cardinal/50 transition-colors">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Interview Type</p>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-cardinal"></span>
                <p className="text-xl font-bold text-foreground">
                  {interviewData?.interviewType || 'Practice'}
                </p>
              </div>
            </div>
            <div className="bg-secondary border border-border rounded-xl p-6 space-y-2 hover:border-cardinal/50 transition-colors">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Location</p>
              <p className="text-xl font-bold text-foreground">
                {interviewData?.location || 'Remote'}
              </p>
            </div>
          </div>

          {/* Verification Section */}
          <div className="bg-secondary border-2 border-l-8 border-cardinal rounded-2xl p-8 mb-8 shadow-lg shadow-cardinal/10">
            <div className="flex items-start gap-3 mb-6">
              <div className="w-1 h-8 bg-gradient-to-b from-cardinal to-amber rounded-full mt-1"></div>
              <div>
                <h2 className="text-2xl font-bold text-foreground">Verify Your Details</h2>
                <p className="text-muted-foreground text-sm mt-1">
                  Please confirm that you are the candidate invited to this interview.
                </p>
              </div>
            </div>

            <div className="space-y-6 ml-4">
              {/* Name Field */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-3">
                  Full Name *
                </label>
                <Input
                  value={candidateName}
                  onChange={(e) => {
                    setCandidateName(e.target.value);
                    setEmailMatchError(false);
                  }}
                  placeholder="Enter your full name"
                  className="bg-background border-2 border-border text-foreground placeholder:text-muted-foreground focus:border-cardinal focus:ring-1 focus:ring-cardinal/50 transition-colors"
                />
              </div>

              {/* Email Field */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-3">
                  Email Address *
                </label>
                <Input
                  value={candidateEmail}
                  onChange={(e) => {
                    setCandidateEmail(e.target.value);
                    setEmailMatchError(false);
                  }}
                  placeholder="Enter your email"
                  className="bg-background border-2 border-border text-foreground placeholder:text-muted-foreground focus:border-cardinal focus:ring-1 focus:ring-cardinal/50 transition-colors"
                />
                {!emailMatchError && candidateEmail === interviewData?.candidateEmail && (
                  <div className="mt-3 p-3 bg-amber/10 border border-amber/30 rounded-lg flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-amber flex-shrink-0" />
                    <p className="text-sm text-amber font-medium">Email matches your invitation</p>
                  </div>
                )}
                {emailMatchError && (
                  <div className="mt-3 p-3 bg-cardinal/10 border border-cardinal/30 rounded-lg flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-cardinal flex-shrink-0" />
                    <p className="text-sm text-cardinal font-medium">Please verify your details match your invitation</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Guidelines Section */}
          <div className="bg-gradient-to-br from-cardinal/10 to-amber/5 border-2 border-cardinal/30 rounded-2xl p-8 mb-8">
            <div className="flex items-start gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-cardinal flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-lg">✓</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground">Before You Start</h2>
                <p className="text-muted-foreground text-sm mt-1">Make sure you're ready for the interview</p>
              </div>
            </div>
            
            <div className="space-y-3 ml-0">
              {[
                { icon: '🔇', title: 'Find a quiet place for the interview', desc: 'Minimize background noise for clear audio' },
                { icon: '🎤', title: 'Ensure your microphone and camera are working', desc: 'Test both before you begin' },
                { icon: '🚫', title: 'Close any distracting applications', desc: 'Close browsers, messengers, and notifications' },
                { icon: '🤖', title: 'The interview will be 5 AI-generated questions', desc: 'You\'ll answer 5 questions about your experience' },
                { icon: '⭐', title: 'You\'ll receive a score and feedback for each answer', desc: 'Get instant assessment and insights' },
              ].map((item, i) => (
                <div key={i} className="flex gap-4 p-4 bg-secondary/50 border border-border/50 rounded-lg hover:border-cardinal/30 transition-all group">
                  <span className="text-2xl flex-shrink-0 group-hover:scale-110 transition-transform">{item.icon}</span>
                  <div>
                    <p className="font-semibold text-foreground">{item.title}</p>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 justify-center">
            <Button
              onClick={() => navigate('/talent/interviews')}
              variant="outline"
              className="border-border hover:bg-secondary text-foreground min-w-48"
            >
              Cancel
            </Button>
            <Button
              onClick={handleStartInterview}
              disabled={submitting}
              className="bg-cardinal hover:bg-cardinal/90 text-white transition-colors min-w-48"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Starting...
                </>
              ) : (
                'Start Interview'
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // INTERVIEW MODAL
  // ============================================================
  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 pb-6 border-b border-border">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Interview</h1>
            <p className="text-muted-foreground">{organization?.name}</p>
          </div>
          <div className="flex gap-4 text-sm">
            <div className="bg-secondary border border-border rounded-lg px-4 py-2">
              <p className="text-muted-foreground text-xs mb-1">Status</p>
              <p className="font-semibold text-foreground">{recording ? '🔴 Recording' : '⏸️ Paused'}</p>
            </div>
            <div className="bg-secondary border border-border rounded-lg px-4 py-2">
              <p className="text-muted-foreground text-xs mb-1">Time</p>
              <p className="font-semibold text-foreground">⏱️ {formatTime(time)}</p>
            </div>
            <div className="bg-secondary border border-border rounded-lg px-4 py-2">
              <p className="text-muted-foreground text-xs mb-1">Progress</p>
              <p className="font-semibold text-foreground">📊 {currentQuestion + 1}/{questions.length}</p>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-8 mb-8">
          {/* AI Avatar Section */}
          <div className="lg:col-span-1 bg-secondary border border-border rounded-2xl p-8 flex flex-col items-center justify-center min-h-96">
            <div className="w-32 h-32 rounded-full bg-cardinal/20 flex items-center justify-center text-6xl mb-4 flex-shrink-0">
              👩‍💼
            </div>
            <p className="font-semibold text-foreground text-center mb-4">AI Interview Assistant</p>
            {isSpeaking && (
              <div className="flex gap-1 items-end h-8">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="bg-cardinal rounded-full"
                    style={{
                      width: '4px',
                      height: `${8 + i * 3}px`,
                      animation: `pulse 0.6s ease-in-out infinite`,
                      animationDelay: `${i * 100}ms`,
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Question & Response Section */}
          <div className="lg:col-span-1 space-y-6">
            {/* Question Card */}
            <div className="bg-secondary border-l-4 border-cardinal rounded-lg p-6">
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                Question {currentQuestion + 1} of {questions.length}
              </p>
              <h3 className="text-lg font-bold text-foreground">
                {questions[currentQuestion]?.text || 'Tell me about yourself'}
              </h3>
            </div>

            {/* Transcript Card */}
            <div className={`bg-secondary border-2 rounded-lg p-6 min-h-48 transition-all ${recording ? 'border-cardinal bg-cardinal/10' : 'border-border'}`}>
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Your Response</p>
              <p className="text-foreground leading-relaxed">
                {transcript || <span className="text-muted-foreground italic">Waiting for your response...</span>}
              </p>
            </div>
          </div>

          {/* Webcam Section */}
          <div className="lg:col-span-1 relative bg-black rounded-2xl overflow-hidden border border-border min-h-96">
            <video 
              ref={videoRef} 
              autoPlay 
              muted 
              playsInline 
              className="w-full h-full object-cover"
            />
            {recording && (
              <div className="absolute top-4 right-4 bg-cardinal text-white px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-2 animate-pulse">
                <span className="w-2 h-2 bg-white rounded-full"></span> Recording
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-center items-center gap-4">
          {!isComplete ? (
            <>
              <Button
                onClick={() => setStep('details')}
                variant="outline"
                className="border-border hover:bg-secondary text-foreground min-w-40"
              >
                Back
              </Button>
              <Button
                onClick={recording ? stopRecording : startRecording}
                disabled={submittingResponse}
                className="bg-cardinal hover:bg-cardinal/90 text-white transition-colors min-w-40"
              >
                {submittingResponse ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    {recording ? '⏹️ Stop & Save' : '⏺️ Start Recording'}
                  </>
                )}
              </Button>
            </>
          ) : (
            <div className="text-center space-y-4">
              <CheckCircle2 className="h-16 w-16 text-amber mx-auto" />
              <h2 className="text-2xl font-bold text-foreground">Interview Complete!</h2>
              <p className="text-muted-foreground">Thank you for your time. We'll be in touch soon.</p>
              <Button
                onClick={() => navigate('/talent/interviews')}
                className="bg-cardinal hover:bg-cardinal/90 text-white transition-colors"
              >
                Done
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InterviewScreeningPage;
