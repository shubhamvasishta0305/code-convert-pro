import React, { useState, useEffect, useRef } from 'react';
import { getTestSetupData, saveAssessmentResult } from '@/services/api';
import { toast } from 'sonner';

interface AssessmentProps {
  traineeId: string;
  traineeName: string;
  moduleNum: string;
  onClose: () => void;
  onComplete: () => void;
}

const Assessment: React.FC<AssessmentProps> = ({
  traineeId,
  traineeName,
  moduleNum,
  onClose,
  onComplete,
}) => {
  const [questions, setQuestions] = useState<Array<{ question: string }>>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [permissionsGranted, setPermissionsGranted] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const cameraRecorderRef = useRef<MediaRecorder | null>(null);
  const cameraChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    checkPermissions();
    return () => {
      stopAllStreams();
    };
  }, []);

  const stopAllStreams = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
    }
  };

  const checkPermissions = async () => {
    try {
      // Request camera
      cameraStreamRef.current = await navigator.mediaDevices.getUserMedia({ video: true });
      // Request microphone
      micStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });

      if (videoRef.current && cameraStreamRef.current) {
        videoRef.current.srcObject = cameraStreamRef.current;
      }

      setPermissionsGranted(true);
      loadQuestions();
    } catch (error) {
      toast.error('Camera & Microphone access required for assessment');
      onClose();
    }
  };

  const loadQuestions = async () => {
    try {
      const data = await getTestSetupData(moduleNum);
      if (data.questions && data.questions.length > 0) {
        setQuestions(data.questions);
      } else {
        setQuestions([{ question: `Default Question for Module ${moduleNum}` }]);
      }
    } catch (error) {
      setQuestions([{ question: 'Question could not be loaded' }]);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const startRecording = () => {
    if (!micStreamRef.current) return;

    audioChunksRef.current = [];
    const mediaRecorder = new MediaRecorder(micStreamRef.current);
    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        audioChunksRef.current.push(e.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      setAudioBlob(blob);
      setAudioUrl(URL.createObjectURL(blob));
    };

    mediaRecorder.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleSubmit = async () => {
    if (!audioBlob) {
      toast.error('Please record your answer first');
      return;
    }

    setSubmitting(true);

    try {
      // Start camera recording for verification
      cameraChunksRef.current = [];
      
      let videoBlob: Blob | null = null;
      
      if (cameraStreamRef.current) {
        cameraRecorderRef.current = new MediaRecorder(cameraStreamRef.current);
        
        cameraRecorderRef.current.ondataavailable = (e) => {
          if (e.data.size > 0) {
            cameraChunksRef.current.push(e.data);
          }
        };

        // Create a promise for camera recording
        const cameraPromise = new Promise<Blob>((resolve) => {
          cameraRecorderRef.current!.onstop = () => {
            const blob = new Blob(cameraChunksRef.current, { type: 'video/webm' });
            resolve(blob);
          };
        });

        cameraRecorderRef.current.start();
        
        // Record for 1.5 seconds
        await new Promise((resolve) => setTimeout(resolve, 1500));
        cameraRecorderRef.current.stop();
        
        videoBlob = await cameraPromise;
      }

      // Convert blobs to base64
      const audioBase64 = await blobToBase64(audioBlob);
      const videoBase64 = videoBlob ? await blobToBase64(videoBlob) : null;

      await saveAssessmentResult(
        traineeId,
        traineeName,
        moduleNum,
        videoBase64 ? { data: videoBase64 } : null,
        { data: audioBase64 }
      );

      toast.success('Assessment submitted successfully!');
      stopAllStreams();
      onComplete();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to submit assessment';
      toast.error(message);
      setSubmitting(false);
    }
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
    });
  };

  const handleExit = () => {
    stopAllStreams();
    onClose();
  };

  const currentQuestion = questions[currentIndex]?.question || 'Loading Question...';

  return (
    <div className="fixed inset-0 bg-slate-100 z-50 overflow-y-auto">
      {/* Header */}
      <div className="bg-white py-4 px-10 border-b border-slate-200 flex justify-between items-center">
        <div className="font-bold text-lms-primary text-lg">Assessment In Progress</div>
        <button
          onClick={handleExit}
          className="text-slate-500 bg-transparent border-none font-semibold cursor-pointer text-sm hover:text-slate-700"
        >
          ✕ Cancel
        </button>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto py-10 px-5">
        <div className="lms-card text-center py-12">
          {/* Question */}
          <div className="mb-10">
            <h2 className="text-2xl font-bold text-lms-primary mb-3">Question</h2>
            <div className="text-xl font-medium text-slate-700 leading-relaxed">
              {currentQuestion}
            </div>
          </div>

          {/* Recording Controls */}
          <div className="flex flex-col items-center gap-5">
            <button
              onClick={toggleRecording}
              disabled={!permissionsGranted}
              className={`w-20 h-20 rounded-full border-2 text-3xl cursor-pointer transition-all flex items-center justify-center disabled:opacity-50 ${
                isRecording
                  ? 'bg-red-100 border-red-500 text-red-500 animate-pulse'
                  : audioBlob
                  ? 'bg-green-100 border-green-500 text-green-500'
                  : 'bg-red-50 border-red-500 text-red-500 hover:bg-red-100'
              }`}
            >
              {isRecording ? '⏹' : '🎤'}
            </button>

            <div className="text-slate-400 font-semibold text-sm uppercase tracking-wider">
              {isRecording
                ? 'Recording... Click to Stop'
                : audioBlob
                ? 'Recording Complete ✓'
                : 'Click to Record'}
            </div>

            {audioUrl && (
              <audio src={audioUrl} controls className="w-full max-w-md mt-4" />
            )}
          </div>

          {/* Submit Button */}
          <div className="mt-10 pt-8 border-t border-slate-100">
            <button
              onClick={handleSubmit}
              disabled={!audioBlob || submitting}
              className="lms-btn w-auto px-10 text-base disabled:opacity-50"
            >
              {submitting ? 'Uploading...' : 'Submit & Upload'}
            </button>
          </div>
        </div>
      </div>

      {/* Video Feed */}
      <div className="fixed bottom-5 right-5 w-60 h-44 bg-black rounded-2xl overflow-hidden border-4 border-white shadow-2xl z-50">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover scale-x-[-1]"
        />
      </div>
    </div>
  );
};

export default Assessment;
