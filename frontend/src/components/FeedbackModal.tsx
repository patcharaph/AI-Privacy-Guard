"use client";

import { useState } from "react";
import { X, AlertTriangle, Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (missedType: "face" | "license_plate", comment: string) => Promise<void>;
  imageId?: string;
}

export function FeedbackModal({
  isOpen,
  onClose,
  onSubmit,
  imageId,
}: FeedbackModalProps) {
  const [missedType, setMissedType] = useState<"face" | "license_plate">("face");
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit(missedType, comment);
      setSubmitted(true);
      setTimeout(() => {
        onClose();
        setSubmitted(false);
        setComment("");
        setMissedType("face");
      }, 2000);
    } catch (error) {
      console.error("Feedback submission failed:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <h3 className="text-lg font-semibold text-slate-800">
              Report Missed Detection
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {submitted ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-green-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h4 className="text-lg font-semibold text-slate-800">
                Thank you for your feedback!
              </h4>
              <p className="text-sm text-slate-600 mt-1">
                This helps us improve our detection accuracy.
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm text-slate-600">
                Help us improve by reporting what the AI missed detecting in your image.
              </p>

              {/* Missed Type Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  What did the AI miss?
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setMissedType("face")}
                    className={cn(
                      "flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all",
                      missedType === "face"
                        ? "border-primary-500 bg-primary-50 text-primary-700"
                        : "border-slate-200 hover:border-slate-300 text-slate-600"
                    )}
                  >
                    <span className="text-xl">👤</span>
                    <span className="font-medium">Face</span>
                  </button>
                  <button
                    onClick={() => setMissedType("license_plate")}
                    className={cn(
                      "flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all",
                      missedType === "license_plate"
                        ? "border-primary-500 bg-primary-50 text-primary-700"
                        : "border-slate-200 hover:border-slate-300 text-slate-600"
                    )}
                  >
                    <span className="text-xl">🚗</span>
                    <span className="font-medium">License Plate</span>
                  </button>
                </div>
              </div>

              {/* Comment */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Additional details (optional)
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Describe where the missed detection is located..."
                  maxLength={500}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                />
                <p className="text-xs text-slate-500 mt-1 text-right">
                  {comment.length}/500
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!submitted && (
          <div className="flex items-center justify-end gap-3 p-4 border-t border-slate-200 bg-slate-50">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Submit Feedback
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
