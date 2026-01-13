import React, { useState } from 'react';
import { inviteTrainer } from '@/services/api';
import { toast } from 'sonner';

const AddTrainer: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim()) {
      toast.error('Please fill all fields');
      return;
    }

    setLoading(true);
    try {
      const result = await inviteTrainer(name, email);
      if (result.status === 'success') {
        toast.success('Invitation sent successfully!');
        setName('');
        setEmail('');
      } else {
        toast.error(result.message || 'Failed to send invitation');
      }
    } catch (error) {
      toast.error('Failed to send invitation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <h2 className="text-3xl font-bold text-lms-primary mb-6">Invite New Trainer</h2>

      <div className="lms-card">
        <div className="bg-blue-50 text-blue-800 p-4 rounded-lg mb-6 text-sm border border-blue-200">
          ℹ️ <b>Note:</b> The trainer will receive an email invitation to set their own
          password securely.
        </div>

        <div className="mb-5">
          <label className="block font-semibold mb-2 text-lms-text">Trainer Full Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="lms-input"
            placeholder="e.g. John Doe"
          />
        </div>

        <div className="mb-5">
          <label className="block font-semibold mb-2 text-lms-text">Email Address</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="lms-input"
            placeholder="e.g. john@example.com"
          />
        </div>

        <button onClick={handleSubmit} disabled={loading} className="lms-btn">
          {loading ? 'Sending...' : 'Send Invitation'}
        </button>
      </div>
    </div>
  );
};

export default AddTrainer;
