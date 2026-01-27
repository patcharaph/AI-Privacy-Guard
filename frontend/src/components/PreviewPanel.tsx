"use client";

import { useState } from "react";
import {
  Download,
  Eye,
  EyeOff,
  CheckCircle,
  AlertTriangle,
  Loader2,
  FileArchive,
} from "lucide-react";
import { ProcessedImageResult } from "@/lib/api";
import { cn, downloadBase64Image } from "@/lib/utils";
import JSZip from "jszip";
import { saveAs } from "file-saver";

interface PreviewPanelProps {
  results: ProcessedImageResult[];
  originalFiles: File[];
  isProcessing: boolean;
  onReportMissed: (imageId: string) => void;
  blurMode?: "gaussian" | "pixelation" | "emoji";
  blurIntensity?: number;
  emoji?: string;
  onResultsChange?: (results: ProcessedImageResult[]) => void;
}

export function PreviewPanel({
  results,
  originalFiles,
  isProcessing,
  onReportMissed,
  blurMode = "gaussian",
  blurIntensity = 80,
  emoji = "😀",
  onResultsChange,
}: PreviewPanelProps) {
  const [showOriginal, setShowOriginal] = useState<Record<string, boolean>>({});
  const [editMode, setEditMode] = useState<Record<string, boolean>>({});
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [showDownloadSummary, setShowDownloadSummary] = useState<ProcessedImageResult | null>(null);

  // Calculate totals for summary
  const getTotals = (result: ProcessedImageResult) => {
    const faces = result.detections.filter(d => d.detection_type === "face");
    const plates = result.detections.filter(d => d.detection_type === "license_plate");
    return {
      facesProtected: faces.filter(d => d.enabled).length,
      facesDisabled: faces.filter(d => !d.enabled).length,
      platesProtected: plates.filter(d => d.enabled).length,
      platesDisabled: plates.filter(d => !d.enabled).length,
    };
  };

  const toggleOriginal = (imageId: string) => {
    setShowOriginal((prev) => ({
      ...prev,
      [imageId]: !prev[imageId],
    }));
  };

  const handleDownloadSingle = (result: ProcessedImageResult) => {
    // Show summary before download
    setShowDownloadSummary(result);
  };

  const confirmDownload = (result: ProcessedImageResult) => {
    const filename = `protected_${result.original_filename}`;
    downloadBase64Image(result.processed_image_base64, filename);
    setShowDownloadSummary(null);
  };

  const handleDownloadAll = async () => {
    if (results.length === 0) return;

    setDownloadingZip(true);
    try {
      const zip = new JSZip();

      for (const result of results) {
        const base64Data = result.processed_image_base64.split(",")[1];
        const filename = `protected_${result.original_filename}`;
        zip.file(filename, base64Data, { base64: true });
      }

      const blob = await zip.generateAsync({ type: "blob" });
      saveAs(blob, "protected_images.zip");
    } catch (error) {
      console.error("Error creating ZIP:", error);
    } finally {
      setDownloadingZip(false);
    }
  };

  const getOriginalPreview = (filename: string): string | null => {
    const file = originalFiles.find((f) => f.name === filename);
    if (file) {
      return URL.createObjectURL(file);
    }
    return null;
  };

  if (isProcessing) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
        <Loader2 className="w-12 h-12 text-primary-600 animate-spin mb-4" />
        <h3 className="text-lg font-semibold text-slate-700">
          Processing your images...
        </h3>
        <p className="text-sm text-slate-500 mt-1">
          AI is detecting faces and license plates
        </p>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
        <div className="p-4 bg-slate-100 rounded-full mb-4">
          <Eye className="w-8 h-8 text-slate-400" />
        </div>
        <h3 className="text-lg font-semibold text-slate-700">
          Preview will appear here
        </h3>
        <p className="text-sm text-slate-500 mt-1">
          Upload images and click &quot;Apply Privacy Blur&quot; to see results
        </p>
      </div>
    );
  }

  const totalDetections = results.reduce(
    (sum, r) => sum + r.detections.length,
    0
  );

  return (
    <div className="space-y-4">
      {/* Summary Header */}
      <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center gap-3">
          <CheckCircle className="w-6 h-6 text-green-600" />
          <div>
            <p className="font-semibold text-green-800">
              {results.length} image{results.length !== 1 ? "s" : ""} protected
            </p>
            <p className="text-sm text-green-700">
              {totalDetections} detection{totalDetections !== 1 ? "s" : ""} blurred
            </p>
          </div>
        </div>
        <button
          onClick={handleDownloadAll}
          disabled={downloadingZip}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
        >
          {downloadingZip ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <FileArchive className="w-4 h-4" />
          )}
          Download All (ZIP)
        </button>
      </div>

      {/* Image Results Grid */}
      <div className="grid gap-4">
        {results.map((result) => {
          const isShowingOriginal = showOriginal[result.image_id];
          const originalUrl = getOriginalPreview(result.original_filename);

          return (
            <div
              key={result.image_id}
              className="bg-white border border-slate-200 rounded-xl overflow-hidden"
            >
              {/* Image Preview - Click to toggle detections in Edit mode */}
              <div 
                className={cn(
                  "relative aspect-video bg-slate-100",
                  editMode[result.image_id] && "cursor-pointer"
                )}
                onClick={(e) => {
                  if (!editMode[result.image_id] || !onResultsChange) return;
                  
                  // Get click position relative to image
                  const rect = e.currentTarget.getBoundingClientRect();
                  const img = e.currentTarget.querySelector('img');
                  if (!img) return;
                  
                  const imgRect = img.getBoundingClientRect();
                  const scaleX = img.naturalWidth / imgRect.width;
                  const scaleY = img.naturalHeight / imgRect.height;
                  const clickX = (e.clientX - imgRect.left) * scaleX;
                  const clickY = (e.clientY - imgRect.top) * scaleY;
                  
                  // Find clicked detection
                  const clickedDet = result.detections.find(d => 
                    clickX >= d.x && clickX <= d.x + d.width &&
                    clickY >= d.y && clickY <= d.y + d.height
                  );
                  
                  if (clickedDet) {
                    const newResults = results.map(r => {
                      if (r.image_id === result.image_id) {
                        return {
                          ...r,
                          detections: r.detections.map(d => 
                            d.id === clickedDet.id ? { ...d, enabled: !d.enabled } : d
                          )
                        };
                      }
                      return r;
                    });
                    onResultsChange(newResults);
                  }
                }}
              >
                <img
                  src={
                    isShowingOriginal && originalUrl
                      ? originalUrl
                      : result.processed_image_base64
                  }
                  alt={result.original_filename}
                  className="w-full h-full object-contain"
                />

                {/* Protected Badge */}
                {!isShowingOriginal && (
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 bg-green-500 text-white text-xs font-medium rounded-full">
                    <CheckCircle className="w-3 h-3" />
                    Protected
                  </div>
                )}

                {/* Detection Count Badge */}
                <div className="absolute top-3 right-3 px-2.5 py-1 bg-slate-900/70 text-white text-xs font-medium rounded-full">
                  {result.detections.filter(d => d.enabled).length}/{result.detections.length} active
                </div>

                {/* Edit Mode Hint */}
                {editMode[result.image_id] && (
                  <div className="absolute bottom-3 left-3 bg-black/70 text-white text-xs px-2 py-1 rounded">
                    Click on blurred area to toggle
                  </div>
                )}
              </div>

              {/* Image Info & Actions */}
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-medium text-slate-700 truncate max-w-[200px]">
                      {result.original_filename}
                    </p>
                    <p className="text-xs text-slate-500">
                      Processed in {result.processing_time_ms.toFixed(0)}ms
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Edit Mode Toggle */}
                    <button
                      onClick={() => setEditMode(prev => ({ ...prev, [result.image_id]: !prev[result.image_id] }))}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border transition-colors",
                        editMode[result.image_id]
                          ? "border-primary-300 bg-primary-50 text-primary-700"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      )}
                    >
                      Edit
                    </button>

                    {/* Toggle Original/Protected */}
                    <button
                      onClick={() => toggleOriginal(result.image_id)}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border transition-colors",
                        isShowingOriginal
                          ? "border-amber-300 bg-amber-50 text-amber-700"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      )}
                    >
                      {isShowingOriginal ? (
                        <>
                          <EyeOff className="w-4 h-4" />
                          Original
                        </>
                      ) : (
                        <>
                          <Eye className="w-4 h-4" />
                          Protected
                        </>
                      )}
                    </button>

                    {/* Download Button */}
                    <button
                      onClick={() => handleDownloadSingle(result)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                  </div>
                </div>

                {/* Detection Details - Clickable in Edit Mode */}
                {result.detections.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {result.detections.map((det, idx) => (
                      <button
                        key={det.id || idx}
                        onClick={() => {
                          if (editMode[result.image_id] && onResultsChange) {
                            const newResults = results.map(r => {
                              if (r.image_id === result.image_id) {
                                return {
                                  ...r,
                                  detections: r.detections.map(d => 
                                    d.id === det.id ? { ...d, enabled: !d.enabled } : d
                                  )
                                };
                              }
                              return r;
                            });
                            onResultsChange(newResults);
                          }
                        }}
                        className={cn(
                          "px-2 py-0.5 text-xs font-medium rounded-full transition-all",
                          det.enabled 
                            ? det.detection_type === "face" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
                            : "bg-red-50 text-red-400 border border-red-200",
                          editMode[result.image_id] && "cursor-pointer hover:ring-2 ring-primary-300"
                        )}
                        disabled={!editMode[result.image_id]}
                      >
                        {det.detection_type === "face" ? "👤" : "🚗"}{" "}
                        {det.enabled ? (det.detection_type === "face" ? "Face" : "Plate") : "Disabled"}
                      </button>
                    ))}
                  </div>
                )}

                {/* Report Missed Detection */}
                <button
                  onClick={() => onReportMissed(result.image_id)}
                  className="flex items-center gap-1.5 text-sm text-amber-600 hover:text-amber-700"
                >
                  <AlertTriangle className="w-4 h-4" />
                  Report missed detection
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Download Summary Modal */}
      {showDownloadSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowDownloadSummary(null)} />
          <div className="relative bg-white rounded-xl p-6 max-w-sm mx-4 shadow-xl">
            <h3 className="font-semibold text-slate-800 text-lg mb-4">Final Check</h3>
            
            {(() => {
              const totals = getTotals(showDownloadSummary);
              const hasDisabled = totals.facesDisabled > 0 || totals.platesDisabled > 0;
              
              return (
                <>
                  <div className="space-y-2 mb-4">
                    {(totals.facesProtected > 0 || totals.facesDisabled > 0) && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">👤 Faces protected:</span>
                        <span className="font-medium text-green-600">{totals.facesProtected}</span>
                      </div>
                    )}
                    {totals.facesDisabled > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">👤 Faces disabled:</span>
                        <span className="font-medium text-red-600">{totals.facesDisabled}</span>
                      </div>
                    )}
                    {(totals.platesProtected > 0 || totals.platesDisabled > 0) && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">🚗 Plates protected:</span>
                        <span className="font-medium text-green-600">{totals.platesProtected}</span>
                      </div>
                    )}
                    {totals.platesDisabled > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">🚗 Plates disabled:</span>
                        <span className="font-medium text-red-600">{totals.platesDisabled}</span>
                      </div>
                    )}
                  </div>

                  {hasDisabled && (
                    <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg mb-4">
                      <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-amber-700">
                        Some detections are disabled and will NOT be blurred in the downloaded image.
                      </p>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setShowDownloadSummary(null);
                        setEditMode(prev => ({ ...prev, [showDownloadSummary.image_id]: true }));
                      }}
                      className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200"
                    >
                      Review Again
                    </button>
                    <button
                      onClick={() => confirmDownload(showDownloadSummary)}
                      className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700"
                    >
                      Download
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
