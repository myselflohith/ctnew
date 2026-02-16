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

  // Fetch interview data
  useEffect(() => {
    const fetchInterviewData = async () => {
      try {
        setLoading(true);
        
        // Extract candidate info from navigation state if available
        if (location.state?.candidateInfo) {
          setCandidateInfo(location.state.candidateInfo);
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
          setInterviewData({
            id: invite.interviewId,
            interview_title: invite.interviewTitle,
            interview_category: invite.interviewCategory,
            type_of_interview: invite.interviewType,
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
    audioRef.current = new Audio();

    return () => {
      mountedRef.current = false;
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

  const handleStartSession = async () => {
    try {
      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });
      await startSession();
    } catch (err) {
      console.error('Microphone permission denied:', err);
      toast.error('Please allow microphone access to start the interview');
    }
  };

  const startSession = async () => {
    const introMessage = `Hello! I'm your AI interview assistant. I'll be conducting a practice interview with you today. I'll ask you exactly 5 questions, provide scores for each answer, and give you feedback on how to improve. Let's begin - what type of role are you interviewing for?`;

    setState((prev) => ({
      ...prev,
      sessionStarted: true,
      messages: [{ role: 'assistant', content: introMessage, timestamp: new Date() }],
      isProcessing: true,
    }));

    // Play intro message
    setTimeout(async () => {
      try {
        await playAvatarSpeech(introMessage);
      } finally {
        setState((prev) => ({ ...prev, isProcessing: false }));
      }
    }, 500);
  };

  const playAvatarSpeech = async (text: string): Promise<void> => {
    return new Promise(async (resolve) => {
      try {
        // Try OpenAI TTS first
        const speechResponse = await fetch('/api/interviews/openai_speak', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ text: text }),
        }).catch(() => null);

        if (speechResponse?.ok) {
          const audioBlob = await speechResponse.blob();
          if (audioBlob.size > 0) {
            const audioUrl = URL.createObjectURL(audioBlob);
            setState((prev) => ({ ...prev, isAiSpeaking: true }));

            if (audioRef.current) {
              audioRef.current.onended = () => {
                setState((prev) => ({ ...prev, isAiSpeaking: false }));
                URL.revokeObjectURL(audioUrl);
                resolve();
              };

              audioRef.current.onerror = () => {
                setState((prev) => ({ ...prev, isAiSpeaking: false }));
                resolve();
              };

              audioRef.current.src = audioUrl;
              audioRef.current.load();
              await audioRef.current.play();
            }
            return;
          }
        }

        // Fallback to Web Speech API
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1;
        utterance.pitch = 1;
        utterance.volume = 1;

        utterance.onstart = () => {
          setState((prev) => ({ ...prev, isAiSpeaking: true }));
        };

        utterance.onend = () => {
          setState((prev) => ({ ...prev, isAiSpeaking: false }));
          resolve();
        };

        utterance.onerror = () => {
          setState((prev) => ({ ...prev, isAiSpeaking: false }));
          resolve();
        };

        speechSynthesis.speak(utterance);
      } catch (error) {
        console.error('Error playing audio:', error);
        setState((prev) => ({ ...prev, isAiSpeaking: false }));
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
      const mediaRecorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/wav' });
        stream.getTracks().forEach((track) => track.stop());
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

      // Try to use server transcription API first
      let transcript = '';
      
      try {
        const formData = new FormData();
        formData.append('audio', audioBlob, 'audio.webm');
        
        const token = localStorage.getItem('token');
        const transcribeResponse = await fetch('/api/interviews/transcribe', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        });

        if (transcribeResponse.ok) {
          const data = await transcribeResponse.json();
          transcript = data.text || '';
        }
      } catch (apiError) {
        console.log('Server transcription unavailable, falling back to Web Speech API');
      }

      // Fallback to Web Speech API if server transcription fails
      if (!transcript) {
        const recognition = new (window as any).webkitSpeechRecognition();
        recognition.language = 'en-US';

        await new Promise<void>((resolve) => {
          recognition.onresult = (event: any) => {
            for (let i = event.resultIndex; i < event.results.length; i++) {
              transcript += event.results[i][0].transcript + ' ';
            }
            resolve();
          };

          recognition.onerror = () => {
            console.error('Speech recognition error');
            resolve();
          };

          recognition.start();
        });
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

      // Get AI response
      if (transcript) {
        await getAIResponse(transcript);
      } else {
        setState((prev) => ({ ...prev, isProcessing: false }));
      }
    } catch (error) {
      console.error('Error processing audio:', error);
      setState((prev) => ({ ...prev, isProcessing: false }));
      toast.error('Failed to process audio');
    }
  };

  const getAIResponse = async (userMessage: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/interviews/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: `You are an AI interview assistant. Conduct practice interviews with exactly 5 interview questions total. For each answer, provide a score out of 10 and specific feedback.

IMPORTANT RULES:
- Ask only ONE question at a time.
- When asking a NEW interview question, start your response with "QUESTION [NUMBER]:" (e.g., "QUESTION 1:", "QUESTION 2:", etc.).
- Always provide a score (1-10) and improvement feedback for each answer.
- After exactly 5 interview questions, end the interview.
- Format responses clearly without markdown.
- Keep responses conversational and encouraging.

Current question count: ${state.questionCount}/5.`,
            },
            ...messagesRef.current.map((m) => ({
              role: m.role,
              content: m.content,
            })),
            { role: 'user', content: userMessage },
          ],
        }),
      });

      if (!response.ok) throw new Error('Failed to get AI response');

      const data = await response.json();
      const assistantReply = data.choices?.[0]?.message?.content || data.content || '';

      // Check if this is a new question
      const isNewQuestion = /QUESTION\s*\d+[:.]?/i.test(assistantReply);
      let newQuestionCount = state.questionCount;

      if (isNewQuestion) {
        newQuestionCount = state.questionCount + 1;
      }

      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, { role: 'assistant', content: assistantReply }],
        questionCount: newQuestionCount,
        userResponseCount: prev.userResponseCount + 1,
      }));

      // Play response
      await playAvatarSpeech(assistantReply);

      // Check if interview should end
      if (newQuestionCount >= 5 && !isNewQuestion) {
        await completeSession();
      }
    } catch (error) {
      console.error('Error getting AI response:', error);
      toast.error('Failed to process response');
    } finally {
      isProcessingRef.current = false;
      setState((prev) => ({ ...prev, isProcessing: false }));
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
      const summary = `Interview Complete! Thank you for completing the practice interview. You answered ${state.questionCount} questions. Good luck with your future interviews!`;

      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, { role: 'assistant', content: summary }],
      }));

      // Save interview report
      if ((interviewId && inviteId) || (uniqueLink && inviteData)) {
        await saveInterviewReport();
      }

      await playAvatarSpeech(summary);
    } catch (error) {
      console.error('Error completing session:', error);
    } finally {
      setState((prev) => ({ ...prev, isProcessing: false }));
    }
  };

  const saveInterviewReport = async () => {
    try {
      const token = localStorage.getItem('token');
      const reportDetails = state.messages
        .filter((msg) => msg.role === 'user')
        .map((msg, idx) => ({
          question: msg.content,
          transcript_text: msg.content,
          score: msg.score || '7',
          rating: msg.feedback || 'good',
          ai_feedback: msg.feedback || 'Good response',
          que_type: 'practice',
        }));

      const payload = {
        ai_interview_invite_id: inviteId || inviteData?.id || inviteData?.invite_id,
        interview_start_at: new Date().toISOString().split('T')[0],
        transcript_text: state.messages.map((m) => `${m.role}: ${m.content}`).join('\n'),
        rating: 'good',
        score: '7.5',
        ai_feedback: 'Good interview performance',
        protecting_score: '7.5',
        interview_video_url: null,
        report_details: reportDetails,
      };

      // Submit to backend
      const interviewIdToSubmit = interviewId || interviewData?.id;
      if (!interviewIdToSubmit) {
        console.error('No interview ID available for submission');
        return;
      }

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
        console.error('Error submitting report:', error);
        toast.error('Failed to save interview report');
        return;
      }

      const result = await response.json();
      console.log('Interview report saved:', result);
      toast.success('Interview completed and saved successfully!');
    } catch (error) {
      console.error('Error saving interview report:', error);
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
                <Briefcase className="w-16 h-16 mx-auto mb-6 text-primary" />
                <h2 className="text-2xl font-bold mb-4">Welcome to Your Interview</h2>
                <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
                  This is a practice interview session. You'll be asked {state.totalQuestions} questions
                  by our AI interviewer. Take your time with each answer, and we'll provide feedback.
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

                <Button
                  size="lg"
                  onClick={handleStartSession}
                  className="bg-gradient-to-r from-cardinal to-amber"
                >
                  <Mic className="w-4 h-4 mr-2" />
                  Start Interview
                </Button>
              </div>
            ) : (
              // Interview Chat
              <div className="space-y-6">
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
                      <p className="text-sm">Processing...</p>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Controls */}
                {!state.sessionComplete && (
                  <div className="flex gap-4 justify-center">
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
                  <div className="text-center">
                    <Button
                      onClick={() => navigate('/talent/interviews')}
                      className="bg-gradient-to-r from-cardinal to-amber"
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Return to Interviews
                    </Button>
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
                <li>• Speak clearly and at a natural pace</li>
                <li>• Give detailed, specific examples from your experience</li>
                <li>• Take your time - there's no rush to answer</li>
                <li>• You can review feedback after the interview</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>

      <audio ref={audioRef} />
    </div>
  );
};

export default TalentInterviewSession;
