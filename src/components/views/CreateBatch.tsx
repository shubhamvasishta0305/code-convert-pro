import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createBatch, getAllTrainers, parseCSVFile } from '@/services/api';
import { toast } from 'sonner';
import { Upload, FileSpreadsheet, X, Download } from 'lucide-react';

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
  const [uploadMode, setUploadMode] = useState<'manual' | 'bulk'>('manual');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user?.role === 'Owner') {
      loadTrainers();
    }
  }, [user]);

  useEffect(() => {
    // Only generate empty rows if in manual mode and no bulk trainees added
    if (uploadMode === 'manual') {
      setTrainees(
        Array.from({ length: form.capacity }, () => ({ name: '', mobile: '', email: '' }))
      );
    }
  }, [form.capacity, uploadMode]);

  const loadTrainers = async () => {
    try {
      const data = await getAllTrainers();
      setTrainers(data);
    } catch (error) {
      console.error('Failed to load trainers');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file type
    const validTypes = ['.csv', '.xlsx', '.xls'];
    const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
    if (!validTypes.includes(ext)) {
      toast.error('Please upload a CSV or Excel file');
      return;
    }

    setUploading(true);
    try {
      const result = await parseCSVFile(file);
      if (result.trainees && result.trainees.length > 0) {
        setTrainees(result.trainees);
        setForm(prev => ({ ...prev, capacity: result.trainees.length }));
        toast.success(`Loaded ${result.trainees.length} students from file`);
      } else {
        toast.error('No valid student data found in file');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to parse file');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const downloadTemplate = () => {
    const csvContent = 'student name,Mobile number,E-mail id\nJohn Doe,9876543210,john@example.com\nJane Smith,9876543211,jane@example.com';
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'student_template.csv';
    a.click();
    URL.revokeObjectURL(url);
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
      setTrainees([]);
      setUploadMode('manual');
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

  const removeTrainee = (index: number) => {
    const updated = trainees.filter((_, i) => i !== index);
    setTrainees(updated);
    setForm(prev => ({ ...prev, capacity: updated.length }));
  };

  const switchToManual = () => {
    setUploadMode('manual');
    setTrainees(Array.from({ length: form.capacity }, () => ({ name: '', mobile: '', email: '' })));
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

        {uploadMode === 'manual' && (
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
        )}

        {/* Student Entry Mode Toggle */}
        <div className="bg-slate-50 p-5 rounded-xl mb-6 border border-slate-200">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-semibold text-lms-text">Student Details</h4>
            <div className="flex gap-2">
              <button
                onClick={switchToManual}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  uploadMode === 'manual'
                    ? 'bg-lms-primary text-white'
                    : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-100'
                }`}
              >
                Manual Entry
              </button>
              <button
                onClick={() => setUploadMode('bulk')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                  uploadMode === 'bulk'
                    ? 'bg-lms-primary text-white'
                    : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Upload size={16} />
                Bulk Upload
              </button>
            </div>
          </div>

          {/* Bulk Upload Section */}
          {uploadMode === 'bulk' && (
            <div className="mb-4 p-4 border-2 border-dashed border-slate-300 rounded-xl bg-white">
              <div className="text-center">
                <FileSpreadsheet className="mx-auto mb-3 text-lms-primary" size={40} />
                <p className="text-slate-600 mb-3">
                  Upload a CSV or Excel file with columns: <br />
                  <strong>student name, Mobile number, E-mail id</strong>
                </p>
                <div className="flex justify-center gap-3">
                  <label className="lms-btn cursor-pointer inline-flex items-center gap-2">
                    <Upload size={18} />
                    {uploading ? 'Processing...' : 'Choose File'}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={uploading}
                    />
                  </label>
                  <button
                    onClick={downloadTemplate}
                    className="px-4 py-2 bg-white border border-lms-primary text-lms-primary rounded-lg font-medium hover:bg-lms-primary/10 transition-all flex items-center gap-2"
                  >
                    <Download size={18} />
                    Download Template
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Student List */}
          {trainees.length > 0 && (
            <>
              {uploadMode === 'bulk' && (
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm text-slate-500">
                    {trainees.filter(t => t.name.trim()).length} students loaded
                  </span>
                  <button
                    onClick={() => setTrainees([])}
                    className="text-sm text-red-500 hover:text-red-700"
                  >
                    Clear All
                  </button>
                </div>
              )}
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {trainees.map((trainee, idx) => (
                  <div key={idx} className="flex gap-3 items-center">
                    <span className="text-slate-400 text-sm w-6">{idx + 1}.</span>
                    <input
                      value={trainee.name}
                      onChange={(e) => updateTrainee(idx, 'name', e.target.value)}
                      className="lms-input flex-1 mb-0"
                      placeholder={`Student Name`}
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
                    {uploadMode === 'bulk' && (
                      <button
                        onClick={() => removeTrainee(idx)}
                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <X size={18} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <button onClick={handleSubmit} disabled={loading} className="lms-btn">
          {loading ? 'Creating...' : 'Create Batch'}
        </button>
      </div>
    </div>
  );
};

export default CreateBatch;