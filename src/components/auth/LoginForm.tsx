import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { loginUser } from '@/services/api';
import { toast } from 'sonner';

interface LoginFormProps {
  onToggle: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onToggle }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await loginUser(email, password);
      if (result.status === 'success' && result.user) {
        login(result.user);
        toast.success('Welcome back!');
      } else {
        toast.error(result.message || 'Invalid credentials');
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Login failed. Check your backend connection.';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="animate-fade-in">
      <div className="relative mb-5">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder=" "
          required
          className="w-full p-3.5 border-2 border-slate-200 rounded-lg text-base bg-slate-50 transition-all outline-none focus:border-lms-accent focus:bg-white peer"
        />
        <label className="absolute left-4 top-4 text-slate-400 text-base pointer-events-none transition-all bg-transparent peer-focus:top-[-8px] peer-focus:left-2.5 peer-focus:text-xs peer-focus:text-lms-accent peer-focus:bg-white peer-focus:px-1 peer-focus:font-semibold peer-[:not(:placeholder-shown)]:top-[-8px] peer-[:not(:placeholder-shown)]:left-2.5 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:bg-white peer-[:not(:placeholder-shown)]:px-1">
          Email Address
        </label>
      </div>

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
          Password
        </label>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3.5 bg-lms-accent text-white border-none rounded-lg text-base font-semibold cursor-pointer transition-all mt-2.5 shadow-md hover:bg-blue-600 hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-50"
      >
        {loading ? 'Signing In...' : 'Sign In'}
      </button>

      <div
        onClick={onToggle}
        className="inline-block text-sm text-slate-500 mt-6 cursor-pointer"
      >
        New to Einstein360? <b className="text-lms-accent hover:underline">Create Account</b>
      </div>
    </form>
  );
};

export default LoginForm;
