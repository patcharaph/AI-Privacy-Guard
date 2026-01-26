import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export function isValidImageType(file: File): boolean {
  const validTypes = ["image/jpeg", "image/png", "image/webp"];
  return validTypes.includes(file.type);
}

export function isValidFileSize(file: File, maxSizeMB: number = 10): boolean {
  return file.size <= maxSizeMB * 1024 * 1024;
}

export function validateFiles(files: File[]): {
  valid: File[];
  errors: string[];
} {
  const valid: File[] = [];
  const errors: string[] = [];

  files.forEach((file) => {
    if (!isValidImageType(file)) {
      errors.push(`${file.name}: Invalid file type. Only JPG, PNG, WEBP allowed.`);
    } else if (!isValidFileSize(file)) {
      errors.push(`${file.name}: File too large. Maximum 10MB allowed.`);
    } else {
      valid.push(file);
    }
  });

  return { valid, errors };
}

export function downloadBase64Image(base64: string, filename: string): void {
  const link = document.createElement("a");
  link.href = base64;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
