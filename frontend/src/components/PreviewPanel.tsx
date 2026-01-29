"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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

interface PreviewCanvasProps {
  result: ProcessedImageResult;
  showOriginal: boolean;
  editMode: boolean;
  blurMode: "gaussian" | "pixelation" | "emoji";
  blurIntensity: number;
  emoji: string;
  addDetectionType: "face" | "license_plate";
  deletedDetections: ProcessedImageResult["detections"];
  onToggleDetection: (detectionId: string, detectionIndex: number) => void;
  onDeleteDetection: (detectionId: string, detectionIndex: number) => void;
  onAddDetection: (
    bbox: { x: number; y: number; width: number; height: number },
    detectionType: "face" | "license_plate"
  ) => void;
}

const drawManualOverlay = (
  ctx: CanvasRenderingContext2D,
  det: { x: number; y: number; width: number; height: number },
  blurMode: "gaussian" | "pixelation" | "emoji",
  blurIntensity: number,
  emoji: string
) => {
  const { x, y, width, height } = det;
  if (width <= 0 || height <= 0) return;

  if (blurMode === "emoji") {
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    const radius = Math.min(width, height) / 2;
    const eyeR = Math.max(3, radius / 6);
    ctx.save();
    ctx.fillStyle = "#FFD84D";
    ctx.strokeStyle = "#E0B443";
    ctx.lineWidth = Math.max(2, radius / 12);
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#2B2B2B";
    ctx.beginPath();
    ctx.arc(centerX - radius / 3, centerY - radius / 4, eyeR, 0, Math.PI * 2);
    ctx.arc(centerX + radius / 3, centerY - radius / 4, eyeR, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = Math.max(2, radius / 10);
    ctx.beginPath();
    ctx.arc(centerX, centerY + radius / 6, radius / 2, 0, Math.PI);
    ctx.stroke();
    ctx.restore();
    return;
  }

  const alpha = Math.min(0.9, 0.3 + blurIntensity / 200);
  ctx.save();
  ctx.fillStyle = `rgba(128, 128, 128, ${alpha})`;
  ctx.fillRect(x, y, width, height);
  ctx.restore();
};

const getPaddedRect = (
  det: { x: number; y: number; width: number; height: number },
  maxW: number,
  maxH: number,
  pad: number = 4
) => {
  const x1 = Math.max(0, det.x - pad);
  const y1 = Math.max(0, det.y - pad);
  const x2 = Math.min(maxW, det.x + det.width + pad);
  const y2 = Math.min(maxH, det.y + det.height + pad);
  return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
};

function PreviewCanvas({
  result,
  showOriginal,
  editMode,
  blurMode,
  blurIntensity,
  emoji,
  addDetectionType,
  deletedDetections,
  onToggleDetection,
  onDeleteDetection,
  onAddDetection,
}: PreviewCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const originalRef = useRef<HTMLImageElement | null>(null);
  const processedRef = useRef<HTMLImageElement | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragCurrent, setDragCurrent] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const longPressTimer = useRef<number | null>(null);
  const longPressTriggered = useRef(false);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const original = originalRef.current;
    const processed = processedRef.current;
    if (!canvas || !original || !processed) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (showOriginal) {
      ctx.drawImage(original, 0, 0);
      return;
    }

    ctx.drawImage(processed, 0, 0);
    result.detections.forEach((det) => {
      if (!det.enabled) return;
      if (!det.id?.startsWith("manual_")) return;
      drawManualOverlay(ctx, det, blurMode, blurIntensity, emoji);
    });
    deletedDetections.forEach((det) => {
      const padded = getPaddedRect(det, original.width, original.height, 6);
      ctx.drawImage(
        original,
        padded.x,
        padded.y,
        padded.width,
        padded.height,
        padded.x,
        padded.y,
        padded.width,
        padded.height
      );
    });
    result.detections.forEach((det) => {
      if (det.enabled) return;
      ctx.drawImage(
        original,
        det.x,
        det.y,
        det.width,
        det.height,
        det.x,
        det.y,
        det.width,
        det.height
      );
    });
  }, [result.detections, showOriginal, blurMode, blurIntensity, emoji]);

  useEffect(() => {
    const original = new Image();
    const processed = new Image();
    let loaded = 0;
    const handleLoad = () => {
      loaded += 1;
      if (loaded < 2) return;
      originalRef.current = original;
      processedRef.current = processed;
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = processed.width;
        canvas.height = processed.height;
      }
      drawCanvas();
    };
    original.onload = handleLoad;
    processed.onload = handleLoad;
    original.src = result.original_image_base64;
    processed.src = result.processed_image_base64;
  }, [result.original_image_base64, result.processed_image_base64, drawCanvas]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  const getLocalPoint = (
    e: React.PointerEvent<HTMLCanvasElement> | React.MouseEvent<HTMLCanvasElement>
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const cssX = e.clientX - rect.left;
    const cssY = e.clientY - rect.top;
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      cssX,
      cssY,
      imgX: cssX * scaleX,
      imgY: cssY * scaleY,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!editMode) return;
    const point = getLocalPoint(e);
    if (!point) return;
    longPressTriggered.current = false;
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
    longPressTimer.current = window.setTimeout(() => {
      const clickX = point.imgX;
      const clickY = point.imgY;
      const clickedIndex = result.detections.findIndex(
        (d) =>
          clickX >= d.x &&
          clickX <= d.x + d.width &&
          clickY >= d.y &&
          clickY <= d.y + d.height
      );
      if (clickedIndex !== -1) {
        longPressTriggered.current = true;
        onDeleteDetection(result.detections[clickedIndex].id, clickedIndex);
      }
    }, 600);
    setDragStart({ x: point.cssX, y: point.cssY });
    setDragCurrent({ x: point.cssX, y: point.cssY });
    setIsDragging(false);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!editMode || !dragStart) return;
    const point = getLocalPoint(e);
    if (!point) return;
    const dx = point.cssX - dragStart.x;
    const dy = point.cssY - dragStart.y;
    if (!isDragging && Math.hypot(dx, dy) > 4) {
      setIsDragging(true);
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
    }
    setDragCurrent({ x: point.cssX, y: point.cssY });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!editMode || !dragStart) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const end = dragCurrent ?? dragStart;

    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    if (longPressTriggered.current) {
      longPressTriggered.current = false;
    } else if (!isDragging) {
      const clickX = dragStart.x * scaleX;
      const clickY = dragStart.y * scaleY;
      const clickedIndex = result.detections.findIndex(
        (d) =>
          clickX >= d.x &&
          clickX <= d.x + d.width &&
          clickY >= d.y &&
          clickY <= d.y + d.height
      );
      if (clickedIndex !== -1) {
        onToggleDetection(result.detections[clickedIndex].id, clickedIndex);
      }
    } else {
      const x1 = Math.min(dragStart.x, end.x) * scaleX;
      const y1 = Math.min(dragStart.y, end.y) * scaleY;
      const x2 = Math.max(dragStart.x, end.x) * scaleX;
      const y2 = Math.max(dragStart.y, end.y) * scaleY;
      const width = x2 - x1;
      const height = y2 - y1;
      if (width >= 10 && height >= 10) {
      onAddDetection(
        { x: Math.round(x1), y: Math.round(y1), width: Math.round(width), height: Math.round(height) },
        addDetectionType
      );
    }
    }

    setDragStart(null);
    setDragCurrent(null);
    setIsDragging(false);
  };

  return (
    <div className="relative w-full">
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={() => {
          if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
          }
          longPressTriggered.current = false;
          setDragStart(null);
          setDragCurrent(null);
          setIsDragging(false);
        }}
        className={cn("w-full h-auto block", editMode && "cursor-crosshair")}
      />
      {editMode && dragStart && dragCurrent && (
        <div
          className="absolute border-2 border-primary-400 bg-primary-200/20 pointer-events-none"
          style={{
            left: Math.min(dragStart.x, dragCurrent.x),
            top: Math.min(dragStart.y, dragCurrent.y),
            width: Math.abs(dragCurrent.x - dragStart.x),
            height: Math.abs(dragCurrent.y - dragStart.y),
          }}
        />
      )}
    </div>
  );
}

interface PreviewPanelProps {
  results: ProcessedImageResult[];
  isProcessing: boolean;
  onReportMissed: (imageId: string) => void;
  onResultsChange?: (results: ProcessedImageResult[]) => void;
  blurMode: "gaussian" | "pixelation" | "emoji";
  blurIntensity: number;
  emoji: string;
}

export function PreviewPanel({
  results,
  isProcessing,
  onReportMissed,
  onResultsChange,
  blurMode,
  blurIntensity,
  emoji,
}: PreviewPanelProps) {
  const [showOriginal, setShowOriginal] = useState<Record<string, boolean>>({});
  const [editMode, setEditMode] = useState<Record<string, boolean>>({});
  const [addDetectionType, setAddDetectionType] = useState<
    Record<string, "face" | "license_plate">
  >({});
  const [deletedDetections, setDeletedDetections] = useState<
    Record<string, ProcessedImageResult["detections"]>
  >({});
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

  const renderCompositeDataUrl = async (
    result: ProcessedImageResult,
    showOriginal: boolean = false
  ): Promise<string> => {
    const original = new Image();
    const processed = new Image();
    await Promise.all([
      new Promise<void>((resolve) => {
        original.onload = () => resolve();
        original.src = result.original_image_base64;
      }),
      new Promise<void>((resolve) => {
        processed.onload = () => resolve();
        processed.src = result.processed_image_base64;
      }),
    ]);

    const canvas = document.createElement("canvas");
    canvas.width = processed.width;
    canvas.height = processed.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return result.processed_image_base64;

    if (showOriginal) {
      ctx.drawImage(original, 0, 0);
      return canvas.toDataURL("image/png");
    }

    ctx.drawImage(processed, 0, 0);
    result.detections.forEach((det) => {
      if (!det.enabled) return;
      if (!det.id?.startsWith("manual_")) return;
      drawManualOverlay(ctx, det, blurMode, blurIntensity, emoji);
    });
    (deletedDetections[result.image_id] || []).forEach((det) => {
      const padded = getPaddedRect(det, original.width, original.height, 6);
      ctx.drawImage(
        original,
        padded.x,
        padded.y,
        padded.width,
        padded.height,
        padded.x,
        padded.y,
        padded.width,
        padded.height
      );
    });
    result.detections.forEach((det) => {
      if (det.enabled) return;
      ctx.drawImage(
        original,
        det.x,
        det.y,
        det.width,
        det.height,
        det.x,
        det.y,
        det.width,
        det.height
      );
    });
    return canvas.toDataURL("image/png");
  };

  const confirmDownload = (result: ProcessedImageResult) => {
    const filename = `protected_${result.original_filename}`;
    renderCompositeDataUrl(result)
      .then((dataUrl) => downloadBase64Image(dataUrl, filename))
      .finally(() => setShowDownloadSummary(null));
  };

  const handleDownloadAll = async () => {
    if (results.length === 0) return;

    setDownloadingZip(true);
    try {
      const zip = new JSZip();

      for (const result of results) {
        const dataUrl = await renderCompositeDataUrl(result);
        const base64Data = dataUrl.split(",")[1];
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

  const toggleDetection = (
    imageId: string,
    detectionId: string,
    detectionIndex: number
  ) => {
    if (!onResultsChange) return;
    const newResults = results.map((r) => {
      if (r.image_id === imageId) {
        return {
          ...r,
          detections: r.detections.map((d, idx) => {
            if (detectionId) {
              return d.id === detectionId ? { ...d, enabled: !d.enabled } : d;
            }
            return idx === detectionIndex ? { ...d, enabled: !d.enabled } : d;
          }),
        };
      }
      return r;
    });
    onResultsChange(newResults);
  };

  const addDetection = (
    imageId: string,
    bbox: { x: number; y: number; width: number; height: number },
    detectionType: "face" | "license_plate"
  ) => {
    if (!onResultsChange) return;
    const newResults = results.map((r) => {
      if (r.image_id === imageId) {
        return {
          ...r,
          detections: [
            ...r.detections,
            {
              id: `manual_${detectionType}_${Date.now()}_${Math.random()
                .toString(36)
                .slice(2, 7)}`,
              x: bbox.x,
              y: bbox.y,
              width: bbox.width,
              height: bbox.height,
              confidence: 1,
              detection_type: detectionType,
              enabled: true,
            },
          ],
        };
      }
      return r;
    });
    onResultsChange(newResults);
  };

  const removeDetection = (imageId: string, detectionId: string, detectionIndex: number) => {
    if (!onResultsChange) return;
    const newResults = results.map((r) => {
      if (r.image_id === imageId) {
        const target =
          detectionIndex >= 0 ? r.detections[detectionIndex] : r.detections.find((d) => d.id === detectionId);
        const newDetections = r.detections.filter((d, idx) =>
          detectionIndex >= 0 ? idx !== detectionIndex : d.id !== detectionId
        );
        if (target) {
          setDeletedDetections((prev) => ({
            ...prev,
            [imageId]: [...(prev[imageId] || []), target],
          }));
        }
        return { ...r, detections: newDetections };
      }
      return r;
    });
    onResultsChange(newResults);
  };

  const getAddType = (imageId: string) =>
    addDetectionType[imageId] || "face";

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

          return (
            <div
              key={result.image_id}
              className="bg-white border border-slate-200 rounded-xl overflow-hidden"
            >
              {/* Image Preview - Click to toggle detections in Edit mode */}
              <div 
                className={cn("relative bg-slate-100")}
              >
                <PreviewCanvas
                  result={result}
                  showOriginal={isShowingOriginal}
                  editMode={editMode[result.image_id]}
                  blurMode={blurMode}
                  blurIntensity={blurIntensity}
                  emoji={emoji}
                  addDetectionType={getAddType(result.image_id)}
                  deletedDetections={deletedDetections[result.image_id] || []}
                  onToggleDetection={(id, idx) =>
                    toggleDetection(result.image_id, id, idx)
                  }
                  onDeleteDetection={(id, idx) =>
                    removeDetection(result.image_id, id, idx)
                  }
                  onAddDetection={(bbox, detectionType) =>
                    addDetection(result.image_id, bbox, detectionType)
                  }
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

                {/* Edit Button (inside image) */}
                <button
                  onClick={() =>
                    setEditMode((prev) => ({
                      ...prev,
                      [result.image_id]: !prev[result.image_id],
                    }))
                  }
                  className={cn(
                    "absolute bottom-3 right-3 px-3 py-1.5 text-xs font-semibold rounded-lg shadow",
                    editMode[result.image_id]
                      ? "bg-primary-600 text-white"
                      : "bg-slate-900/80 text-white hover:bg-slate-900"
                  )}
                >
                  {editMode[result.image_id] ? "Save" : "Edit"}
                </button>

                {/* Edit Mode Hint */}
                {editMode[result.image_id] && (
                  <div className="absolute bottom-3 left-3 bg-black/70 text-white text-xs px-2 py-1 rounded">
                    Click to toggle • Drag to add • Hold on image to delete
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
                    {(() => {
                      let faceIndex = 0;
                      let plateIndex = 0;
                      return result.detections.map((det, idx) => {
                        const labelIndex =
                          det.detection_type === "face"
                            ? ++faceIndex
                            : ++plateIndex;
                        const label =
                          det.detection_type === "face"
                            ? `Face${String(labelIndex).padStart(2, "0")}`
                            : `Plate${String(labelIndex).padStart(2, "0")}`;
                        const detKey = det.id || `idx_${idx}`;
                        return (
                          <button
                            key={det.id || idx}
                            onClick={() => {
                              if (editMode[result.image_id] && onResultsChange) {
                                toggleDetection(result.image_id, det.id, idx);
                              }
                            }}
                            className={cn(
                              "px-2 py-0.5 text-xs font-medium rounded-full transition-all",
                              det.enabled
                                ? det.detection_type === "face"
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-purple-100 text-purple-700"
                                : "bg-red-50 text-red-400 border border-red-200",
                              editMode[result.image_id] &&
                                "cursor-pointer hover:ring-2 ring-primary-300"
                            )}
                            disabled={!editMode[result.image_id]}
                            title={editMode[result.image_id] ? "Tap to toggle, hold to delete" : undefined}
                          >
                            {det.detection_type === "face" ? "👤" : "🚗"}{" "}
                            {det.enabled ? label : "Disabled"}
                          </button>
                        );
                      });
                    })()}
                  </div>
                )}

                {/* Add Detection Type (Edit Mode) */}
                {editMode[result.image_id] && (
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs text-slate-500">Add detection:</span>
                    <button
                      onClick={() =>
                        setAddDetectionType((prev) => ({
                          ...prev,
                          [result.image_id]: "face",
                        }))
                      }
                      className={cn(
                        "px-2 py-0.5 text-xs font-medium rounded-full border",
                        getAddType(result.image_id) === "face"
                          ? "border-blue-300 bg-blue-50 text-blue-700"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      )}
                    >
                      Face
                    </button>
                    <button
                      onClick={() =>
                        setAddDetectionType((prev) => ({
                          ...prev,
                          [result.image_id]: "license_plate",
                        }))
                      }
                      className={cn(
                        "px-2 py-0.5 text-xs font-medium rounded-full border",
                        getAddType(result.image_id) === "license_plate"
                          ? "border-purple-300 bg-purple-50 text-purple-700"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      )}
                    >
                      Plate
                    </button>
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
