import React, { useState, useEffect } from 'react';
import LoginForm from '@/components/auth/LoginForm';
import RegisterForm from '@/components/auth/RegisterForm';
import SetupForm from '@/components/auth/SetupForm';

type AuthMode = 'login' | 'register' | 'setup';

const AuthPage: React.FC = () => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [setupEmail, setSetupEmail] = useState('');

  useEffect(() => {
    // Check URL params for setup mode
    const params = new URLSearchParams(window.location.search);
    const urlMode = params.get('mode');
    const email = params.get('email');

    if (urlMode === 'setup' && email) {
      setMode('setup');
      setSetupEmail(decodeURIComponent(email));
    }
  }, []);

  const getSubtitle = () => {
    switch (mode) {
      case 'register':
        return 'Join the platform today';
      case 'setup':
        return 'Complete your account setup';
      default:
        return 'Manage your training ecosystem';
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-blue-600 via-blue-700 to-slate-900">
      <div className="bg-white/95 backdrop-blur-lg p-10 rounded-3xl w-full max-w-[400px] text-center shadow-2xl animate-slide-up">
        <h1 className="text-lms-accent text-3xl font-bold mb-2 tracking-tight">
          🦉 Einstein360
        </h1>
        <p className="text-slate-500 text-sm mb-8">{getSubtitle()}</p>

        {mode === 'login' && (
          <LoginForm onToggle={() => setMode('register')} />
        )}
        
        {mode === 'register' && (
          <RegisterForm onToggle={() => setMode('login')} />
        )}
        
        {mode === 'setup' && (
          <SetupForm email={setupEmail} />
        )}
      </div>
    </div>
  );
};

export default AuthPage;
