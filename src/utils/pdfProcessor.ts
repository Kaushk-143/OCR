import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf';
import { ExtractionResult } from '../types';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

export const extractTextFromPDF = async (file: File): Promise<ExtractionResult> => {
  const startTime = Date.now();
  
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    
    let fullText = '';
    const numPages = pdf.numPages;
    
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      if (pageText) {
        fullText += `--- Page ${pageNum} ---\n${pageText}\n\n`;
      }
    }
    
    if (!fullText.trim()) {
      return {
        success: false,
        content: '',
        error: 'No text content found in the PDF. This might be a scanned document or contain only images.',
        processingTime: Date.now() - startTime,
      };
    }
    
    return {
      success: true,
      content: fullText.trim(),
      processingTime: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      content: '',
      error: error instanceof Error ? error.message : 'Failed to extract text from PDF',
      processingTime: Date.now() - startTime,
    };
  }
};

export const extractImagesFromPDF = async (file: File): Promise<string[]> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    
    const images: string[] = [];
    const numPages = pdf.numPages;
    
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 2.0 });
      
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d')!;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      
      await page.render({
        canvasContext: context,
        viewport: viewport,
      }).promise;
      
      const imageDataUrl = canvas.toDataURL('image/png');
      images.push(imageDataUrl);
    }
    
    return images;
  } catch (error) {
    console.error('Error extracting images from PDF:', error);
    return [];
  }
};