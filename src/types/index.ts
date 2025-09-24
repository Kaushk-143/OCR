export interface ExtractedContent {
  id: string;
  filename: string;
  method: 'direct' | 'ocr' | 'ai-pdf' | 'word';
  content: string;
  timestamp: Date;
  fileSize: number;
  processingTime: number;
  // Add optional field to store original file data for image processing
  originalFile?: Blob;
}

export interface ProcessingState {
  isProcessing: boolean;
  progress: number;
  currentStep: string;
  error: string | null;
}

export interface FileValidation {
  isValid: boolean;
  error?: string;
}

export interface ExtractionResult {
  success: boolean;
  content: string;
  error?: string;
  processingTime: number;
}

export type ExtractionMethod = 'direct' | 'ocr' | 'ai-pdf' | 'word';

export interface AppState {
  extractedContents: ExtractedContent[];
  processingState: ProcessingState;
  activeMethod: ExtractionMethod;
}

export interface AppContextType extends AppState {
  addExtractedContent: (content: ExtractedContent) => void;
  setProcessingState: (state: Partial<ProcessingState>) => void;
  setActiveMethod: (method: ExtractionMethod) => void;
  clearExtractedContents: () => void;
  removeExtractedContent: (id: string) => void;
}