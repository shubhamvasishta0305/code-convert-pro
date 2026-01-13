import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createBatch, getAllTrainers } from '@/services/api';
import { toast } from 'sonner';

const CreateBatch: React.FC = () => {
  const { user } = useAuth();
  const [trainers, setTrainers] = useState<Array<{ id: string; name: string }>>([]);
  const [form, setForm] = useState({
    name: '',
    trainerId: '',
    startDate: '',
    endDate: '',
    capacity: 3,
  });
  const [trainees, setTrainees] = useState<Array<{ name: string; mobile: string; email: string }>>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.role === 'Owner') {
      loadTrainers();
    }
  }, [user]);

  useEffect(() => {
    // Generate trainee rows based on capacity
    setTrainees(
      Array.from({ length: form.capacity }, () => ({ name: '', mobile: '', email: '' }))
    );
  }, [form.capacity]);

  const loadTrainers = async () => {
    try {
      const data = await getAllTrainers();
      setTrainers(data);
    } catch (error) {
      console.error('Failed to load trainers');
    }
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast.error('Batch name is required');
      return;
    }

    setLoading(true);
    try {
      const batchCode = 'B-' + Date.now().toString(36).toUpperCase();
      await createBatch({
        batch_code: batchCode,
        batch_name: form.name,
        trainer_id: user?.role === 'Owner' ? form.trainerId : user?.id || '',
        start_date: form.startDate,
        end_date: form.endDate,
        max_capacity: form.capacity,
        trainees: trainees.filter((t) => t.name.trim()),
      });
      toast.success('Batch created successfully!');
      setForm({ name: '', trainerId: '', startDate: '', endDate: '', capacity: 3 });
    } catch (error) {
      toast.error('Failed to create batch');
    } finally {
      setLoading(false);
    }
  };

  const updateTrainee = (index: number, field: string, value: string) => {
    const updated = [...trainees];
    updated[index] = { ...updated[index], [field]: value };
    setTrainees(updated);
  };

  return (
    <div className="animate-fade-in">
      <h2 className="text-3xl font-bold text-lms-primary mb-6">Create New Batch</h2>

      <div className="lms-card">
        <div className="mb-5">
          <label className="block font-semibold mb-2 text-lms-text">Batch Name</label>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="lms-input"
            placeholder="e.g. Python Masterclass 2025"
          />
        </div>

        {user?.role === 'Owner' && (
          <div className="mb-5">
            <label className="block font-semibold mb-2 text-lms-text">Assign to Trainer</label>
            <select
              value={form.trainerId}
              onChange={(e) => setForm({ ...form, trainerId: e.target.value })}
              className="lms-input"
            >
              <option value="">Select Trainer...</option>
              {trainers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex gap-5 mb-5">
          <div className="flex-1">
            <label className="block font-semibold mb-2 text-lms-text">Start Date</label>
            <input
              type="date"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              className="lms-input"
            />
          </div>
          <div className="flex-1">
            <label className="block font-semibold mb-2 text-lms-text">End Date</label>
            <input
              type="date"
              value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              className="lms-input"
            />
          </div>
        </div>

        <div className="mb-5">
          <label className="block font-semibold mb-2 text-lms-text">Number of Students</label>
          <input
            type="number"
            value={form.capacity}
            onChange={(e) => setForm({ ...form, capacity: parseInt(e.target.value) || 1 })}
            className="lms-input"
            min={1}
            max={50}
          />
        </div>

        {/* Trainee Input Rows */}
        <div className="bg-slate-50 p-5 rounded-xl mb-6 border border-slate-200">
          <h4 className="font-semibold mb-4 text-lms-text">Student Details</h4>
          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {trainees.map((trainee, idx) => (
              <div key={idx} className="flex gap-3">
                <input
                  value={trainee.name}
                  onChange={(e) => updateTrainee(idx, 'name', e.target.value)}
                  className="lms-input flex-1 mb-0"
                  placeholder={`Student ${idx + 1} Name`}
                />
                <input
                  value={trainee.mobile}
                  onChange={(e) => updateTrainee(idx, 'mobile', e.target.value)}
                  className="lms-input w-36 mb-0"
                  placeholder="Mobile"
                />
                <input
                  value={trainee.email}
                  onChange={(e) => updateTrainee(idx, 'email', e.target.value)}
                  className="lms-input flex-1 mb-0"
                  placeholder="Email"
                />
              </div>
            ))}
          </div>
        </div>

        <button onClick={handleSubmit} disabled={loading} className="lms-btn">
          {loading ? 'Creating...' : 'Create Batch'}
        </button>
      </div>
    </div>
  );
};

export default CreateBatch;
