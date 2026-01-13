import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getMyBatches, getTraineesByBatch, saveAttendance } from '@/services/api';
import type { Batch, Trainee } from '@/types/lms';
import { toast } from 'sonner';

const Attendance: React.FC = () => {
  const { user } = useAuth();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [trainees, setTrainees] = useState<Trainee[]>([]);
  const [selectedBatch, setSelectedBatch] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendance, setAttendance] = useState<Record<string, 'P' | 'A'>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadBatches();
  }, [user]);

  const loadBatches = async () => {
    if (!user) return;
    try {
      const data = await getMyBatches(user.id, user.role);
      setBatches(data);
    } catch (error) {
      console.error('Failed to load batches');
    }
  };

  const loadTrainees = async (batchCode: string) => {
    try {
      const data = await getTraineesByBatch(batchCode);
      setTrainees(data);
      // Initialize all as Present
      const initial: Record<string, 'P' | 'A'> = {};
      data.forEach((t) => (initial[t.id] = 'P'));
      setAttendance(initial);
    } catch (error) {
      console.error('Failed to load trainees');
    }
  };

  const handleBatchChange = (code: string) => {
    setSelectedBatch(code);
    if (code) loadTrainees(code);
    else setTrainees([]);
  };

  const toggleAttendance = (traineeId: string) => {
    setAttendance((prev) => ({
      ...prev,
      [traineeId]: prev[traineeId] === 'P' ? 'A' : 'P',
    }));
  };

  const handleSubmit = async () => {
    if (!selectedBatch) {
      toast.error('Please select a batch');
      return;
    }

    setLoading(true);
    try {
      await saveAttendance({
        batch_code: selectedBatch,
        date,
        records: Object.entries(attendance).map(([trainee_id, status]) => ({
          trainee_id,
          status,
        })),
      });
      toast.success('Attendance saved successfully!');
    } catch (error) {
      toast.error('Failed to save attendance');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <h2 className="text-3xl font-bold text-lms-primary mb-6">Mark Attendance</h2>

      <div className="lms-card">
        <div className="flex gap-5 mb-5">
          <div className="flex-1">
            <label className="block font-semibold mb-2">Select Batch</label>
            <select
              value={selectedBatch}
              onChange={(e) => handleBatchChange(e.target.value)}
              className="lms-input"
            >
              <option value="">Choose a batch...</option>
              {batches.map((b) => (
                <option key={b.code} value={b.code}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div className="w-52">
            <label className="block font-semibold mb-2">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="lms-input"
            />
          </div>
        </div>

        {trainees.length > 0 && (
          <>
            <div className="mt-6 space-y-3">
              {trainees.map((trainee) => (
                <div
                  key={trainee.id}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200"
                >
                  <div>
                    <div className="font-semibold text-lms-primary">{trainee.name}</div>
                    <div className="text-sm text-slate-500">{trainee.mobile}</div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleAttendance(trainee.id)}
                      className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
                        attendance[trainee.id] === 'P'
                          ? 'bg-green-500 text-white'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      Present
                    </button>
                    <button
                      onClick={() => toggleAttendance(trainee.id)}
                      className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
                        attendance[trainee.id] === 'A'
                          ? 'bg-red-500 text-white'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      Absent
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button onClick={handleSubmit} disabled={loading} className="lms-btn mt-6">
              {loading ? 'Saving...' : 'Save Attendance'}
            </button>
          </>
        )}

        {selectedBatch && trainees.length === 0 && (
          <div className="text-center text-slate-400 py-8">No students in this batch</div>
        )}
      </div>
    </div>
  );
};

export default Attendance;
