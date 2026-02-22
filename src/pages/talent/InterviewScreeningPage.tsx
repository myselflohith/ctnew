import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const getQuestionText = (q: any) => q?.text || q?.label || q?.question || '';
const getQuestionId = (q: any) => q?.id ?? q?.question_id ?? null;

const PRACTICE_DEFAULT_QUESTIONS = [
  { id: -1, text: 'Tell me about yourself and what you are looking for in your next role.' },
  { id: -2, text: 'What are your strongest technical skills, and why?' },
  { id: -3, text: 'Describe a challenging problem you solved recently and how you approached it.' },
];

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
  const [isUserRegistered, setIsUserRegistered] = useState(false);
  const [isInterviewCompleted, setIsInterviewCompleted] = useState(false);
  
  const [step, setStep] = useState<'details' | 'interview'>('details');
  const [candidateName, setCandidateName] = useState('');
  const [candidateEmail, setCandidateEmail] = useState('');
  const [emailMatchError, setEmailMatchError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [practiceMode, setPracticeMode] = useState(false);
  const [activeMode, setActiveMode] = useState<'practice' | 'real' | null>(null);
  const [startingMode, setStartingMode] = useState<'practice' | 'real' | null>(null);
  const [interviewStartTime, setInterviewStartTime] = useState<Date | null>(null);

  // Track which button initiated the start so only that button shows loading
  const [startSource, setStartSource] = useState<'practice' | 'real' | null>(null);

  // Interview modal states
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [questions, setQuestions] = useState<any[]>([]);
  const [recording, setRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [answersByQuestion, setAnswersByQuestion] = useState<Record<number, string>>({});
  const [time, setTime] = useState(45 * 60);
  const [isComplete, setIsComplete] = useState(false);
  const [submittingResponse, setSubmittingResponse] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [aiFinishedSpeaking, setAiFinishedSpeaking] = useState(false);
  const [isLoadingVoice, setIsLoadingVoice] = useState(false);
  const speakingLockRef = useRef(false);
  const questionTokenRef = useRef(0);
  const [componentMounted, setComponentMounted] = useState(false);
  const [voicesLoaded, setVoicesLoaded] = useState(false);
  const [interviewStarted, setInterviewStarted] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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

        // Check if user is registered (has valid auth token)
        const authToken = localStorage.getItem('auth_token');
        const isRegistered = !!authToken;
        if (isRegistered) {
          setIsUserRegistered(true);
        }
        
        console.log('👤 User registered status:', isRegistered, 'Token:', authToken ? 'Present' : 'Missing');

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
          setCandidateName(data.data.candidateName || data.data.candidate_name || '');
          setCandidateEmail(data.data.candidateEmail || data.data.candidate_email || '');
          setOrganization({
            name: data.data.company || data.data.company_name || 'CardinalTalent',
          });
          
          // Set questions from API response
          if (data.data.questions && data.data.questions.length > 0) {
            // Practice mode: only show 3 questions for testing
            if (data.data.interviewType === 'Practice' || data.data.type_of_interview === 'Practice') {
              setQuestions(data.data.questions.slice(0, 3));
            } else {
              setQuestions(data.data.questions);
            }
          } else {
            // Practice mode fallback: always allow practice to run with 3 default questions
            if (data.data.interviewType === 'Practice' || data.data.type_of_interview === 'Practice') {
              setQuestions(PRACTICE_DEFAULT_QUESTIONS);
            }
          }

          // Check if interview is already completed
          if (data.data.status === 'Completed') {
            console.log('✅ Interview already completed');
            setIsInterviewCompleted(true);
          }
          
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

  // Auto-start interview for registered users
  useEffect(() => {
    if (isUserRegistered && interviewData && step === 'details') {
      console.log('� Registered user loaded - showing interview details screen');
      // Don't auto-start, let user see the details and choose practice or start
      // Just ensure we're on the details screen
    }
  }, [isUserRegistered, interviewData, step]);

  const stopMediaTracks = () => {
    if (!videoRef.current?.srcObject) return;
    const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
    tracks.forEach((track) => track.stop());
    videoRef.current.srcObject = null;
  };

  // Stop camera/mic when interview completes
  useEffect(() => {
    if (isComplete) {
      stopMediaTracks();
      console.log('📹 Camera/mic stopped after interview completion');
    }
  }, [isComplete]);

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
      stopMediaTracks();
    };
  }, [step]);

  // Auto-read question when it loads (like ch-job-marketplace)
  useEffect(() => {
    if (interviewStarted && voicesLoaded && questions[currentQuestion]) {
      // While AI is asking the question, user should not be able to record.
      setAiFinishedSpeaking(false);

      // Small delay to ensure UI renders question first
      setTimeout(() => {
        const questionText = getQuestionText(questions[currentQuestion]);
        console.log('📢 Auto-reading question:', questionText);
        playAvatarSpeech(questionText);
      }, 150);
    }
  }, [currentQuestion, interviewStarted, voicesLoaded, questions.length]);

  // Timer
  useEffect(() => {
    if (step !== 'interview' || !recording || isComplete) return;
    const timer = setInterval(() => setTime(t => t - 1), 1000);
    return () => clearInterval(timer);
  }, [recording, isComplete, step]);

  // Component mount tracking
  useEffect(() => {
    setComponentMounted(true);
    return () => setComponentMounted(false);
  }, []);

  // Audio element initialization (do NOT auto-play/prime on mount)
  // Autoplay policies will block this and it creates noisy console logs.
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      console.log('🎵 Audio element initialized for screening');
    }
  }, []);

  // Speech recognition setup
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onresult = (event: any) => {
        // Build transcript from FINAL results + current interim results.
        // This avoids:
        // - losing text after pauses (browser restarts recognition)
        // - duplicating text many times (naive append)
        let finalText = '';
        let interimText = '';

        for (let i = 0; i < event.results.length; i++) {
          const res = event.results[i];
          const chunk = (res?.[0]?.transcript || '').trim();
          if (!chunk) continue;

          if (res.isFinal) {
            finalText += (finalText ? ' ' : '') + chunk;
          } else {
            interimText += (interimText ? ' ' : '') + chunk;
          }
        }

        const combined = `${finalText}${finalText && interimText ? ' ' : ''}${interimText}`.trim();
        setTranscript(combined);
      };

      recognition.onerror = (event: any) => {
        console.warn('🎙️ Speech recognition error:', event?.error || event);
      };

      recognition.onend = () => {
        // Some browsers stop recognition automatically after a short time.
        // If we are still recording, restart it so transcript keeps updating.
        if (recording) {
          try {
            recognition.start();
          } catch (e) {
            // ignore "already started" errors
          }
        }
      };

      recognitionRef.current = recognition;
    } else {
      console.warn('🎙️ SpeechRecognition not supported in this browser');
    }

    // Check if Speech Synthesis voices are loaded
    if ('speechSynthesis' in window) {
      if (window.speechSynthesis.getVoices().length !== 0) {
        setVoicesLoaded(true);
      } else {
        window.speechSynthesis.onvoiceschanged = () => {
          setVoicesLoaded(true);
        };
      }
    }
  }, [recording]);

  // Prepend intro text to first question (like ch-job-marketplace)
  // IMPORTANT: questions can come as {label: "..."} (from fetch_questions) or {text: "..."} (practice defaults).
  useEffect(() => {
    if (questions.length === 0) return;

    const first = questions[0];
    const firstText = getQuestionText(first);
    if (!firstText) return;

    if (firstText.includes('Hello! I am Mary')) return;

    const updatedQuestions = [...questions];
    if (updatedQuestions[0]?.text !== undefined) {
      updatedQuestions[0].text =
        'Hello! I am Mary, AI Interviewer. Welcome, excited to get to know you. ' + firstText;
    } else {
      updatedQuestions[0] = {
        ...updatedQuestions[0],
        label: 'Hello! I am Mary, AI Interviewer. Welcome, excited to get to know you. ' + firstText,
      };
    }
    setQuestions(updatedQuestions);
    console.log('📝 Intro text prepended to first question');
  }, [questions.length]);

  // Play AI voice for questions and messages (match ch-job-marketplace behavior)
  // Guarantees:
  // - Only one question is spoken at a time (lock)
  // - If a new question arrives, old speech is ignored (token)
  const playAvatarSpeech = async (text: string) => {
    if (!text || !componentMounted) {
      setIsLoadingVoice(false);
      setIsAiSpeaking(false);
      setAiFinishedSpeaking(true);
      return;
    }

    // If already speaking/loading, ignore new requests (one-at-a-time)
    if (speakingLockRef.current) return;
    speakingLockRef.current = true;

    // Token to ignore stale callbacks
    const myToken = ++questionTokenRef.current;

    setIsLoadingVoice(true);
    setIsAiSpeaking(false);
    setAiFinishedSpeaking(false);

    const finish = () => {
      if (questionTokenRef.current !== myToken) return;
      setIsLoadingVoice(false);
      setIsAiSpeaking(false);
      setAiFinishedSpeaking(true);
      speakingLockRef.current = false;
    };

    const startSpeaking = () => {
      if (questionTokenRef.current !== myToken) return;
      setIsLoadingVoice(false);
      setIsAiSpeaking(true);
      setAiFinishedSpeaking(false);
    };

    const useWebSpeechAPI = (textToSpeak: string) => {
      try {
        if (!('speechSynthesis' in window)) {
          finish();
          return;
        }

        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.lang = 'en-US';
        utterance.rate = 1;
        utterance.pitch = 1;
        utterance.volume = 1;

        utterance.onstart = startSpeaking;
        utterance.onend = finish;
        utterance.onerror = finish;

        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
      } catch {
        finish();
      }
    };

    try {
      const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
      const authToken = localStorage.getItem('auth_token');

      const headers: any = { 'Content-Type': 'application/json' };
      if (csrfToken) headers['X-CSRF-Token'] = csrfToken;
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      const response = await fetch('/api/interviews/openai_speak', {
        method: 'POST',
        headers,
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        useWebSpeechAPI(text);
        return;
      }

      const blob = await response.blob();
      if (!blob || blob.size === 0) {
        useWebSpeechAPI(text);
        return;
      }

      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);

      audio.onplay = startSpeaking;

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        finish();
      };

      audio.onerror = () => {
        URL.revokeObjectURL(audioUrl);
        useWebSpeechAPI(text);
      };

      await audio.play();
    } catch {
      useWebSpeechAPI(text);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleStartInterview = async (source?: 'practice' | 'real') => {
    const mode: 'practice' | 'real' = source || (practiceMode ? 'practice' : 'real');
    setActiveMode(mode);
    setStartingMode(mode);
    setStartSource(source || mode);

    // IMPORTANT (per ch-job-marketplace behavior):
    // Clicking Start/Practice should immediately move to the interview screen.
    // No TTS calls, no voice loading, no extra async work here.
    setStep('interview');

    // Reset per-run state quickly
    setIsComplete(false);
    setRecording(false);
    setSubmittingResponse(false);
    setCurrentQuestion(0);
    setTranscript('');
    setAnswersByQuestion({});
    setInterviewStarted(false);

    if (mode === 'practice') {
      setPracticeMode(true);
      setQuestions(PRACTICE_DEFAULT_QUESTIONS);
    } else {
      setPracticeMode(false);

      // Real interview MUST have questions from backend.
      // If invite API didn't include them, fetch them now.
      let realQuestions = questions;

      // Always fetch real questions on start to ensure we use the latest created questions
      // (invite payload can be stale / missing questions depending on how the invite was generated)
      try {
        const interviewId = interviewData?.interviewId || interviewData?.interview_id;
        const inviteId = interviewData?.inviteId || interviewData?.invite_id;

        if (interviewId && inviteId) {
          const qRes = await fetch(`/api/interviews/fetch_questions/${interviewId}/${inviteId}`);
          const qJson = await qRes.json();

          if (qRes.ok && qJson?.success && Array.isArray(qJson.questions) && qJson.questions.length > 0) {
            realQuestions = qJson.questions;
          } else {
            console.warn('No questions returned from fetch_questions:', qJson);
          }
        }
      } catch (e) {
        console.warn('Failed to fetch real interview questions:', e);
      }

      if (!realQuestions || realQuestions.length === 0) {
        toast.error('No interview questions found. Please contact support or ask the employer to add questions.');
        // Keep UI on interview screen but show a clear fallback question instead of misleading "Tell me about yourself"
        realQuestions = [{ id: -999, text: 'No interview questions were found for this interview.' }];
      } else {
        // Normalize backend shape ({label}) to UI shape ({text}) so getQuestionText always works
        realQuestions = realQuestions.map((q: any) => ({
          ...q,
          text: q?.text ?? q?.label ?? q?.question ?? '',
        }));
      }

      setQuestions(realQuestions);
    }

    // Trigger question speaking via the existing effect once UI is on interview screen
    setTimeout(() => {
      setInterviewStarted(true);
    }, 0);

    // Clear button loading state
    setSubmitting(false);
    setStartingMode(null);
    setStartSource(null);
  };


  const startRecording = () => {
    if (!videoRef.current?.srcObject) return;
    const stream = videoRef.current.srcObject as MediaStream;

    // Prefer a mimeType that most browsers support and that our backend expects.
    const preferredMime = 'video/webm;codecs=vp8,opus';
    const options: MediaRecorderOptions = MediaRecorder.isTypeSupported(preferredMime)
      ? { mimeType: preferredMime }
      : {};

    const mediaRecorder = new MediaRecorder(stream, options);

    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start();
    setRecording(true);

    // Record interview start time on first question
    if (currentQuestion === 0 && !interviewStartTime) {
      setInterviewStartTime(new Date());
    }

    // Reset transcript for this question
    setTranscript('');

    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
        console.log('🎙️ Speech recognition started');
      } catch (e) {
        console.warn('Speech recognition start failed (already started?)', e);
      }
    }
  };

  const submitInterview = async () => {
    try {
      // Only submit if NOT practice mode
      if (practiceMode) {
        console.log('ℹ️ Practice mode - skipping submission');
        return;
      }

      setSubmittingResponse(true);
      
      const authToken = localStorage.getItem('auth_token');
      if (!authToken) {
        console.error('No auth token found');
        setError('Authentication required');
        return;
      }

      const resolvedInterviewId = interviewData?.interviewId || interviewData?.interview_id;
      const resolvedInviteId =
        interviewData?.inviteId || interviewData?.invite_id || interviewData?.ai_interview_invite_id;

      const response = await fetch(`/api/interviews/${resolvedInterviewId}/submit_report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          ai_interview_invite_id: resolvedInviteId,
          interview_start_at: interviewStartTime?.toISOString(),
          transcript_text: Object.entries(answersByQuestion)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([idx, ans]) => `Q${Number(idx) + 1}: ${getQuestionText(questions[Number(idx)])}\nA: ${ans}`)
            .join('\n\n'),
          report_details: questions.map((q, idx) => ({
            question: getQuestionText(q),
            transcript_text: answersByQuestion[idx] || '',
            que_type: practiceMode ? 'practice' : 'regular',
          })),
        }),
      });

      const result = await response.json();
      if (response.ok) {
        console.log('✅ Interview submitted successfully');
      } else {
        console.error('Failed to submit interview:', result);
      }
    } catch (error) {
      console.error('Error submitting interview:', error);
    } finally {
      setSubmittingResponse(false);
    }
  };

  const stopRecording = async () => {
    if (!mediaRecorderRef.current) return;

    const recorder = mediaRecorderRef.current;

    // Capture transcript immediately to avoid stale state in async callbacks
    const capturedTranscript = transcript;

    // Capture question metadata now (before currentQuestion changes)
    const q = questions[currentQuestion];
    const questionText = getQuestionText(q);
    const questionId = getQuestionId(q);

    // Collect the recorded video blob
    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (e: any) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };

    const stopped = new Promise<Blob>((resolve) => {
      recorder.onstop = () => {
        const mimeType = recorder.mimeType || 'video/webm';
        resolve(new Blob(chunks, { type: mimeType }));
      };
    });

    recorder.stop();
    if (recognitionRef.current) recognitionRef.current.stop();

    setRecording(false);
    setSubmittingResponse(true);

    const videoBlob = await stopped;

    // Persist the current answer for this question before moving on
    setAnswersByQuestion((prev) => ({
      ...prev,
      [currentQuestion]: capturedTranscript,
    }));

    // For REAL interviews:
    // 1) Save transcript text (answer endpoint)
    // 2) Upload video blob (upload_video endpoint) so video is stored per question
    if (!practiceMode) {
      try {
        const authToken = localStorage.getItem('auth_token');
        const resolvedInterviewId = interviewData?.interviewId || interviewData?.interview_id;
        const resolvedInviteId =
          interviewData?.inviteId || interviewData?.invite_id || interviewData?.ai_interview_invite_id;

        if (authToken && resolvedInterviewId && resolvedInviteId && questionText) {
          // Save transcript
          await fetch(`/api/interviews/${resolvedInterviewId}/answer`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${authToken}`,
            },
            body: JSON.stringify({
              ai_interview_invite_id: resolvedInviteId,
              question_id: questionId,
              question: questionText,
              transcript_text: capturedTranscript || '',
              que_type: 'general',
            }),
          });

          // Upload video
          if (videoBlob && videoBlob.size > 0) {
            const form = new FormData();
            form.append('file', videoBlob, 'response.webm');
            form.append('interview_id', String(resolvedInterviewId));
            form.append('ai_interview_invite_id', String(resolvedInviteId));
            form.append('question', questionText);
            form.append('que_type', 'general');
            form.append('transcript', capturedTranscript || '');
            if (questionId !== null && questionId !== undefined) {
              form.append('question_id', String(questionId));
            }
            form.append('question_index', String(currentQuestion));
            form.append('is_completed', currentQuestion === questions.length - 1 ? '1' : '0');

            const uploadRes = await fetch('/api/interviews/upload_video', {
              method: 'POST',
              headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
              body: form,
            });

            if (!uploadRes.ok) {
              const err = await uploadRes.json().catch(() => ({}));
              console.warn('Video upload failed:', uploadRes.status, err?.error || '');
            }
          }
        }
      } catch (e) {
        console.warn('Failed to save answer/video:', e);
      }
    }

    if (currentQuestion === questions.length - 1) {
      if (!practiceMode) {
        // Ensure the final video upload has time to update invite status/report details
        // before we submit the final report payload.
        await submitInterview();
      }
      setIsComplete(true);
    } else {
      setSubmittingResponse(false);
      setCurrentQuestion((q) => q + 1);
      setTranscript('');
    }
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
  // UNREGISTERED USER - SHOW SIGNUP PROMPT
  // ============================================================
  if (!isUserRegistered && !error && interviewData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="bg-secondary border border-border rounded-2xl p-8 max-w-md text-center space-y-6">
          <div className="flex justify-center">
            <AlertCircle className="h-12 w-12 text-cardinal" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">
            Sign Up to Take Interview
          </h2>
          <p className="text-muted-foreground">
            You need to create an account to start this interview. Sign up now or log in if you already have an account.
          </p>
          <div className="space-y-3">
            <Button 
              onClick={() => navigate(`/talent/signup?redirect=/interview/${token}`)}
              className="w-full bg-cardinal text-white hover:bg-cardinal/90"
            >
              Create Account
            </Button>
            <Button 
              onClick={() => navigate(`/auth/login?redirect=/interview/${token}`)}
              variant="outline"
              className="w-full border-cardinal text-cardinal hover:bg-cardinal/10"
            >
              Already Have Account? Login
            </Button>
          </div>
        </div>
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
      <div className="h-screen bg-background overflow-hidden flex flex-col">
        <div className="max-w-3xl mx-auto w-full h-full px-4 py-4 md:py-6 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="text-center mb-3">
            <h1 className="text-xl md:text-2xl font-display font-bold text-foreground mb-1">
              Interview Invitation
            </h1>
            <p className="text-muted-foreground text-xs">
              {organization?.name || 'CardinalTalent'}
            </p>
          </div>

          {/* Interview Details Cards */}
          <div className="grid md:grid-cols-2 gap-2 md:gap-3 mb-3">
            <div className="bg-secondary border border-border rounded-lg p-3 md:p-4 space-y-1 hover:border-cardinal/50 transition-colors">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Position</p>
              <p className="text-sm md:text-base font-bold text-foreground break-words line-clamp-2">
                {interviewData?.interviewTitle ||
                  interviewData?.jobName ||
                  interviewData?.job_name ||
                  'New Interview'}
              </p>
            </div>
            <div className="bg-secondary border border-border rounded-lg p-3 md:p-4 space-y-1 hover:border-cardinal/50 transition-colors">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Company</p>
              <p className="text-sm md:text-base font-bold text-foreground break-words line-clamp-2">
                {organization?.name || 'Company'}
              </p>
            </div>
            <div className="bg-secondary border border-border rounded-lg p-3 md:p-4 space-y-1 hover:border-cardinal/50 transition-colors">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Interview Type</p>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-cardinal flex-shrink-0"></span>
                <p className="text-sm md:text-base font-bold text-foreground break-words line-clamp-2">
                  {interviewData?.interviewType || 'Practice'}
                </p>
              </div>
            </div>
            <div className="bg-secondary border border-border rounded-lg p-3 md:p-4 space-y-1 hover:border-cardinal/50 transition-colors">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Location</p>
              <p className="text-sm md:text-base font-bold text-foreground break-words line-clamp-2">
                {interviewData?.location || 'Remote'}
              </p>
            </div>
          </div>

          {/* Guidelines Section */}
          <div className="bg-gradient-to-br from-cardinal/10 to-amber/5 border-2 border-cardinal/30 rounded-xl p-3 md:p-4 mb-3">
            <div className="flex items-start gap-2 mb-3">
              <div className="w-8 h-8 rounded-full bg-cardinal flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-sm">✓</span>
              </div>
              <div className="min-w-0">
                <h2 className="text-base md:text-lg font-bold text-foreground">Before You Start</h2>
                <p className="text-muted-foreground text-xs">Make sure you're ready</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {[
                { icon: '🔇', title: 'Quiet place', desc: 'Minimize background noise' },
                { icon: '🎤', title: 'Test microphone & camera', desc: 'Before you begin' },
                { icon: '🚫', title: 'Close distractions', desc: 'Close browsers and apps' },
                { icon: '⭐', title: 'Get scored instantly', desc: 'Receive feedback per answer' },
              ].map((item, i) => (
                <div key={i} className="flex gap-2 p-2 bg-secondary/40 border border-cardinal/20 rounded-lg hover:bg-secondary/60 hover:border-cardinal/40 transition-all group">
                  <span className="text-lg flex-shrink-0 group-hover:scale-110 transition-transform">{item.icon}</span>
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground text-xs leading-tight">{item.title}</p>
                    <p className="text-muted-foreground text-xs leading-tight">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 justify-center flex-shrink-0">
            {isInterviewCompleted ? (
              // Show completed status and report
              <div className="w-full space-y-4">
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-6 text-center">
                  <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto mb-2" />
                  <h3 className="text-lg font-bold text-foreground mb-1">Interview Completed ✅</h3>
                  <p className="text-muted-foreground text-sm mb-4">Your interview has been submitted and is being reviewed.</p>
                  
                </div>
                <Button
                  onClick={() => navigate('/talent/interviews')}
                  className="w-full bg-cardinal hover:bg-cardinal/90 text-white"
                >
                  Back to My Interviews
                </Button>
              </div>
            ) : (
              <>
                <Button
                  onClick={() => navigate('/talent/interviews')}
                  variant="outline"
                  className="border-border hover:bg-secondary text-foreground flex-1 text-sm py-2 h-auto"
                >
                  Cancel
                </Button>
                
                {/* Show Practice + Start buttons only for Actual/Generic interviews */}
                {interviewData?.type_of_interview !== 'Practice' && (
                  <Button
                    onClick={() => handleStartInterview('practice')}
                    disabled={submitting}
                    variant="outline"
                    className="border-cardinal text-cardinal hover:bg-cardinal/10 flex-1 text-xs md:text-sm py-2 h-auto"
                  >
                    {submitting && startSource === 'practice' ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        Starting...
                      </>
                    ) : (
                      'Practice Interview'
                    )}
                  </Button>
                )}
                
                <Button
                  onClick={() => handleStartInterview('real')}
                  disabled={submitting}
                  className="bg-cardinal hover:bg-cardinal/90 text-white transition-colors flex-1 text-xs md:text-sm py-2 h-auto"
                >
                  {submitting && startSource === 'real' ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      Starting...
                    </>
                  ) : (
                    interviewData?.type_of_interview === 'Practice' ? 'Start Practice Interview' : 'Start Interview'
                  )}
                </Button>
              </>
            )}
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
            <div className="relative mb-6 flex items-center justify-center">
              {/* Avatar Image - switches between PNG and GIF when speaking */}
              <div className={`relative w-64 h-64 rounded-full overflow-hidden flex items-center justify-center transition-all duration-200 ${
                isAiSpeaking ? 'border-4 border-cardinal' : 'border-2 border-cardinal/30'
              }`}>
                {isAiSpeaking ? (
                  <img 
                    src="/images/aiinterview.gif" 
                    alt="AI Speaking" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <img 
                    src="/images/aiinterview.png" 
                    alt="AI Interview Assistant" 
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
            </div>
            
            {/* Status Indicator */}
            <div className="text-center">
              <p className="font-semibold text-foreground mb-2">
                {isAiSpeaking ? '🔊 Mary is speaking...' : isLoadingVoice ? 'Loading voice...' : 'Ready to listen'}
              </p>
              <img 
                src="/images/Cardinal_Hire_white.png" 
                alt="Cardinal Logo" 
                className="w-20 h-20 object-contain opacity-70 mx-auto"
              />
            </div>
          </div>

          {/* Question & Response Section */}
          <div className="lg:col-span-1 space-y-6">
            {/* Question Card */}
            <div className="bg-secondary border-l-4 border-cardinal rounded-lg p-6">
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                Question {currentQuestion + 1} of {questions.length}
              </p>
              <h3 className="text-lg font-bold text-foreground">
                {getQuestionText(questions[currentQuestion]) || 'Loading question...'}
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
              {/* Only show record controls after AI finishes asking the question */}
              {aiFinishedSpeaking ? (
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
              ) : (
                <Button disabled variant="outline" className="min-w-40">
                  {isLoadingVoice ? 'Loading voice...' : isAiSpeaking ? 'AI Speaking...' : 'Preparing question...'}
                </Button>
              )}
            </>
          ) : (
            <div className="text-center space-y-4">
              <CheckCircle2 className="h-16 w-16 text-amber mx-auto" />
              <h2 className="text-2xl font-bold text-foreground">Interview Complete!</h2>
              <p className="text-muted-foreground">
                Thanks for giving the interview. Your responses have been submitted successfully.
              </p>
              <Button
                onClick={() => {
                  stopMediaTracks();
                  navigate('/talent/interviews');
                }}
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
