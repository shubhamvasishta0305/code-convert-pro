import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { completeSetup } from '@/services/api';
import { toast } from 'sonner';

interface SetupFormProps {
  email: string;
}

const SetupForm: React.FC<SetupFormProps> = ({ email }) => {
  const { login } = useAuth();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await completeSetup(email, password);
      if (result.status === 'success' && result.user) {
        login(result.user);
        toast.success('Account activated!');
      } else {
        toast.error(result.message || 'Setup failed');
      }
    } catch (error) {
      toast.error('Setup failed. Check your backend connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="animate-fade-in">
      <h3 className="mt-0 text-slate-800 text-xl font-semibold mb-2">Activate Account</h3>
      <p className="text-sm text-slate-500 mb-5">
        Set a secure password for <br />
        <b className="text-lms-accent">{email}</b>
      </p>

      <div className="relative mb-5">
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder=" "
          required
          className="w-full p-3.5 border-2 border-slate-200 rounded-lg text-base bg-slate-50 transition-all outline-none focus:border-lms-accent focus:bg-white peer"
        />
        <label className="absolute left-4 top-4 text-slate-400 text-base pointer-events-none transition-all bg-transparent peer-focus:top-[-8px] peer-focus:left-2.5 peer-focus:text-xs peer-focus:text-lms-accent peer-focus:bg-white peer-focus:px-1 peer-focus:font-semibold peer-[:not(:placeholder-shown)]:top-[-8px] peer-[:not(:placeholder-shown)]:left-2.5 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:bg-white peer-[:not(:placeholder-shown)]:px-1">
          New Password
        </label>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3.5 bg-lms-accent text-white border-none rounded-lg text-base font-semibold cursor-pointer transition-all mt-2.5 shadow-md hover:bg-blue-600 hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-50"
      >
        {loading ? 'Activating...' : 'Activate & Login'}
      </button>
    </form>
  );
};

export default SetupForm;
