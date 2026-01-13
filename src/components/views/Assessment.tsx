import React, { useState, useEffect, useRef } from 'react';
import { getTestSetupData, saveAssessmentResult } from '@/services/api';
import { toast } from 'sonner';

interface AssessmentProps {
  traineeId: string;
  traineeName: string;
  moduleNum: string;
  onClose: () => void;
}

const Assessment: React.FC<AssessmentProps> = ({
  traineeId,
  traineeName,
  moduleNum,
  onClose,
}) => {
  const [question, setQuestion] = useState('Loading Question...');
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    loadQuestion();
    setupCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const loadQuestion = async () => {
    try {
      const data = await getTestSetupData(moduleNum);
      if (data.questions && data.questions.length > 0) {
        setQuestion(data.questions[0].question);
      }
    } catch (error) {
      setQuestion('Question could not be loaded');
    }
  };

  const setupCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Camera access denied');
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
    if (!streamRef.current) return;

    chunksRef.current = [];
    const mediaRecorder = new MediaRecorder(streamRef.current);
    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunksRef.current.push(e.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
      setAudioBlob(blob);
      setAudioUrl(URL.createObjectURL(blob));
    };

    mediaRecorder.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
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
      // Convert blob to base64
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64 = (reader.result as string).split(',')[1];

        await saveAssessmentResult(traineeId, traineeName, moduleNum, null, {
          data: base64,
        });

        toast.success('Assessment submitted successfully!');
        onClose();
      };
    } catch (error) {
      toast.error('Failed to submit assessment');
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-100 z-50 overflow-y-auto">
      {/* Header */}
      <div className="bg-white py-4 px-10 border-b border-slate-200 flex justify-between items-center">
        <div className="font-bold text-lms-primary text-lg">Assessment In Progress</div>
        <button
          onClick={onClose}
          className="text-slate-500 bg-transparent border-none font-semibold cursor-pointer text-sm hover:text-slate-700"
        >
          ✕ Cancel
        </button>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto py-10 px-5">
        <div className="lms-card text-center py-12">
          <div className="mb-10">
            <h2 className="text-2xl font-bold text-lms-primary mb-3">Question</h2>
            <div className="text-xl font-medium text-slate-700 leading-relaxed">
              {question}
            </div>
          </div>

          <div className="flex flex-col items-center gap-5">
            <button
              onClick={toggleRecording}
              className={`w-20 h-20 rounded-full border-2 text-3xl cursor-pointer transition-all flex items-center justify-center ${
                isRecording
                  ? 'bg-red-500 border-red-500 text-white animate-pulse'
                  : 'bg-red-50 border-red-500 text-red-500 hover:bg-red-100'
              }`}
            >
              {isRecording ? '⏹' : '🎤'}
            </button>

            <div className="text-slate-400 font-semibold text-sm uppercase tracking-wider">
              {isRecording ? 'Recording... Click to Stop' : 'Click to Record'}
            </div>

            {audioUrl && (
              <audio src={audioUrl} controls className="w-full max-w-md mt-4" />
            )}
          </div>

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
