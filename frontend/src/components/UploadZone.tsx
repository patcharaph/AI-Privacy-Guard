"use client";

import { useCallback, useEffect, useState } from "react";
import { Upload, X, AlertCircle } from "lucide-react";
import { cn, formatFileSize, validateFiles } from "@/lib/utils";

interface UploadZoneProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
  maxFiles?: number;
  disabled?: boolean;
}

export function UploadZone({
  files,
  onFilesChange,
  maxFiles = 5,
  disabled = false,
}: UploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [primaryPreviewUrl, setPrimaryPreviewUrl] = useState<string | null>(null);

  const handleFiles = useCallback(
    (newFiles: FileList | File[]) => {
      const fileArray = Array.from(newFiles);
      const { valid, errors: validationErrors } = validateFiles(fileArray);

      setErrors(validationErrors);

      if (valid.length > 0) {
        const combined = [...files, ...valid].slice(0, maxFiles);
        onFilesChange(combined);
      }
    },
    [files, maxFiles, onFilesChange]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (!disabled && e.dataTransfer.files) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [disabled, handleFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        handleFiles(e.target.files);
      }
    },
    [handleFiles]
  );

  const removeFile = useCallback(
    (index: number) => {
      const newFiles = files.filter((_, i) => i !== index);
      onFilesChange(newFiles);
    },
    [files, onFilesChange]
  );

  const clearAll = useCallback(() => {
    onFilesChange([]);
    setErrors([]);
  }, [onFilesChange]);


  useEffect(() => {
    if (files.length === 0) {
      setPrimaryPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(files[files.length - 1]);
    setPrimaryPreviewUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [files]);

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          "relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 cursor-pointer",
          isDragOver
            ? "border-primary-500 bg-primary-50"
            : "border-slate-300 hover:border-primary-400 hover:bg-slate-50",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <input
          type="file"
          multiple
          accept=".jpg,.jpeg,.png,.webp"
          onChange={handleInputChange}
          disabled={disabled}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
        />
        <div className="flex flex-col items-center gap-3">
          <div className="p-3 bg-primary-100 rounded-full">
            <Upload className="w-8 h-8 text-primary-600" />
          </div>
          <div>
            <p className="text-lg font-medium text-slate-700">
              Drop images here or click to browse
            </p>
            <p className="text-sm text-slate-500 mt-1">
              JPG, PNG, WEBP • Max 10MB each • Up to {maxFiles} images
            </p>
          </div>
        </div>
      </div>


      {primaryPreviewUrl && (
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <img
            src={primaryPreviewUrl}
            alt={files[files.length - 1]?.name || "Uploaded preview"}
            className="w-full max-h-[420px] object-cover"
          />
          {!disabled && (
            <button
              onClick={() =>
                files.length <= 1 ? clearAll() : removeFile(files.length - 1)
              }
              className="absolute right-3 top-3 rounded-full bg-white/90 p-2 text-slate-700 shadow-md hover:bg-white"
              aria-label="Remove image"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Privacy Notice */}
      <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
        <div className="p-1 bg-green-100 rounded-full mt-0.5">
          <svg
            className="w-4 h-4 text-green-600"
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
        </div>
        <div className="text-sm">
          <p className="font-medium text-green-800">Your privacy is protected</p>
          <p className="text-green-700">
            Images are processed temporarily and never stored or used for training.
          </p>
        </div>
      </div>

      {/* Validation Errors */}
      {errors.length > 0 && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 text-red-700 mb-2">
            <AlertCircle className="w-4 h-4" />
            <span className="font-medium">Upload errors</span>
          </div>
          <ul className="text-sm text-red-600 space-y-1">
            {errors.map((error, i) => (
              <li key={i}>• {error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* File List */}
      {files.length > 1 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">
              {files.length} image{files.length !== 1 ? "s" : ""} selected
            </span>
            <button
              onClick={clearAll}
              disabled={disabled}
              className="text-sm text-red-600 hover:text-red-700 disabled:opacity-50"
            >
              Clear all
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {files.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="relative group bg-white border border-slate-200 rounded-lg overflow-hidden"
              >
                <div className="aspect-square bg-slate-100 flex items-center justify-center overflow-hidden">
                  <img
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                    className="w-full h-full object-cover"
                    onLoad={(e) => URL.revokeObjectURL((e.target as HTMLImageElement).src)}
                  />
                </div>
                <div className="p-2">
                  <p className="text-xs font-medium text-slate-700 truncate">
                    {file.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatFileSize(file.size)}
                  </p>
                </div>
                {!disabled && (
                  <button
                    onClick={() => removeFile(index)}
                    className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
