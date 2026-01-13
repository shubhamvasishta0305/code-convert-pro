import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getPendingReviews, submitGrade } from '@/services/api';
import type { PendingReview } from '@/types/lms';
import { toast } from 'sonner';

const Reviews: React.FC = () => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<PendingReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [grades, setGrades] = useState<Record<string, string>>({});

  useEffect(() => {
    loadReviews();
  }, [user]);

  const loadReviews = async () => {
    if (!user) return;
    try {
      const data = await getPendingReviews(user.id, user.role);
      setReviews(data);
    } catch (error) {
      console.error('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  const handleGrade = async (resultId: string) => {
    const score = parseInt(grades[resultId]);
    if (isNaN(score) || score < 0 || score > 100) {
      toast.error('Please enter a valid score (0-100)');
      return;
    }

    try {
      await submitGrade(resultId, score);
      toast.success('Grade submitted!');
      setReviews(reviews.filter((r) => r.resultId !== resultId));
    } catch (error) {
      toast.error('Failed to submit grade');
    }
  };

  return (
    <div className="animate-fade-in">
      <h2 className="text-3xl font-bold text-lms-primary mb-6">Pending Reviews</h2>

      {loading ? (
        <div className="lms-card text-center text-slate-400 py-8">Loading...</div>
      ) : reviews.length === 0 ? (
        <div className="lms-card text-center text-slate-400 py-8">
          No pending reviews. All caught up! 🎉
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div key={review.resultId} className="lms-card">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-bold text-lms-primary text-lg m-0">
                    {review.traineeName}
                  </h3>
                  <div className="text-sm text-slate-500">
                    Module {review.moduleNum} • Attempt #{review.attempt} • {review.date}
                  </div>
                </div>
              </div>

              <div className="flex gap-4 mb-4">
                {review.videoLink !== 'Skipped' && (
                  <a
                    href={review.videoLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 p-4 bg-slate-50 rounded-xl text-center hover:bg-slate-100 transition-colors"
                  >
                    <div className="text-2xl mb-1">🎥</div>
                    <div className="text-sm font-medium text-lms-primary">View Video</div>
                  </a>
                )}
                {review.audioLink !== 'Skipped' && (
                  <a
                    href={review.audioLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 p-4 bg-slate-50 rounded-xl text-center hover:bg-slate-100 transition-colors"
                  >
                    <div className="text-2xl mb-1">🎧</div>
                    <div className="text-sm font-medium text-lms-primary">Listen Audio</div>
                  </a>
                )}
              </div>

              <div className="flex gap-3 items-center">
                <input
                  type="number"
                  placeholder="Score (0-100)"
                  value={grades[review.resultId] || ''}
                  onChange={(e) =>
                    setGrades({ ...grades, [review.resultId]: e.target.value })
                  }
                  className="lms-input flex-1 mb-0"
                  min={0}
                  max={100}
                />
                <button
                  onClick={() => handleGrade(review.resultId)}
                  className="px-6 py-3 bg-lms-accent text-white rounded-xl font-semibold hover:bg-blue-600 transition-colors"
                >
                  Submit Grade
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Reviews;
