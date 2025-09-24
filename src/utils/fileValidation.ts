import { FileValidation } from '../types';

export const validatePDF = (file: File): FileValidation => {
  const maxSize = 10 * 1024 * 1024; // 10MB
  const allowedTypes = ['application/pdf'];

  if (!allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: 'Please select a valid PDF file.',
    };
  }

  if (file.size > maxSize) {
    return {
      isValid: false,
      error: 'File size must be less than 10MB.',
    };
  }

  return { isValid: true };
};

export const validateImage = (file: File): FileValidation => {
  const maxSize = 5 * 1024 * 1024; // 5MB
  const allowedTypes = ['image/png', 'image/jpg', 'image/jpeg', 'image/webp'];

  if (!allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: 'Please select a valid image file (PNG, JPG, JPEG, WebP).',
    };
  }

  if (file.size > maxSize) {
    return {
      isValid: false,
      error: 'Image size must be less than 5MB.',
    };
  }

  return { isValid: true };
};

export const validateWord = (file: File): FileValidation => {
  const maxSize = 10 * 1024 * 1024; // 10MB
  const allowedTypes = [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/msword' // .doc (older format)
  ];
  const allowedExtensions = ['.docx', '.doc'];

  // Check file type
  const isCorrectType = allowedTypes.includes(file.type);
  
  // Also check file extension as a fallback
  const hasCorrectExtension = allowedExtensions.some(ext => 
    file.name.toLowerCase().endsWith(ext)
  );

  if (!isCorrectType && !hasCorrectExtension) {
    return {
      isValid: false,
      error: 'Please select a valid Word document (.docx or .doc).',
    };
  }

  if (file.size > maxSize) {
    return {
      isValid: false,
      error: 'File size must be less than 10MB.',
    };
  }

  return { isValid: true };
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};