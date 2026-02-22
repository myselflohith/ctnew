import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Mic,
  Square,
  Play,
  Check,
  Settings2,
  MessageSquare,
  Briefcase,
  Download,
  Mail,
  Volume2,
  AlertCircle,
  Clock,
  FileText,
  CheckCircle,
} from 'lucide-react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { apiClient } from '@/lib/api';
import { interviewsAPI } from '@/lib/api/interviews';
import { toast } from 'sonner';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
  score?: number;
  feedback?: string;
}

interface InterviewState {
  currentQuestion: number;
  totalQuestions: number;
  messages: Message[];
  isListening: boolean;
  isProcessing: boolean;
  isAiSpeaking: boolean;
  sessionStarted: boolean;
  sessionComplete: boolean;
  difficulty: 'low' | 'medium' | 'high';
  questionCount: number;
  userResponseCount: number;
}

const TalentInterviewSession = () => {
  const { interviewId, inviteId, uniqueLink } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [interviewData, setInterviewData] = useState<any>(null);
  const [inviteData, setInviteData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [candidateInfo, setCandidateInfo] = useState<any>(null);
  const [state, setState] = useState<InterviewState>({
    currentQuestion: 0,
    totalQuestions: 5,
    messages: [],
    isListening: false,
    isProcessing: false,
    isAiSpeaking: false,
    sessionStarted: false,
    sessionComplete: false,
    difficulty: 'medium',
    questionCount: 0,
    userResponseCount: 0,
  });

  const audioRef = useRef<HTMLAudioElement>(null);
  const audioRecorderRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isListeningRef = useRef(false);
  const isProcessingRef = useRef(false);
  const isSessionCompleteRef = useRef(false);
  const mountedRef = useRef(true);
  const messagesRef = useRef<Message[]>([]);
  const questionsRef = useRef<Array<{ id: number; label: string; index: number }>>([]);
  const currentQuestionIndexRef = useRef(0);
  const activeStreamsRef = useRef<MediaStream[]>([]);
  const speakingRef = useRef(false);
  const processingQuestionRef = useRef(false);

  // Fetch interview data
  useEffect(() => {
    const fetchInterviewData = async () => {
      try {
        setLoading(true);
        
        // Extract candidate info from navigation state if available
        if (location.state?.candidateInfo) {
          setCandidateInfo(location.state.candidateInfo);
        }

        // If we navigated here from InterviewScreeningPage, it may pass interviewData
        // with an explicit practice flag. Prefer that over the API's invite.interviewType.
        if (location.state?.interviewData) {
          setInterviewData((prev: any) => ({
            ...(prev || {}),
            ...(location.state.interviewData || {}),
          }));
        }
        
        // Handle public access via unique link (from email)
        if (uniqueLink && !interviewId) {
          const response = await fetch(`/api/interviews/public/by-link/${uniqueLink}`);
          if (!response.ok) {
            toast.error('Interview invitation not found or expired');
            navigate('/');
            return;
          }
          const data = await response.json();
          const invite = data.data;

          // If screening page passed an explicit type, keep it; otherwise use invite.interviewType
          const forcedType = location.state?.interviewData?.type_of_interview;

          setInterviewData({
            id: invite.interviewId,
            interview_title: invite.interviewTitle,
            interview_category: invite.interviewCategory,
            type_of_interview: forcedType || invite.interviewType,
            description: invite.description,
            job_id: invite.jobId,
            invites: [invite],
          });
          setInviteData(invite);
          return;
        }
        
        // Handle authenticated access via interviewId and inviteId
        if (interviewId) {
          const response = await interviewsAPI.getInterviewDetail(interviewId);
          setInterviewData(response.data || response);

          // Find the specific invite if provided
          if (inviteId && response.data?.invites) {
            const invite = response.data.invites.find(
              (inv: any) => inv.id.toString() === inviteId
            );
            if (invite) {
              setInviteData(invite);
            }
          } else if (response.data?.invites) {
            setInviteData(response.data.invites[0]);
          }
        }
      } catch (error) {
        console.error('Error fetching interview data:', error);
        toast.error('Failed to load interview');
        navigate('/talent/interviews');
      } finally {
        setLoading(false);
      }
    };

    fetchInterviewData();
  }, [interviewId, inviteId, navigate]);

  // Initialize audio and cleanup
  useEffect(() => {
    mountedRef.current = true;

    // Initialize audio element properly
    if (!audioRef.current) {
      audioRef.current = new Audio();
      console.log('🎵 Audio element initialized');
    }

    // Prime the audio to bypass autoplay restrictions
    if (audioRef.current) {
      audioRef.current
        .play()
        .then(() => {
          audioRef.current!.pause();
          console.log('🔊 Audio priming complete');
        })
        .catch((err) => {
          console.log('ℹ️ Audio priming skipped:', err.message);
        });
    }

    return () => {
      console.log('🧹 Cleaning up interview session...');
      mountedRef.current = false;

      // Stop all media when component unmounts
      const recorder = (window as any).currentMediaRecorder;
      if (recorder && recorder.state !== 'inactive') {
        try {
          recorder.stop();
        } catch (e) {
          console.error('Error stopping recorder:', e);
        }
      }

      // Stop any active streams (mic/camera)
      for (const s of activeStreamsRef.current) {
        try {
          s.getTracks().forEach((t) => t.stop());
        } catch (e) {
          console.warn('Failed stopping stream tracks:', e);
        }
      }
      activeStreamsRef.current = [];

      // Stop audio playback
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }

      // Stop speech synthesis
      speechSynthesis.cancel();

      if (audioRecorderRef.current) {
        audioRecorderRef.current.cleanup();
      }
    };
  }, []);

  // Sync messages to ref
  useEffect(() => {
    messagesRef.current = state.messages;
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.messages]);

  // Log when session starts
  useEffect(() => {
    console.log('📡 Session started state changed to:', state.sessionStarted);
    if (state.sessionStarted) {
      console.log('🎨 Interview chat UI should now be visible');
      console.log('🤖 AI is speaking:', state.isAiSpeaking);
    }
  }, [state.sessionStarted]);

  // Log when AI speaking state changes
  useEffect(() => {
    console.log('🔊 AI speaking state changed to:', state.isAiSpeaking);
    if (state.isAiSpeaking) {
      console.log('🎬 Avatar image should switch to GIF');
    } else {
      console.log('🖼️ Avatar image should switch to PNG');
    }
  }, [state.isAiSpeaking]);

  const handleStartSession = async () => {
    try {
      console.log('🎯 Requesting microphone permission...');
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('✅ Microphone permission granted');

      // Store the stream reference for cleanup later
      (window as any).initialAudioStream = stream;

      // Autoplay policies: ensure the first AI speech happens only after a user gesture.
      // Prime the audio element again here (inside the click handler) so QUESTION 1 speaks reliably.
      if (audioRef.current) {
        try {
          await audioRef.current.play();
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
          console.log('🔊 Audio primed from user gesture');
        } catch (e: any) {
          console.log('ℹ️ Audio prime (gesture) skipped:', e?.message || e);
        }
      }

      await startSession();
    } catch (err) {
      console.error('Microphone permission denied:', err);
      toast.error('Please allow microphone access to start the interview');
    }
  };

  const startSession = async () => {
    // IMPORTANT:
    // Use the real interview questions stored in DB (custom + generated) and persist answers.
    const isPractice = interviewData?.type_of_interview === 'Practice';

    // Determine IDs (public link flow vs authenticated flow)
    const resolvedInterviewId = Number(interviewId || interviewData?.id);
    const resolvedInviteId = Number(inviteId || inviteData?.id || inviteData?.invite_id);

    if (!resolvedInterviewId || !resolvedInviteId) {
      toast.error('Interview identifiers missing. Please reopen the interview link.');
      return;
    }

    // For real interviews, create/fetch report row
    if (!isPractice) {
      try {
        const token = localStorage.getItem('auth_token');
        await fetch(`/api/interviews/${resolvedInterviewId}/start`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ ai_interview_invite_id: resolvedInviteId }),
        });
      } catch (e) {
        console.warn('Failed to start interview report:', e);
      }
    }

    // Fetch questions from backend (already supports custom/job/generated fallback)
    setState((prev) => ({ ...prev, isProcessing: true }));
    const qRes = await fetch(`/api/interviews/fetch_questions/${resolvedInterviewId}/${resolvedInviteId}`);
    const qJson = await qRes.json().catch(() => null);

    const questions: Array<{ id: number; label: string; index: number }> = qJson?.questions || [];
    if (!Array.isArray(questions) || questions.length === 0) {
      setState((prev) => ({ ...prev, isProcessing: false }));
      toast.error('No questions found for this interview.');
      return;
    }

    questionsRef.current = questions;
    currentQuestionIndexRef.current = 0;

    const firstQuestion = questions[0]?.label || 'Tell me about yourself.';

    const welcomeMessage = `Hello! I am Mary, AI Interviewer. Welcome, excited to get to know you. QUESTION 1: ${firstQuestion}`;

    setState((prev) => ({
      ...prev,
      sessionStarted: true,
      totalQuestions: questions.length,
      currentQuestion: 0,
      messages: [{ role: 'assistant', content: welcomeMessage, timestamp: new Date() }],
      isProcessing: true,
      questionCount: 1,
    }));

    // Speak first question (guard against race conditions)
    setTimeout(async () => {
      if (!mountedRef.current) return;
      if (processingQuestionRef.current) return;
      processingQuestionRef.current = true;
      try {
        await playAvatarSpeech(welcomeMessage);
      } finally {
        processingQuestionRef.current = false;
        setState((prev) => ({ ...prev, isProcessing: false }));
      }
    }, 300);
  };

  const playAvatarSpeech = async (text: string): Promise<void> => {
    if (!text || !mountedRef.current) return;

    // Prevent overlapping speech (causes "AI speaks different question than UI")
    if (speakingRef.current) {
      try {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.src = '';
        }
      } catch {}
      speechSynthesis.cancel();
    }
    speakingRef.current = true;

    console.log('🎤 AI preparing to speak:', text.substring(0, 50) + '...');

    return new Promise(async (resolve) => {
      try {
        // Try OpenAI TTS first
        console.log('📡 Calling TTS endpoint: /api/interviews/openai_speak');
        
        const headers: any = {
          'Content-Type': 'application/json',
        };
        
        // Add CSRF token if available (from meta tag)
        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
        if (csrfToken) {
          headers['X-CSRF-Token'] = csrfToken;
          console.log('🔐 CSRF token added to headers');
        }
        
        // Add auth token from localStorage
        const token = localStorage.getItem('auth_token');
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        let ttsSuccess = false;

        try {
          const speechResponse = await fetch('/api/interviews/openai_speak', {
            method: 'POST',
            headers,
            body: JSON.stringify({ text: text }),
          });
          
          console.log('✅ TTS response received, status:', speechResponse.status);

          if (!speechResponse.ok) {
            const errorData = await speechResponse.json().catch(() => ({}));
            console.error('❌ TTS error:', errorData.error || speechResponse.statusText);
            throw new Error(errorData.error || `Speech synthesis failed: ${speechResponse.statusText}`);
          }

          const audioBlob = await speechResponse.blob();
          if (audioBlob.size === 0) {
            throw new Error('Received empty audio blob');
          }
          
          console.log('🎵 Audio generated, size:', audioBlob.size, 'bytes');
          
          const audioUrl = URL.createObjectURL(audioBlob);

          if (audioRef.current) {
            console.log('🔊 Audio element found, setting up playback...');
            
            let playbackResolved = false;

            const handlePlaybackEnd = () => {
              if (!playbackResolved) {
                console.log('✅ Audio playback finished');
                setState((prev) => ({ ...prev, isAiSpeaking: false }));
                URL.revokeObjectURL(audioUrl);
                playbackResolved = true;
                speakingRef.current = false;
                resolve();
              }
            };

            audioRef.current.onended = handlePlaybackEnd;
            audioRef.current.onerror = (e: any) => {
              console.error('❌ Audio playback error:', e);
              if (!playbackResolved) {
                setState((prev) => ({ ...prev, isAiSpeaking: false }));
                URL.revokeObjectURL(audioUrl);
                playbackResolved = true;
                // Don't resolve - let fallback try
              }
            };

            audioRef.current.src = audioUrl;
            audioRef.current.load();
            console.log('⏳ Audio loaded, attempting to play...');
            
            try {
              // Set AI speaking state BEFORE playing to show animated GIF
              setState((prev) => ({ ...prev, isAiSpeaking: true }));
              console.log('🎬 AI speaking state set to true');
              
              const playPromise = audioRef.current.play();
              if (playPromise !== undefined) {
                await playPromise;
                console.log('▶️ Audio playback started successfully');
                ttsSuccess = true;
                return; // TTS worked, don't need fallback
              }
            } catch (playErr: any) {
              console.error('❌ Audio play error:', playErr.message);
              console.log('⚠️ Will fallback to Web Speech API');
            }
          } else {
            console.error('❌ Audio ref is null!');
          }
        } catch (ttsErr) {
          console.warn('⚠️ TTS failed:', (ttsErr as Error).message);
        }

        // Fallback to Web Speech API
        console.log('🔄 Using Web Speech API for speech synthesis');
        
        // Cancel any previous utterances
        speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1;
        utterance.pitch = 1;
        utterance.volume = 1;

        let webSpeechResolved = false;

        utterance.onstart = () => {
          console.log('🔊 Web Speech started');
          setState((prev) => ({ ...prev, isAiSpeaking: true }));
        };

        utterance.onend = () => {
          if (!webSpeechResolved) {
            console.log('✅ Web Speech ended');
            setState((prev) => ({ ...prev, isAiSpeaking: false }));
            webSpeechResolved = true;
            speakingRef.current = false;
            resolve();
          }
        };

        utterance.onerror = (event: any) => {
          console.error('❌ Web Speech error:', event.error);
          if (!webSpeechResolved) {
            setState((prev) => ({ ...prev, isAiSpeaking: false }));
            webSpeechResolved = true;
            speakingRef.current = false;
            resolve();
          }
        };

        console.log('🔊 Speaking:', text.substring(0, 50) + '...');
        speechSynthesis.speak(utterance);
        
        // Safety timeout
        setTimeout(() => {
          if (!webSpeechResolved) {
            console.warn('⚠️ Web Speech timeout - resolving');
            speechSynthesis.cancel();
            setState((prev) => ({ ...prev, isAiSpeaking: false }));
            webSpeechResolved = true;
            speakingRef.current = false;
            resolve();
          }
        }, 60000);
      } catch (error) {
        console.error('❌ Error in playAvatarSpeech:', error);
        setState((prev) => ({ ...prev, isAiSpeaking: false }));
        speakingRef.current = false;
        resolve();
      }
    });
  };

  const setupVoiceDetection = async () => {
    try {
      // Simple voice detection using getUserMedia
      if (isProcessingRef.current) return;

      isListeningRef.current = true;
      setState((prev) => ({ ...prev, isListening: true }));

      // Start recording
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      activeStreamsRef.current.push(stream);

      // Some browsers require an explicit mimeType; prefer webm/opus.
      const preferredMime = 'audio/webm;codecs=opus';
      const options: MediaRecorderOptions = MediaRecorder.isTypeSupported(preferredMime)
        ? { mimeType: preferredMime }
        : {};

      const mediaRecorder = new MediaRecorder(stream, options);
      const chunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        // IMPORTANT:
        // We record with MediaRecorder (typically webm/opus), so the blob type must match.
        // Sending a mislabeled wav blob breaks server-side Whisper transcription.
        const mimeType = mediaRecorder.mimeType || 'audio/webm';
        const blob = new Blob(chunks, { type: mimeType });
        stream.getTracks().forEach((track) => track.stop());

        // If we got an empty blob, don't call transcription; show a clear message.
        if (!blob || blob.size === 0) {
          console.warn('⚠️ Empty audio blob recorded');
          setState((prev) => ({
            ...prev,
            isListening: false,
            isProcessing: false,
            messages: [
              ...prev.messages,
              { role: 'user', content: 'No speech detected.', timestamp: new Date() },
            ],
          }));
          isProcessingRef.current = false;
          return;
        }

        await processAudioRecording(blob);
      };

      mediaRecorder.start();

      // Set timeout for auto-stop after 30 seconds
      setTimeout(() => {
        if (mediaRecorder.state !== 'inactive') {
          mediaRecorder.stop();
        }
      }, 30000);

      // Expose stopper
      (window as any).currentMediaRecorder = mediaRecorder;
    } catch (error) {
      console.error('Error setting up voice detection:', error);
      toast.error('Failed to access microphone');
    }
  };

  const stopRecording = () => {
    const recorder = (window as any).currentMediaRecorder;
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
    }
  };

  const processAudioRecording = async (audioBlob: Blob) => {
    try {
      isProcessingRef.current = true;
      setState((prev) => ({
        ...prev,
        isListening: false,
        isProcessing: true,
        messages: [
          ...prev.messages,
          { role: 'user', content: 'Processing your audio...', timestamp: new Date() },
        ],
      }));

      // IMPORTANT:
      // Web Speech API cannot transcribe an existing audio blob.
      // It only works for live microphone capture. So our only reliable path is:
      // MediaRecorder -> upload blob -> server Whisper -> transcript.
      let transcript = '';

      try {
        const formData = new FormData();
        const fileName = audioBlob.type?.includes('wav') ? 'audio.wav' : 'audio.webm';
        formData.append('file', audioBlob, fileName);

        const token = localStorage.getItem('auth_token');
        const transcribeResponse = await fetch('/api/interviews/transcribe', {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
        });

        if (!transcribeResponse.ok) {
          const err = await transcribeResponse.json().catch(() => ({}));
          console.warn('❌ Transcribe failed:', transcribeResponse.status, err?.error || '');
        } else {
          const data = await transcribeResponse.json().catch(() => ({}));
          transcript = (data.text || '').trim();
        }
      } catch (apiError) {
        console.warn('❌ Transcribe request error:', apiError);
      }

      // Update message with transcription
      setState((prev) => ({
        ...prev,
        messages: prev.messages.map((msg, idx) =>
          idx === prev.messages.length - 1
            ? { ...msg, content: transcript || 'No speech detected.' }
            : msg
        ),
      }));

      if (transcript.toLowerCase().includes('end session')) {
        await completeSession();
        return;
      }

      if (transcript) {
        await getAIResponse(transcript);
      } else {
        isProcessingRef.current = false;
        setState((prev) => ({ ...prev, isProcessing: false }));
        toast.error('Could not transcribe audio. Please try again.');
      }
    } catch (error) {
      console.error('Error processing audio:', error);
      isProcessingRef.current = false;
      setState((prev) => ({ ...prev, isProcessing: false }));
      toast.error('Failed to process audio');
    }
  };

  const getAIResponse = async (userMessage: string) => {
    try {
      const isPractice = interviewData?.type_of_interview === 'Practice';
      const resolvedInterviewId = Number(interviewId || interviewData?.id);
      const resolvedInviteId = Number(inviteId || inviteData?.id || inviteData?.invite_id);

      const questions = questionsRef.current || [];
      const currentIndex = currentQuestionIndexRef.current;
      const currentQ = questions[currentIndex];
      const currentQuestionText = currentQ?.label || state.messages[state.messages.length - 1]?.content || '';

      // Persist answer for real interviews (practice should not store)
      if (!isPractice && resolvedInterviewId && resolvedInviteId) {
        try {
          const token = localStorage.getItem('auth_token');
          await fetch(`/api/interviews/${resolvedInterviewId}/answer`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
              ai_interview_invite_id: resolvedInviteId,
              question_id: currentQ?.id,
              question: currentQuestionText.replace(/^QUESTION\s*\d+\s*:\s*/i, '').trim(),
              transcript_text: userMessage,
              question_weight: undefined,
              que_type: 'general',
            }),
          });
        } catch (e) {
          console.warn('Failed to save answer:', e);
        }
      }

      // Replace the placeholder "Processing your audio..." with the real transcript.
      // If the placeholder isn't present (edge cases), append a new user message.
      setState((prev) => {
        const last = prev.messages[prev.messages.length - 1];
        const hasPlaceholder =
          last?.role === "user" && last?.content === "Processing your audio...";

        if (hasPlaceholder) {
          return {
            ...prev,
            messages: prev.messages.map((msg, idx) =>
              idx === prev.messages.length - 1 ? { ...msg, content: userMessage } : msg
            ),
          };
        }

        return {
          ...prev,
          messages: [...prev.messages, { role: "user", content: userMessage, timestamp: new Date() }],
        };
      });

      // Move to next question (no mocked chat)
      const nextIndex = currentIndex + 1;
      if (nextIndex >= questions.length) {
        await completeSession();
        return;
      }

      currentQuestionIndexRef.current = nextIndex;

      const nextQuestion = questions[nextIndex]?.label || 'Tell me about yourself.';
      const nextQuestionNumber = nextIndex + 1;

      const assistantText = `QUESTION ${nextQuestionNumber}: ${nextQuestion}`;

      setState((prev) => ({
        ...prev,
        currentQuestion: nextIndex,
        questionCount: nextQuestionNumber,
        userResponseCount: prev.userResponseCount + 1,
        messages: [...prev.messages, { role: "assistant", content: assistantText, timestamp: new Date() }],
      }));

      await new Promise((resolve) => setTimeout(resolve, 300));
      await playAvatarSpeech(assistantText);
    } catch (error) {
      console.error('Error progressing interview:', error);
      toast.error('Failed to process response');
    } finally {
      isProcessingRef.current = false;
      setState((prev) => ({ ...prev, isProcessing: false }));
    }
  };

  const stopAllMediaStreams = () => {
    try {
      console.log('🛑 Stopping all media streams...');

      // Stop media recorder if active
      const recorder = (window as any).currentMediaRecorder;
      if (recorder && recorder.state !== 'inactive') {
        recorder.stop();
        console.log('🎙️ Media recorder stopped');
      }

      // Stop any active streams (mic/camera)
      for (const s of activeStreamsRef.current) {
        try {
          s.getTracks().forEach((t) => t.stop());
        } catch (e) {
          console.warn('Failed stopping stream tracks:', e);
        }
      }
      activeStreamsRef.current = [];

      // Stop all audio tracks
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }

      // Stop speech synthesis
      speechSynthesis.cancel();
      speakingRef.current = false;
      console.log('🔊 Speech synthesis stopped');
    } catch (error) {
      console.error('Error stopping media streams:', error);
    }
  };

  const completeSession = async () => {
    try {
      setState((prev) => ({
        ...prev,
        sessionComplete: true,
        isProcessing: true,
      }));

      // Calculate scores and feedback
      const summary = `Thanks for giving the interview. Your responses have been submitted successfully.`;

      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, { role: 'assistant', content: summary }],
      }));

      // Save interview report
      // Practice interviews should NOT store anything (no reports/details).
      const isPractice = interviewData?.type_of_interview === 'Practice';
      if (!isPractice && ((interviewId && inviteId) || (uniqueLink && inviteData))) {
        await saveInterviewReport();
      } else if (isPractice) {
        // Still mark invite as completed so employer/talent UI reflects completion,
        // but do not create any report rows.
        const inviteIdToUpdate = parseInt(inviteId || inviteData?.id || inviteData?.invite_id);
        if (!isNaN(inviteIdToUpdate)) {
          try {
            const token = localStorage.getItem('auth_token');
            await fetch(`/api/interviews/invites/${inviteIdToUpdate}/status`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
              body: JSON.stringify({ status: 'Completed' }),
            });
          } catch (e) {
            console.warn('Failed to update practice invite status:', e);
          }
        }
      }

      await playAvatarSpeech(summary);
      
      // Stop all media streams after interview completes
      stopAllMediaStreams();
    } catch (error) {
      console.error('Error completing session:', error);
    } finally {
      setState((prev) => ({ ...prev, isProcessing: false }));
      // Make sure to stop media even if there's an error
      stopAllMediaStreams();
    }
  };

  const saveInterviewReport = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      
      // Extract questions and answers from conversation
      const reportDetails: any[] = [];
      
      console.log('🔍 Total messages:', state.messages.length);
      console.log('📝 Full message list:');
      state.messages.forEach((msg, idx) => {
        console.log(`[${idx}] ${msg.role}: ${msg.content.substring(0, 50)}...`);
      });
      
      // Strategy: Find assistant→user pairs (question→answer)
      // IMPORTANT: The UI inserts a placeholder user message "Processing your audio..."
      // which later gets replaced with the transcript. We must ignore placeholder/empty answers.
      for (let i = 0; i < state.messages.length - 1; i++) {
        const currentMsg = state.messages[i];
        const nextMsg = state.messages[i + 1];

        // Skip the very first assistant message (intro). The intro text starts with "Hello!"
        // and is not an interview question.
        if (
          i === 0 &&
          currentMsg.role === 'assistant' &&
          currentMsg.content.toLowerCase().includes("i'm your ai interview assistant")
        ) {
          console.log(`⏭️  Skipping intro message at index 0`);
          continue;
        }

        // Look for assistant→user pattern
        if (currentMsg.role === 'assistant' && nextMsg && nextMsg.role === 'user') {
          const question = currentMsg.content?.trim() || '';
          const answer = nextMsg.content?.trim() || '';

          // Ignore placeholder answers and empty/no-speech answers
          const answerLower = answer.toLowerCase();
          const isPlaceholder =
            answerLower.includes('processing your audio') ||
            answerLower.includes('no speech detected');

          // Only treat assistant messages that are actual interview questions as "question"
          // (the model is instructed to prefix with QUESTION N:)
          const isQuestion = /^question\s*\d+\s*[:.]/i.test(question);

          if (!isQuestion) {
            continue;
          }

          if (question.length > 3 && answer.length > 3 && !isPlaceholder) {
            reportDetails.push({
              question,
              transcript_text: answer,
              question_weight: 1, // Default weight
              que_type: interviewData?.type_of_interview === 'Practice' ? 'practice' : 'general',
            });

            console.log(`✅ Q&A Pair #${reportDetails.length}:`);
            console.log(`   Q[${i}]: ${question.substring(0, 50)}...`);
            console.log(`   A[${i + 1}]: ${answer.substring(0, 50)}...`);

            i++; // Skip the answer we just processed
          }
        }
      }

      console.log(`\n📊 Extraction complete: Found ${reportDetails.length} Q&A pairs`);

      const payload = {
        ai_interview_invite_id: parseInt(inviteId || inviteData?.id || inviteData?.invite_id),
        interview_start_at: new Date().toISOString().split('T')[0],
        transcript_text: state.messages.map((m) => `${m.role}: ${m.content}`).join('\n'),
        report_details: reportDetails,
        interview_video_url: null,
      };

      // Validate payload before submission
      if (isNaN(payload.ai_interview_invite_id)) {
        console.error('❌ Invalid invite ID:', inviteId, inviteData);
        toast.error('Invalid interview invitation data');
        return;
      }

      if (reportDetails.length === 0) {
        console.warn('⚠️  No Q&A pairs found - this might be a problem');
        // Still submit, backend will handle empty details
      }

      const interviewIdToSubmit = interviewId || interviewData?.id;
      if (!interviewIdToSubmit) {
        console.error('❌ No interview ID available for submission');
        toast.error('Interview ID missing');
        return;
      }

      console.log('\n📤 SUBMISSION PAYLOAD:');
      console.log('  Interview ID:', interviewIdToSubmit);
      console.log('  Invite ID:', payload.ai_interview_invite_id);
      console.log('  Q&A Pairs:', reportDetails.length);
      console.log('  Transcript length:', payload.transcript_text.length);

      const response = await fetch(`/api/interviews/${interviewIdToSubmit}/submit_report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('❌ Submit error response:', error);
        toast.error('Failed to save interview report');
        return;
      }

      const result = await response.json();
      console.log('✅ Interview report saved:', result);
      toast.success('Interview completed! Feedback will be generated shortly by our AI system.');
    } catch (error) {
      console.error('❌ Error saving interview report:', error);
      toast.error('Failed to save interview report');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-muted-foreground">Loading interview...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/talent/interviews')}
            className="mb-4"
          >
            ← Back to Interviews
          </Button>
          <h1 className="text-3xl font-bold mb-2">
            {interviewData?.interview_title || 'Practice Interview'}
          </h1>
          <div className="flex items-center gap-4">
            <Badge>{state.difficulty === 'low' ? 'Entry Level' : state.difficulty === 'medium' ? 'Professional' : 'Advanced'}</Badge>
            <span className="text-sm text-muted-foreground">
              {state.questionCount}/{state.totalQuestions} Questions
            </span>
          </div>
        </div>

        {/* Main Interview Area */}
        <Card className="mb-8">
          <div className="p-8">
            {!state.sessionStarted ? (
              // Welcome Screen
              <div className="text-center py-12">
                {/* AI Avatar Preview on Welcome Screen */}
                <div className="mb-8 flex justify-center">
                  <div className="relative" style={{ width: '200px', height: '200px' }}>
                    <img 
                      src="/images/aiinterview.png" 
                      alt="AI Interviewer Preview"
                      className="rounded-lg shadow-lg w-full h-full object-cover"
                      style={{ 
                        borderRadius: '12px',
                        border: '4px solid white',
                        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)'
                      }}
                      onLoad={() => console.log('✅ Welcome screen AI avatar loaded')}
                      onError={(e) => console.error('❌ Welcome screen avatar failed to load:', e)}
                    />
                  </div>
                </div>
                <h2 className="text-2xl font-bold mb-4">Meet Your AI Interviewer</h2>
                <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
                  This is a practice interview session. You'll be asked {state.totalQuestions} questions
                  by your AI interviewer, who will listen to your answers, provide scores, and give helpful feedback. 
                  The AI will speak to you throughout the interview - just click "Start Interview" and allow microphone access.
                </p>

                <div className="mb-8 space-y-4">
                  <div>
                    <label className="text-sm font-medium">Interview Difficulty</label>
                    <select
                      value={state.difficulty}
                      onChange={(e) =>
                        setState((prev) => ({
                          ...prev,
                          difficulty: e.target.value as any,
                        }))
                      }
                      className="mt-2 w-full max-w-xs px-4 py-2 rounded-lg border border-input"
                    >
                      <option value="low">Entry Level</option>
                      <option value="medium">Professional</option>
                      <option value="high">Advanced</option>
                    </select>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-4">
                  <div className="flex gap-4 justify-center">
                    <Button
                      size="lg"
                      onClick={handleStartSession}
                      className="bg-gradient-to-r from-cardinal to-amber"
                    >
                      <Mic className="w-4 h-4 mr-2" />
                      Start Interview
                    </Button>
                    
                    {/* Test Audio Button with AI Speech */}
                    <Button
                      size="lg"
                      onClick={() => playAvatarSpeech("Hello! This is a test of the AI audio system. If you can hear this message clearly, the audio is working correctly and you're ready to start the interview.")}
                      variant="outline"
                      className="border-2 border-blue-400 hover:bg-blue-50"
                    >
                      <Volume2 className="w-4 h-4 mr-2 text-blue-600" />
                      <span className="text-blue-600">Test AI Voice</span>
                    </Button>
                  </div>
                  
                  {/* Audio Test Helper Text */}
                  <p className="text-xs text-muted-foreground px-4">
                    💡 Click "Test AI Voice" first to verify the AI's voice and your speakers are working
                  </p>
                </div>
              </div>
            ) : (
              // Interview Chat
              <div className="space-y-6">
                {/* AI Avatar with voice indicator */}
                <div className="flex justify-center mb-6">
                  <div className="relative" style={{ width: '240px', height: '240px' }}>
                    <img 
                      key={state.isAiSpeaking ? 'gif' : 'png'}
                      src={state.isAiSpeaking ? '/images/aiinterview.gif' : '/images/aiinterview.png'}
                      alt="AI Interviewer"
                      className="rounded-lg shadow-lg w-full h-full object-cover"
                      style={{ 
                        borderRadius: '12px',
                        border: '4px solid white',
                        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
                        transition: 'all 0.3s ease',
                        transform: state.isAiSpeaking ? 'scale(1.02)' : 'scale(1)',
                      }}
                      onLoad={() => console.log('✅ Avatar image loaded:', state.isAiSpeaking ? 'gif' : 'png')}
                      onError={(e) => console.error('❌ Avatar image failed to load:', e)}
                    />
                    {/* Speaking Indicator Ring */}
                    {state.isAiSpeaking && (
                      <div 
                        className="absolute inset-0 rounded-lg"
                        style={{
                          border: '3px solid #ff6b35',
                          boxShadow: '0 0 15px rgba(255, 107, 53, 0.6)',
                          animation: 'pulse 1.5s ease-in-out infinite',
                          borderRadius: '12px',
                        }}
                      />
                    )}
                  </div>
                  
                  {/* AI Status Text */}
                  <div className="absolute mt-64">
                    {state.isAiSpeaking && (
                      <div className="flex items-center gap-2 text-sm font-medium text-amber-600 animate-pulse">
                        <span className="w-2 h-2 bg-amber-600 rounded-full animate-pulse"></span>
                        AI is speaking...
                      </div>
                    )}
                    {state.isProcessing && !state.isAiSpeaking && (
                      <div className="flex items-center gap-2 text-sm font-medium text-blue-600 animate-pulse">
                        <span className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></span>
                        Loading...
                      </div>
                    )}
                  </div>
                </div>

                {/* Messages */}
                <div className="bg-secondary/30 rounded-lg p-6 space-y-4 max-h-96 overflow-y-auto">
                  {state.messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex ${
                        msg.role === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-xs px-4 py-2 rounded-lg ${
                          msg.role === 'user'
                            ? 'bg-cardinal text-white'
                            : 'bg-secondary text-foreground'
                        }`}
                      >
                        <p className="text-sm">{msg.content}</p>
                        {msg.score && (
                          <Badge className="mt-2" variant="outline">
                            Score: {msg.score}/10
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                  {state.isProcessing && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <div className="w-2 h-2 bg-cardinal rounded-full animate-bounce" />
                      <p className="text-sm">Processing response...</p>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Controls */}
                {!state.sessionComplete && (
                  <div className="flex gap-4 justify-center">
                    {/* Hide listen/submit controls while AI is speaking to prevent overlap */}
                    {!state.isAiSpeaking && (
                      <>
                        {!state.isListening ? (
                          <Button
                            onClick={setupVoiceDetection}
                            disabled={state.isProcessing}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Mic className="w-4 h-4 mr-2" />
                            Start Listening
                          </Button>
                        ) : (
                          <Button
                            onClick={stopRecording}
                            disabled={state.isProcessing}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            <Square className="w-4 h-4 mr-2" />
                            Stop & Submit
                          </Button>
                        )}
                      </>
                    )}

                    {state.isAiSpeaking && (
                      <Button disabled variant="outline">
                        <Volume2 className="w-4 h-4 mr-2 animate-pulse" />
                        AI Speaking...
                      </Button>
                    )}
                  </div>
                )}

                {/* Complete Button */}
                {state.sessionComplete && (
                  <div className="text-center space-y-4">
                    <div className="p-6 bg-green-50 rounded-lg border border-green-200 mb-4">
                      <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
                      <h3 className="text-lg font-semibold text-green-900 mb-2">Interview Complete!</h3>
                      <p className="text-green-800">
                        Thanks for giving the interview. Your responses have been submitted successfully.
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <Button
                        onClick={() => navigate('/talent/interviews')}
                        className="bg-gradient-to-r from-green-600 to-emerald-600"
                      >
                        <Check className="w-4 h-4 mr-2" />
                        Return to Interviews
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>

        {/* Info Card */}
        <Card className="bg-blue-50 border-blue-200">
          <div className="p-6 flex gap-4">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-1">Tips for Success</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>🎤 <strong>Microphone:</strong> Make sure your microphone is working - the AI listens to your voice</li>
                <li>🔊 <strong>Audio:</strong> Keep your speakers on so you can hear the AI interviewer's questions</li>
                <li>💬 <strong>Speak clearly:</strong> Speak at a natural pace and be specific with examples</li>
                <li>⏱️ <strong>Take your time:</strong> There's no rush - the AI will wait for your complete answer</li>
                <li>📝 <strong>Feedback:</strong> You'll receive scores and feedback after each answer</li>
                {!state.sessionStarted && (
                  <li>🧪 <strong>Test first:</strong> Click "Test Audio" to verify sound is working before starting</li>
                )}
              </ul>
            </div>
          </div>
        </Card>
      </div>

      <audio ref={audioRef} />
      
      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.7;
            transform: scale(1.05);
          }
        }
      `}</style>
    </div>
  );
};

export default TalentInterviewSession;
