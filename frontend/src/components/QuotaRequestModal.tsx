"use client";

import { useState } from "react";
import { X, Gift } from "lucide-react";

interface QuotaRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (useCase: string, email: string) => Promise<void>;
}

const USE_CASES = [
  { value: "creator", label: "Content Creator" },
  { value: "car_dealer", label: "Car Dealer / Automotive" },
  { value: "hr", label: "HR / Recruitment" },
  { value: "real_estate", label: "Real Estate" },
  { value: "personal", label: "Personal Use" },
  { value: "other", label: "Other" },
];

export function QuotaRequestModal({ isOpen, onClose, onSubmit }: QuotaRequestModalProps) {
  const [useCase, setUseCase] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!useCase) return;

    setIsSubmitting(true);
    try {
      await onSubmit(useCase, email);
      setSubmitted(true);
    } catch (error) {
      console.error("Failed to request quota:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setUseCase("");
    setEmail("");
    setSubmitted(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />
      <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 p-6">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600"
        >
          <X className="w-5 h-5" />
        </button>

        {submitted ? (
          <div className="text-center py-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Gift className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">
              You got 5 extra batches!
            </h3>
            <p className="text-slate-600 mb-4">
              Thank you for your feedback. Enjoy your extra quota!
            </p>
            <button
              onClick={handleClose}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              Continue
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-primary-100 rounded-lg">
                <Gift className="w-6 h-6 text-primary-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">
                  Request Extra Quota
                </h3>
                <p className="text-sm text-slate-500">Free for BETA users</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  What do you use AI Privacy Guard for?
                </label>
                <select
                  value={useCase}
                  onChange={(e) => setUseCase(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">Select your use case...</option>
                  {USE_CASES.map((uc) => (
                    <option key={uc.value} value={uc.value}>
                      {uc.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Email (optional)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Get notified about new features and updates
                </p>
              </div>

              <button
                type="submit"
                disabled={!useCase || isSubmitting}
                className="w-full py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Requesting..." : "Get 5 Extra Batches"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
