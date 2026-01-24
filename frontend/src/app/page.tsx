"use client";

import { useState, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { Shield, Loader2, AlertCircle } from "lucide-react";
import {
  UploadZone,
  ControlPanel,
  PreviewPanel,
  FeedbackModal,
  BlurMode,
} from "@/components";
import { processImages, submitFeedback, ProcessedImageResult } from "@/lib/api";

export default function Home() {
  // Upload state
  const [files, setFiles] = useState<File[]>([]);

  // Control state
  const [blurMode, setBlurMode] = useState<BlurMode>("gaussian");
  const [blurIntensity, setBlurIntensity] = useState(80);
  const [detectFaces, setDetectFaces] = useState(true);
  const [detectPlates, setDetectPlates] = useState(true);

  // Results state
  const [results, setResults] = useState<ProcessedImageResult[]>([]);

  // Feedback modal state
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [feedbackImageId, setFeedbackImageId] = useState<string | undefined>();

  // Processing mutation
  const processMutation = useMutation({
    mutationFn: async () => {
      return processImages(files, {
        blur_mode: blurMode,
        blur_intensity: blurIntensity,
        detect_faces: detectFaces,
        detect_plates: detectPlates,
      });
    },
    onSuccess: (data) => {
      setResults(data.results);
    },
  });

  // Feedback mutation
  const feedbackMutation = useMutation({
    mutationFn: async ({
      missedType,
      comment,
    }: {
      missedType: "face" | "license_plate";
      comment: string;
    }) => {
      return submitFeedback({
        missed_type: missedType,
        comment: comment || undefined,
        image_id: feedbackImageId,
      });
    },
  });

  const handleProcess = useCallback(() => {
    if (files.length > 0) {
      processMutation.mutate();
    }
  }, [files, processMutation]);

  const handleReportMissed = useCallback((imageId: string) => {
    setFeedbackImageId(imageId);
    setFeedbackModalOpen(true);
  }, []);

  const handleFeedbackSubmit = useCallback(
    async (missedType: "face" | "license_plate", comment: string) => {
      await feedbackMutation.mutateAsync({ missedType, comment });
    },
    [feedbackMutation]
  );

  const handleReset = useCallback(() => {
    setFiles([]);
    setResults([]);
    processMutation.reset();
  }, [processMutation]);

  const isProcessing = processMutation.isPending;
  const hasFiles = files.length > 0;
  const hasResults = results.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-100 rounded-lg">
                <Shield className="w-6 h-6 text-primary-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800">
                  AI Privacy Guard
                </h1>
                <p className="text-xs text-slate-500">BETA</p>
              </div>
            </div>
            {hasResults && (
              <button
                onClick={handleReset}
                className="text-sm text-slate-600 hover:text-slate-800 font-medium"
              >
                Start Over
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Panel - Upload & Controls */}
          <div className="space-y-6">
            {/* Upload Section */}
            <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-800 mb-4">
                Upload Images
              </h2>
              <UploadZone
                files={files}
                onFilesChange={setFiles}
                maxFiles={10}
                disabled={isProcessing}
              />
            </section>

            {/* Controls Section */}
            <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-800 mb-4">
                Privacy Settings
              </h2>
              <ControlPanel
                blurMode={blurMode}
                onBlurModeChange={setBlurMode}
                blurIntensity={blurIntensity}
                onBlurIntensityChange={setBlurIntensity}
                detectFaces={detectFaces}
                onDetectFacesChange={setDetectFaces}
                detectPlates={detectPlates}
                onDetectPlatesChange={setDetectPlates}
                disabled={isProcessing}
              />
            </section>

            {/* Process Button */}
            <div className="space-y-3">
              <button
                onClick={handleProcess}
                disabled={!hasFiles || isProcessing}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-primary-600 text-white text-lg font-semibold rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary-600/20"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Shield className="w-5 h-5" />
                    Apply Privacy Blur
                  </>
                )}
              </button>

              {/* Privacy Notice */}
              <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
                <svg
                  className="w-4 h-4 text-green-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
                Images are processed temporarily and never stored
              </div>
            </div>

            {/* Error Display */}
            {processMutation.isError && (
              <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-red-800">Processing failed</p>
                  <p className="text-sm text-red-600 mt-1">
                    {processMutation.error?.message || "An unexpected error occurred"}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Right Panel - Preview */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 min-h-[600px]">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">
              Preview & Results
            </h2>
            <PreviewPanel
              results={results}
              originalFiles={files}
              isProcessing={isProcessing}
              onReportMissed={handleReportMissed}
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-slate-500">
              AI Privacy Guard BETA - Protecting your visual privacy
            </p>
            <div className="flex items-center gap-4 text-sm text-slate-500">
              <span>Max 10 images per batch</span>
              <span>•</span>
              <span>Max 10MB per image</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Feedback Modal */}
      <FeedbackModal
        isOpen={feedbackModalOpen}
        onClose={() => setFeedbackModalOpen(false)}
        onSubmit={handleFeedbackSubmit}
        imageId={feedbackImageId}
      />
    </div>
  );
}
