import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getPendingReviews, submitGrade } from '@/services/api';
import type { PendingReview } from '@/types/lms';
import { toast } from 'sonner';

const Reviews: React.FC = () => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<PendingReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [currentReview, setCurrentReview] = useState<PendingReview | null>(null);
  const [score, setScore] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadReviews();
  }, [user]);

  const loadReviews = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getPendingReviews(user.id, user.role);
      setReviews(data);
    } catch (error) {
      console.error('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  const openGradeModal = (review: PendingReview) => {
    setCurrentReview(review);
    setScore('');
    setShowModal(true);
  };

  const handleGrade = async () => {
    if (!currentReview) return;
    
    const scoreNum = parseFloat(score);
    if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 10) {
      toast.error('Please enter a valid score (0-10)');
      return;
    }

    setSubmitting(true);
    try {
      await submitGrade(currentReview.resultId, scoreNum);
      toast.success('Grade submitted successfully!');
      setShowModal(false);
      setReviews(reviews.filter((r) => r.resultId !== currentReview.resultId));
    } catch (error) {
      toast.error('Failed to submit grade');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <h2 className="text-3xl font-bold text-lms-primary mb-6">Pending Reviews</h2>

      <div className="lms-card p-0 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400">Loading...</div>
        ) : reviews.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            No pending reviews. All caught up! 🎉
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {reviews.map((review) => (
              <div
                key={review.resultId}
                className="p-5 flex items-center justify-between hover:bg-slate-50 transition-colors"
              >
                <div>
                  <div className="font-bold text-lms-primary">{review.traineeName}</div>
                  <div className="text-sm text-slate-500">
                    Module {review.moduleNum} • Attempt #{review.attempt} • {review.date}
                  </div>
                </div>
                <button
                  onClick={() => openGradeModal(review)}
                  className="px-4 py-2 bg-lms-accent text-white rounded-lg font-semibold text-sm hover:bg-blue-600 transition-colors"
                >
                  Grade
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Grading Modal */}
      {showModal && currentReview && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="lms-card w-[450px] p-8 m-0 shadow-2xl">
            <h3 className="text-xl font-bold text-lms-primary mt-0 mb-5">
              Grade Submission
            </h3>

            {/* Media Links */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-5">
              {currentReview.videoLink && currentReview.videoLink !== 'Skipped' && (
                <div className="mb-3 flex items-center gap-3">
                  <span className="text-xl">📺</span>
                  <a
                    href={currentReview.videoLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-lms-accent font-semibold text-sm hover:underline"
                  >
                    Watch Video Recording
                  </a>
                </div>
              )}
              {currentReview.audioLink && currentReview.audioLink !== 'Skipped' && (
                <div className="flex items-center gap-3">
                  <span className="text-xl">🎧</span>
                  <a
                    href={currentReview.audioLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-lms-accent font-semibold text-sm hover:underline"
                  >
                    Listen Audio Recording
                  </a>
                </div>
              )}
              {(!currentReview.videoLink || currentReview.videoLink === 'Skipped') &&
                (!currentReview.audioLink || currentReview.audioLink === 'Skipped') && (
                  <div className="text-slate-400 text-sm">No recordings available</div>
                )}
            </div>

            {/* Score Input */}
            <div className="mb-5">
              <label className="block font-semibold mb-2 text-lms-text text-sm">
                Score (0-10)
              </label>
              <input
                type="number"
                value={score}
                onChange={(e) => setScore(e.target.value)}
                className="lms-input mb-0"
                min={0}
                max={10}
                step={0.1}
                placeholder="e.g. 8.5"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleGrade}
                disabled={submitting}
                className="flex-1 py-3.5 bg-green-500 text-white border-none rounded-xl font-semibold cursor-pointer hover:bg-green-600 disabled:opacity-50"
              >
                {submitting ? 'Saving...' : 'Save Grade'}
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-3.5 bg-slate-200 text-slate-600 border-none rounded-xl font-semibold cursor-pointer hover:bg-slate-300"
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

export default Reviews;
