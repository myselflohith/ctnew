import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { AlertCircle, CheckCircle, XCircle, Mic, Video } from "lucide-react";

interface StartInterviewModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onStartInterview: (candidateInfo: CandidateInfo) => void;
  interviewTitle?: string;
  organizationName?: string;
  organizationLogo?: string;
}

interface CandidateInfo {
  name: string;
  email: string;
  phone: string;
}

type Step = "info" | "permissions" | "guidelines";

export function StartInterviewModal({
  isOpen,
  onOpenChange,
  onStartInterview,
  interviewTitle = "Interview",
  organizationName,
  organizationLogo,
}: StartInterviewModalProps) {
  const [step, setStep] = useState<Step>("permissions");
  const [candidateInfo, setCandidateInfo] = useState<CandidateInfo>({
    name: "",
    email: "",
    phone: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hasPermission, setHasPermission] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [cameraStatus, setCameraStatus] = useState<string | null>(null);
  const [microphoneStatus, setMicrophoneStatus] = useState<string | null>(null);
  const [cameraPermission, setCameraPermission] = useState(false);
  const [microphonePermission, setMicrophonePermission] = useState(false);

  const audioChunksRef = useRef<Blob[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafIdRef = useRef<number | null>(null);



  const checkPermissions = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });

      if (stream.getAudioTracks().length > 0) {
        setMicrophoneStatus("Microphone access granted");
        setMicrophonePermission(true);
      } else {
        setMicrophoneStatus("Microphone not available");
        setMicrophonePermission(false);
      }

      if (stream.getVideoTracks().length > 0) {
        setCameraStatus("Camera access granted");
        setCameraPermission(true);
      } else {
        setCameraStatus("Camera not available");
        setCameraPermission(false);
      }

      setHasPermission(true);
      stream.getTracks().forEach((track) => track.stop());
    } catch (error) {
      console.error("Error accessing media devices:", error);
      setCameraStatus("Camera access denied");
      setMicrophoneStatus("Microphone access denied");
      setCameraPermission(false);
      setMicrophonePermission(false);
    }
  };

  const startSpeaking = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;

      mediaRecorderRef.current = new MediaRecorder(stream);

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const audioUrl = URL.createObjectURL(audioBlob);
        if (audioRef.current) {
          audioRef.current.src = audioUrl;
          audioRef.current.oncanplaythrough = () => {
            audioRef.current?.play();
          };
        }
        audioChunksRef.current = [];
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);

      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      analyserRef.current = analyser;
      const microphone = audioContext.createMediaStreamSource(stream);
      microphone.connect(analyser);

      analyser.fftSize = 256;
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateAudioLevel = () => {
        analyser.getByteFrequencyData(dataArray);
        const volume = Math.max(...dataArray);
        const scaledVolume = Math.min(10, Math.floor((volume / 255) * 10));
        setAudioLevel(scaledVolume);

        rafIdRef.current = requestAnimationFrame(updateAudioLevel);
      };

      updateAudioLevel();
    } catch (error) {
      console.error("Error accessing microphone:", error);
      toast.error("Could not access microphone");
    }
  };

  const stopSpeaking = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }

    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
    }

    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => track.stop());
    }

    setAudioLevel(0);
  };

  const handleStartInterview = () => {
    if (!acceptTerms) {
      toast.error("Please accept the terms & conditions");
      return;
    }

    if (!cameraPermission || !microphonePermission) {
      toast.error("Camera and Microphone access is required");
      return;
    }

    setStep("guidelines");
  };

  const handleBeginInterview = () => {
    onStartInterview(candidateInfo);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              {organizationLogo && (
                <img src={organizationLogo} alt={organizationName} className="w-12 h-12 rounded" />
              )}
              <div>
                <DialogTitle>{interviewTitle}</DialogTitle>
                {organizationName && <p className="text-sm text-muted-foreground">{organizationName}</p>}
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* STEP 1: Permissions & Microphone Test */}
          {step === "permissions" && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Check Microphone & Camera Permissions</h3>

              <p className="text-sm text-muted-foreground">
                We use audio and video during the interview to ensure accurate assessment. Your camera and microphone
                permissions are required to proceed.
              </p>

              {/* Permission Status */}
              <div className="space-y-2 p-4 bg-secondary/20 rounded-lg">
                <div className="flex items-center gap-3">
                  {cameraPermission ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-destructive" />
                  )}
                  <span className={cameraPermission ? "text-green-600" : "text-destructive"}>
                    {cameraStatus || "Camera"}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  {microphonePermission ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-destructive" />
                  )}
                  <span className={microphonePermission ? "text-green-600" : "text-destructive"}>
                    {microphoneStatus || "Microphone"}
                  </span>
                </div>
              </div>

              {!hasPermission && (
                <Button onClick={checkPermissions} variant="outline" className="w-full">
                  Check Permissions
                </Button>
              )}

              {/* Microphone Test */}
              {hasPermission && (
                <div className="space-y-4 p-4 border rounded-lg">
                  <p className="text-sm font-medium">Microphone Test</p>
                  <p className="text-sm text-muted-foreground">
                    Speak to test your microphone. You will hear your voice played back.
                  </p>

                  <Button
                    onClick={isRecording ? stopSpeaking : startSpeaking}
                    variant={isRecording ? "destructive" : "outline"}
                    className="w-full"
                  >
                    <Mic className="w-4 h-4 mr-2" />
                    {isRecording ? "Stop Speaking" : "Start Speaking"}
                  </Button>

                  {/* Audio Level Visualizer */}
                  {audioLevel > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">Audio Level</p>
                      <div className="flex gap-1">
                        {[...Array(10)].map((_, i) => (
                          <div
                            key={i}
                            className={`h-8 flex-1 rounded-sm transition-all ${
                              i < audioLevel ? "bg-primary" : "bg-secondary"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  <audio ref={audioRef} hidden />
                </div>
              )}

              {/* Terms & Conditions */}
              <div className="flex items-start gap-3 p-3 border rounded-lg">
                <Checkbox
                  id="terms"
                  checked={acceptTerms}
                  onCheckedChange={(checked) => setAcceptTerms(checked === true)}
                  className="mt-1"
                />
                <label htmlFor="terms" className="text-sm text-muted-foreground cursor-pointer flex-1">
                  I agree to the{" "}
                  <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                    terms & conditions
                  </a>{" "}
                  of this AI interview process
                </label>
              </div>

              <Button onClick={handleStartInterview} className="w-full">
                Continue to Guidelines
              </Button>
            </div>
          )}

          {/* STEP 2: Guidelines */}
          {step === "guidelines" && (
            <div className="space-y-4">
              <div className="text-center space-y-4">
                <h3 className="text-lg font-semibold">Before Starting the Interview</h3>

                <div className="bg-secondary/20 p-6 rounded-lg space-y-3 text-left">
                  <p className="font-medium">Please make sure to:</p>
                  <ol className="list-decimal list-inside space-y-2 text-sm">
                    <li>Use one device for the entire interview</li>
                    <li>Use the latest version of Chrome, Safari, or Firefox</li>
                    <li>Position yourself directly in front of the camera</li>
                    <li>Maintain eye contact with the screen</li>
                    <li>Do not open any other applications or browser tabs</li>
                    <li>Do not refresh the page once the interview starts</li>
                    <li>Ensure you have a stable internet connection</li>
                  </ol>
                </div>
              </div>

              <Button onClick={handleBeginInterview} className="w-full" size="lg">
                Start the Interview
              </Button>

              <Button onClick={() => setStep("permissions")} variant="outline" className="w-full">
                Back
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export type { CandidateInfo };
