import React, { useState } from 'react';
import { FileText, File, Image, AlertCircle } from 'lucide-react';
import { FileDropzone } from './FileDropzone';
import { useAppContext } from '../context/AppContext';
import { validatePDF, validateImage, validateWord } from '../utils/fileValidation';
import { extractTextFromPDF } from '../utils/pdfProcessor';
import { extractTextFromWord } from '../utils/wordProcessor';
import { processImageWithAI } from '../services/openaiService';

export const UnifiedExtractor: React.FC = () => {
  const { addExtractedContent, setProcessingState } = useAppContext();
  const [error, setError] = useState<string | null>(null);

  // Accept all supported file types
  const getAcceptTypes = () => {
    return {
      'application/pdf': ['.pdf'],
      'image/png': ['.png'], 
      'image/jpg': ['.jpg'], 
      'image/jpeg': ['.jpeg'], 
      'image/webp': ['.webp'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc']
    };
  };

  const handleFileDrop = async (files: File[]) => {
    const file = files[0];
    if (!file) return;

    setError(null);

    // Determine file type and process accordingly
    let validation;
    if (file.type === 'application/pdf') {
      validation = validatePDF(file);
    } else if (file.type.startsWith('image/')) {
      validation = validateImage(file);
    } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
               file.type === 'application/msword' ||
               file.name.toLowerCase().endsWith('.docx') ||
               file.name.toLowerCase().endsWith('.doc')) {
      validation = validateWord(file);
    } else {
      setError('Unsupported file type. Please upload a PDF, image, or Word document.');
      return;
    }

    if (!validation.isValid) {
      setError(validation.error || 'Invalid file');
      return;
    }

    // Start processing
    setProcessingState({
      isProcessing: true,
      progress: 0,
      currentStep: `Analyzing ${file.name}...`,
      error: null,
    });

    try {
      setProcessingState({
        isProcessing: true,
        progress: 25,
        currentStep: 'Extracting text content...',
      });

      let result;
      let method;

      // Process based on file type
      if (file.type === 'application/pdf') {
        // For PDFs, try direct extraction first
        result = await extractTextFromPDF(file);
        method = 'direct';
        
        // If direct extraction doesn't yield much content, we could fall back to AI
        // For now, we'll keep it simple and use direct extraction
      } else if (file.type.startsWith('image/')) {
        // For images, use AI OCR
        result = await processImageWithAI(file);
        method = 'ocr';
      } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
                 file.type === 'application/msword' ||
                 file.name.toLowerCase().endsWith('.docx') ||
                 file.name.toLowerCase().endsWith('.doc')) {
        // For Word documents, use direct extraction
        result = await extractTextFromWord(file);
        method = 'word';
      }

      setProcessingState({
        isProcessing: true,
        progress: 75,
        currentStep: 'Processing extracted text...',
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      setProcessingState({
        isProcessing: true,
        progress: 100,
        currentStep: 'Finalizing...',
      });

      // Add extracted content
      addExtractedContent({
        id: Date.now().toString(),
        filename: file.name,
        method: method as any,
        content: result.content,
        timestamp: new Date(),
        fileSize: file.size,
        processingTime: result.processingTime,
        // Store the original file for image processing
        originalFile: file,
      });

      setProcessingState({
        isProcessing: false,
        progress: 0,
        currentStep: '',
        error: null,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to extract text';
      setError(errorMessage);
      setProcessingState({
        isProcessing: false,
        progress: 0,
        currentStep: '',
        error: errorMessage,
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-blue-100 rounded-full">
            <FileText className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Document Text Extraction
        </h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Upload any document (PDF, image, or Word) and extract text automatically. 
          The system will choose the best extraction method based on your file type.
        </p>
      </div>

      <FileDropzone
        onFileDrop={handleFileDrop}
        accept={getAcceptTypes()}
        icon="pdf"
        className="max-w-2xl mx-auto"
      />

      {error && (
        <div className="max-w-2xl mx-auto bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">How it works:</h3>
        <ul className="text-blue-800 space-y-1 text-sm">
          <li>• Upload any supported document (PDF, image, or Word)</li>
          <li>• System automatically detects the best extraction method</li>
          <li>• Text-based documents: Direct extraction without AI</li>
          <li>• Images: OCR using OpenAI API</li>
          <li>• Extracted text appears in the results panel</li>
        </ul>
      </div>
    </div>
  );
};