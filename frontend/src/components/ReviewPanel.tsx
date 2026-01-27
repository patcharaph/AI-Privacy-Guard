"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Eye, EyeOff, RotateCcw, Download, AlertTriangle } from "lucide-react";
import { BoundingBox, ProcessedImageResult } from "@/lib/api";

interface ReviewPanelProps {
  result: ProcessedImageResult;
  blurMode: "gaussian" | "pixelation" | "emoji";
  blurIntensity: number;
  emoji: string;
  onDetectionsChange: (detections: BoundingBox[]) => void;
}

export function ReviewPanel({
  result,
  blurMode,
  blurIntensity,
  emoji,
  onDetectionsChange,
}: ReviewPanelProps) {
  const [editMode, setEditMode] = useState(false);
  const [detections, setDetections] = useState<BoundingBox[]>(result.detections);
  const [showOriginal, setShowOriginal] = useState(false);
  const [showConfirmDownload, setShowConfirmDownload] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const disabledCount = detections.filter((d) => !d.enabled).length;
  const enabledCount = detections.filter((d) => d.enabled).length;

  // Load and draw image with blur overlays
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      canvas.width = img.width;
      canvas.height = img.height;
      drawCanvas();
    };
    img.src = result.original_image_base64;
  }, [result.original_image_base64]);

  // Redraw when detections or showOriginal changes
  useEffect(() => {
    drawCanvas();
  }, [detections, showOriginal, editMode]);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Draw original image
    ctx.drawImage(img, 0, 0);

    if (showOriginal) return;

    // Draw blur for enabled detections
    detections.forEach((detection) => {
      if (!detection.enabled) return;

      const { x, y, width, height } = detection;

      if (blurMode === "gaussian" || blurMode === "pixelation") {
        // Simple colored overlay for blur effect (actual blur would need more complex canvas operations)
        ctx.fillStyle = "rgba(128, 128, 128, 0.8)";
        ctx.fillRect(x, y, width, height);
      } else if (blurMode === "emoji") {
        // Draw emoji
        const fontSize = Math.min(width, height);
        ctx.font = `${fontSize}px Arial`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(emoji, x + width / 2, y + height / 2);
      }
    });

    // Draw edit mode overlays
    if (editMode) {
      detections.forEach((detection) => {
        const { x, y, width, height, enabled, detection_type } = detection;

        // Draw border
        ctx.strokeStyle = enabled ? "#22c55e" : "#ef4444";
        ctx.lineWidth = 3;
        ctx.setLineDash(enabled ? [] : [5, 5]);
        ctx.strokeRect(x, y, width, height);
        ctx.setLineDash([]);

        // Draw label
        const label = detection_type === "face" ? "Face" : "Plate";
        const status = enabled ? "ON" : "OFF";
        ctx.fillStyle = enabled ? "#22c55e" : "#ef4444";
        ctx.fillRect(x, y - 24, 70, 24);
        ctx.fillStyle = "white";
        ctx.font = "12px Arial";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(`${label}: ${status}`, x + 4, y - 12);
      });
    }
  }, [detections, showOriginal, editMode, blurMode, emoji]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!editMode) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    // Find clicked detection
    const clickedIndex = detections.findIndex(
      (d) =>
        clickX >= d.x &&
        clickX <= d.x + d.width &&
        clickY >= d.y &&
        clickY <= d.y + d.height
    );

    if (clickedIndex !== -1) {
      const newDetections = [...detections];
      newDetections[clickedIndex] = {
        ...newDetections[clickedIndex],
        enabled: !newDetections[clickedIndex].enabled,
      };
      setDetections(newDetections);
      onDetectionsChange(newDetections);
    }
  };

  const handleReset = () => {
    const resetDetections = detections.map((d) => ({ ...d, enabled: true }));
    setDetections(resetDetections);
    onDetectionsChange(resetDetections);
  };

  const handleDownload = () => {
    if (disabledCount > 0) {
      setShowConfirmDownload(true);
    } else {
      downloadImage();
    }
  };

  const downloadImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Temporarily disable edit mode overlays for clean export
    const wasEditMode = editMode;
    setEditMode(false);

    setTimeout(() => {
      const link = document.createElement("a");
      link.download = `privacy_${result.original_filename}`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      setEditMode(wasEditMode);
      setShowConfirmDownload(false);
    }, 100);
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setEditMode(!editMode)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              editMode
                ? "bg-primary-600 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {editMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {editMode ? "Exit Edit" : "Edit Mode"}
          </button>

          {editMode && (
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200"
            >
              <RotateCcw className="w-4 h-4" />
              Reset AI
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onMouseDown={() => setShowOriginal(true)}
            onMouseUp={() => setShowOriginal(false)}
            onMouseLeave={() => setShowOriginal(false)}
            className="px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200"
          >
            Hold to Compare
          </button>

          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700"
          >
            <Download className="w-4 h-4" />
            Download
          </button>
        </div>
      </div>

      {/* Detection Stats */}
      <div className="flex items-center gap-4 text-sm">
        <span className="text-slate-600">
          Detected: <span className="font-medium">{detections.length}</span> items
        </span>
        {disabledCount > 0 && (
          <span className="text-amber-600 font-medium">
            ({disabledCount} disabled)
          </span>
        )}
      </div>

      {/* Canvas */}
      <div className="relative border border-slate-200 rounded-lg overflow-hidden bg-slate-100">
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          className={`max-w-full h-auto ${editMode ? "cursor-pointer" : ""}`}
        />
        {editMode && (
          <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
            Click on blur to toggle ON/OFF
          </div>
        )}
      </div>

      {/* Confirm Download Modal */}
      {showConfirmDownload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowConfirmDownload(false)} />
          <div className="relative bg-white rounded-xl p-6 max-w-sm mx-4 shadow-xl">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-amber-500 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-slate-800">Confirm Download</h3>
                <p className="text-sm text-slate-600 mt-1">
                  You disabled {disabledCount} detection{disabledCount > 1 ? "s" : ""}. 
                  These areas will NOT be blurred. Are you sure?
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmDownload(false)}
                className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={downloadImage}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700"
              >
                Download Anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
