import * as mammoth from 'mammoth';
import { ExtractionResult } from '../types';

export const extractTextFromWord = async (file: File): Promise<ExtractionResult> => {
  const startTime = Date.now();
  
  try {
    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Use mammoth to extract text from the Word document
    const result = await mammoth.extractRawText({ arrayBuffer });
    
    const processingTime = Date.now() - startTime;
    
    return {
      success: true,
      content: result.value,
      processingTime
    };
  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    return {
      success: false,
      content: '',
      error: error instanceof Error ? error.message : 'Failed to extract text from Word document',
      processingTime
    };
  }
};