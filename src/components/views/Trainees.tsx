import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getMyBatches, getTraineesByBatch, getTraineeDetails } from '@/services/api';
import type { Batch, Trainee, TraineeDetails } from '@/types/lms';
import { cn } from '@/lib/utils';

interface TraineesProps {
  onStartAssessment: (traineeId: string, traineeName: string, moduleNum: string) => void;
}

const Trainees: React.FC<TraineesProps> = ({ onStartAssessment }) => {
  const { user } = useAuth();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [trainees, setTrainees] = useState<Trainee[]>([]);
  const [selectedBatch, setSelectedBatch] = useState('');
  const [selectedTrainee, setSelectedTrainee] = useState<TraineeDetails | null>(null);
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [showProfile, setShowProfile] = useState(false);

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
    } catch (error) {
      console.error('Failed to load trainees');
    }
  };

  const handleBatchChange = (code: string) => {
    setSelectedBatch(code);
    setShowProfile(false);
    if (code) loadTrainees(code);
    else setTrainees([]);
  };

  const openProfile = async (traineeId: string) => {
    try {
      const data = await getTraineeDetails(traineeId);
      if (data.status === 'success') {
        setSelectedTrainee(data);
        setShowProfile(true);
        setSelectedModule(null);
        setExpandedCat(null);
      }
    } catch (error) {
      console.error('Failed to load trainee details');
    }
  };

  const getModuleStatus = (modNum: string) => {
    if (!selectedTrainee) return 'pending';
    const mod = selectedTrainee.modules[modNum];
    if (!mod) return 'pending';
    if (mod.score === 'Pending') return 'in-progress';
    return 'completed';
  };

  const handleModuleClick = (modNum: string) => {
    setSelectedModule(modNum === selectedModule ? null : modNum);
  };

  return (
    <div className="animate-fade-in">
      <h2 className="text-3xl font-bold text-lms-primary mb-6">Trainee Profiles</h2>

      {!showProfile ? (
        <div className="lms-card">
          <label className="block font-semibold mb-2">Select Batch to View Students</label>
          <select
            value={selectedBatch}
            onChange={(e) => handleBatchChange(e.target.value)}
            className="lms-input"
          >
            <option value="">Loading Batches...</option>
            {batches.map((b) => (
              <option key={b.code} value={b.code}>
                {b.name}
              </option>
            ))}
          </select>

          {trainees.length > 0 && (
            <div className="mt-5 space-y-3">
              {trainees.map((t) => (
                <div
                  key={t.id}
                  onClick={() => openProfile(t.id)}
                  className="p-4 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:border-lms-accent hover:bg-slate-100 transition-all flex justify-between items-center"
                >
                  <div>
                    <div className="font-semibold text-lms-primary">{t.name}</div>
                    <div className="text-sm text-slate-500">{t.mobile}</div>
                  </div>
                  <span className="text-lms-accent">View Profile →</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        selectedTrainee && (
          <div>
            <button
              onClick={() => setShowProfile(false)}
              className="bg-slate-200 border-none py-2 px-4 rounded-lg font-semibold cursor-pointer mb-5 text-slate-600 hover:bg-slate-300"
            >
              ← Back to List
            </button>

            <div className="lms-card">
              {/* Header */}
              <div className="flex items-center gap-5 border-b border-slate-100 pb-6 mb-6">
                <div className="w-16 h-16 bg-lms-accent text-white rounded-full flex items-center justify-center text-3xl font-bold">
                  {selectedTrainee.info.name.charAt(0)}
                </div>
                <div>
                  <h2 className="m-0 text-2xl font-bold text-lms-primary">
                    {selectedTrainee.info.name}
                  </h2>
                  <span className="text-slate-400 text-sm">ID: {selectedTrainee.info.id}</span>
                </div>
                <div className="ml-auto text-right">
                  <div className="text-4xl font-extrabold text-green-500">
                    {selectedTrainee.stats.percentage}%
                  </div>
                  <div className="text-sm text-slate-500">Attendance Rate</div>
                </div>
              </div>

              {/* Curriculum */}
              <h4 className="font-semibold mb-4 text-lms-text">Course Curriculum</h4>

              {selectedTrainee.curriculum.map((cat) => (
                <div key={cat.name} className="mb-3">
                  <div
                    onClick={() => setExpandedCat(expandedCat === cat.name ? null : cat.name)}
                    className={cn(
                      "bg-white border border-slate-200 p-4 rounded-xl flex justify-between items-center cursor-pointer transition-all hover:border-lms-accent",
                      expandedCat === cat.name && "bg-lms-primary text-white border-lms-primary"
                    )}
                  >
                    <span className="font-semibold">{cat.name}</span>
                    <span className="text-lg font-bold transition-transform">
                      {expandedCat === cat.name ? '−' : '+'}
                    </span>
                  </div>

                  {expandedCat === cat.name && (
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-4 py-4 px-1">
                      {cat.modules.map((mod) => {
                        const status = getModuleStatus(String(mod));
                        return (
                          <div
                            key={mod}
                            onClick={() => handleModuleClick(String(mod))}
                            className={cn(
                              "bg-white border-2 border-slate-200 rounded-xl p-4 text-center cursor-pointer transition-all hover:border-lms-accent hover:-translate-y-1",
                              selectedModule === String(mod) && "bg-lms-primary text-white border-lms-primary",
                              status === 'completed' && "border-green-500",
                              status === 'in-progress' && "border-yellow-500"
                            )}
                          >
                            <div className="text-2xl font-bold">{mod}</div>
                            <div className="text-xs mt-1 opacity-70 capitalize">{status}</div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}

              {/* Action Panel */}
              {selectedModule && (
                <div className="bg-lms-primary text-white mt-6 p-6 rounded-2xl flex items-center justify-between shadow-xl">
                  <div>
                    <h3 className="m-0 mb-1 text-lg font-bold">Module {selectedModule}</h3>
                    <div className="opacity-80 text-sm">
                      Status: {getModuleStatus(selectedModule)}
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      onStartAssessment(
                        selectedTrainee.info.id,
                        selectedTrainee.info.name,
                        selectedModule
                      )
                    }
                    className="bg-white text-lms-primary border-none py-3 px-6 rounded-xl font-bold cursor-pointer transition-transform hover:scale-105"
                  >
                    Initiate Assessment 🚀
                  </button>
                </div>
              )}
            </div>
          </div>
        )
      )}
    </div>
  );
};

export default Trainees;
