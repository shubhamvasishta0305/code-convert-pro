import React, { useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Dashboard from '@/components/views/Dashboard';
import CreateBatch from '@/components/views/CreateBatch';
import Attendance from '@/components/views/Attendance';
import Trainees from '@/components/views/Trainees';
import Reviews from '@/components/views/Reviews';
import AddTrainer from '@/components/views/AddTrainer';
import Assessment from '@/components/views/Assessment';

type NavItem = 'dash' | 'create' | 'att' | 'users' | 'reviews' | 'add_trainer';

const MainApp: React.FC = () => {
  const [activeNav, setActiveNav] = useState<NavItem>('dash');
  const [assessmentData, setAssessmentData] = useState<{
    traineeId: string;
    traineeName: string;
    moduleNum: string;
  } | null>(null);

  const handleStartAssessment = (
    traineeId: string,
    traineeName: string,
    moduleNum: string
  ) => {
    setAssessmentData({ traineeId, traineeName, moduleNum });
  };

  const handleCloseAssessment = () => {
    setAssessmentData(null);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-lms-bg">
      <Sidebar activeNav={activeNav} onNavigate={setActiveNav} />

      <main className="flex-1 p-10 overflow-y-auto">
        {activeNav === 'dash' && <Dashboard onSelectBatch={() => setActiveNav('users')} />}
        {activeNav === 'create' && <CreateBatch />}
        {activeNav === 'att' && <Attendance />}
        {activeNav === 'users' && <Trainees onStartAssessment={handleStartAssessment} />}
        {activeNav === 'reviews' && <Reviews />}
        {activeNav === 'add_trainer' && <AddTrainer />}
      </main>

      {assessmentData && (
        <Assessment
          traineeId={assessmentData.traineeId}
          traineeName={assessmentData.traineeName}
          moduleNum={assessmentData.moduleNum}
          onClose={handleCloseAssessment}
        />
      )}
    </div>
  );
};

export default MainApp;
