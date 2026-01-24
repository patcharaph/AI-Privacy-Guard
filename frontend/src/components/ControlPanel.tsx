"use client";

import { Sliders, Eye, EyeOff, Grid3X3, Smile } from "lucide-react";
import { cn } from "@/lib/utils";

export type BlurMode = "gaussian" | "pixelation" | "emoji";

interface ControlPanelProps {
  blurMode: BlurMode;
  onBlurModeChange: (mode: BlurMode) => void;
  blurIntensity: number;
  onBlurIntensityChange: (intensity: number) => void;
  detectFaces: boolean;
  onDetectFacesChange: (detect: boolean) => void;
  detectPlates: boolean;
  onDetectPlatesChange: (detect: boolean) => void;
  disabled?: boolean;
}

const blurModes: { value: BlurMode; label: string; icon: React.ReactNode }[] = [
  { value: "gaussian", label: "Gaussian Blur", icon: <Eye className="w-4 h-4" /> },
  { value: "pixelation", label: "Pixelation", icon: <Grid3X3 className="w-4 h-4" /> },
  { value: "emoji", label: "Emoji Overlay", icon: <Smile className="w-4 h-4" /> },
];

export function ControlPanel({
  blurMode,
  onBlurModeChange,
  blurIntensity,
  onBlurIntensityChange,
  detectFaces,
  onDetectFacesChange,
  detectPlates,
  onDetectPlatesChange,
  disabled = false,
}: ControlPanelProps) {
  return (
    <div className="space-y-6">
      {/* Blur Mode Selection */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-3">
          Blur Mode
        </label>
        <div className="grid grid-cols-3 gap-2">
          {blurModes.map((mode) => (
            <button
              key={mode.value}
              onClick={() => onBlurModeChange(mode.value)}
              disabled={disabled}
              className={cn(
                "flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all",
                blurMode === mode.value
                  ? "border-primary-500 bg-primary-50 text-primary-700"
                  : "border-slate-200 hover:border-slate-300 text-slate-600",
                disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              {mode.icon}
              <span className="text-xs font-medium">{mode.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Blur Intensity Slider */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-slate-700">
            Blur Intensity
          </label>
          <span className="text-sm font-semibold text-primary-600">
            {blurIntensity}%
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={blurIntensity}
          onChange={(e) => onBlurIntensityChange(Number(e.target.value))}
          disabled={disabled}
          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <div className="flex justify-between text-xs text-slate-500 mt-1">
          <span>Light</span>
          <span>Strong</span>
        </div>
      </div>

      {/* Detection Options */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-3">
          Detection Options
        </label>
        <div className="space-y-3">
          <label
            className={cn(
              "flex items-center gap-3 p-3 bg-white border rounded-lg cursor-pointer transition-colors",
              detectFaces ? "border-primary-300 bg-primary-50" : "border-slate-200",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            <input
              type="checkbox"
              checked={detectFaces}
              onChange={(e) => onDetectFacesChange(e.target.checked)}
              disabled={disabled}
              className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
            />
            <div className="flex-1">
              <span className="text-sm font-medium text-slate-700">
                Detect Faces
              </span>
              <p className="text-xs text-slate-500">
                Automatically find and blur human faces
              </p>
            </div>
          </label>

          <label
            className={cn(
              "flex items-center gap-3 p-3 bg-white border rounded-lg cursor-pointer transition-colors",
              detectPlates ? "border-primary-300 bg-primary-50" : "border-slate-200",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            <input
              type="checkbox"
              checked={detectPlates}
              onChange={(e) => onDetectPlatesChange(e.target.checked)}
              disabled={disabled}
              className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
            />
            <div className="flex-1">
              <span className="text-sm font-medium text-slate-700">
                Detect License Plates
              </span>
              <p className="text-xs text-slate-500">
                Automatically find and blur vehicle plates
              </p>
            </div>
          </label>
        </div>
      </div>
    </div>
  );
}
