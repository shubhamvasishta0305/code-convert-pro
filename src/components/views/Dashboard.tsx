import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getMyBatches, addSingleTrainee } from '@/services/api';
import type { Batch } from '@/types/lms';
import { toast } from 'sonner';

interface DashboardProps {
  onSelectBatch: (batchCode: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onSelectBatch }) => {
  const { user } = useAuth();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState('');
  const [traineeForm, setTraineeForm] = useState({ name: '', mobile: '', email: '' });

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
    } finally {
      setLoading(false);
    }
  };

  const handleAddTrainee = async () => {
    if (!traineeForm.name.trim()) {
      toast.error('Name is required');
      return;
    }

    try {
      await addSingleTrainee({
        batchCode: selectedBatch,
        name: traineeForm.name,
        mobile: traineeForm.mobile,
        email: traineeForm.email,
      });
      toast.success('Student added successfully!');
      setShowModal(false);
      setTraineeForm({ name: '', mobile: '', email: '' });
    } catch (error) {
      toast.error('Failed to add student');
    }
  };

  const openAddModal = (batchCode: string) => {
    setSelectedBatch(batchCode);
    setShowModal(true);
  };

  return (
    <div className="animate-fade-in">
      <h2 className="text-3xl font-bold text-lms-primary mb-6">Dashboard</h2>

      {/* Stats Cards */}
      <div className="flex gap-6 mb-8">
        <div className="flex-1 lms-card bg-gradient-to-br from-slate-800 to-slate-900 text-white border-none">
          <div className="opacity-70 text-sm uppercase tracking-wider">Total Batches</div>
          <h1 className="text-5xl font-bold mt-1">{batches.length}</h1>
        </div>
        
        <div className="flex-1 lms-card">
          <div className="text-slate-500 text-sm uppercase tracking-wider">System Status</div>
          <h1 className="text-5xl font-bold text-green-500 mt-1">Active</h1>
        </div>
      </div>

      {/* Batches List */}
      <h3 className="mb-4 text-lms-text font-semibold">Your Batches</h3>
      <div className="lms-card p-0 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400">Loading...</div>
        ) : batches.length === 0 ? (
          <div className="p-8 text-center text-slate-400">No batches found. Create your first batch!</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {batches.map((batch) => (
              <div
                key={batch.code}
                className="p-5 flex items-center justify-between hover:bg-slate-50 transition-colors"
              >
                <div>
                  <div className="font-semibold text-lms-primary">{batch.name}</div>
                  <div className="text-sm text-slate-500">Code: {batch.code} • Started: {batch.startDate}</div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openAddModal(batch.code)}
                    className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
                  >
                    + Add Student
                  </button>
                  <button
                    onClick={() => onSelectBatch(batch.code)}
                    className="px-4 py-2 bg-lms-accent text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
                  >
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Trainee Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="lms-card w-[400px] p-8 m-0 shadow-2xl">
            <h3 className="text-xl font-bold text-lms-primary mt-0 mb-5">Add New Student</h3>
            
            <div className="mb-4">
              <label className="block font-semibold mb-2 text-lms-text text-sm">Full Name</label>
              <input
                value={traineeForm.name}
                onChange={(e) => setTraineeForm({ ...traineeForm, name: e.target.value })}
                className="lms-input mb-0"
                placeholder="e.g. Jane Doe"
              />
            </div>

            <div className="mb-4">
              <label className="block font-semibold mb-2 text-lms-text text-sm">Mobile</label>
              <input
                value={traineeForm.mobile}
                onChange={(e) => setTraineeForm({ ...traineeForm, mobile: e.target.value })}
                className="lms-input mb-0"
                placeholder="e.g. 9876543210"
              />
            </div>

            <div className="mb-6">
              <label className="block font-semibold mb-2 text-lms-text text-sm">Email</label>
              <input
                value={traineeForm.email}
                onChange={(e) => setTraineeForm({ ...traineeForm, email: e.target.value })}
                className="lms-input mb-0"
                placeholder="e.g. jane@example.com"
              />
            </div>

            <div className="flex gap-3">
              <button onClick={handleAddTrainee} className="flex-1 lms-btn">
                Add Student
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-3.5 bg-slate-200 text-slate-600 border-none rounded-xl font-semibold cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
