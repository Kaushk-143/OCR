import OpenAI from 'openai';
import { ExtractionResult } from '../types';

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true, // Note: In production, use a backend proxy
});

export const extractTextFromImage = async (imageFile: File): Promise<string> => {
  try {
    const base64Image = await fileToBase64(imageFile);
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Extract all text and visual elements (pictures, symbols, charts, graphs, tables, handwritten notes, icons) from this image, preserving the original format.
Return the content in a structured document format with the following guidelines:
1. Extract all readable text exactly as it appears
2. Identify all visual elements with precise positioning information
3. For each visual element, indicate it with a special tag [IMAGE_CROP_NEEDED: description] where:
   - description explains what the image contains, its type, and precise position
   - Use specific positioning terms like "top-left", "center", "bottom-right", etc.
   - Include size hints like "small", "medium", "large" when applicable
   - NEEDED indicates that the image should be cropped from the original
4. Maintain the original layout and structure as closely as possible
5. Use markdown formatting to organize the content:
   - Use headers for sections
   - Use lists for multiple items
   - Use code blocks for exact text extracts
   - Place [IMAGE_CROP_NEEDED: ...] tags where images should be inserted
6. If no content is found, return "No content detected in image"

Example format:
# Document Title

## Section 1
Main text content here...

[IMAGE_CROP_NEEDED: Large bar chart showing sales data for Q1-Q4 positioned in the center of the page]

More text content...

[IMAGE_CROP_NEEDED: Small handwritten note in the bottom-right corner saying "Important - Review by Friday"]`
            },
            {
              type: "image_url",
              image_url: {
                url: base64Image,
                detail: "high"
              }
            }
          ]
        }
      ],
      max_tokens: 4000,
    });

    return response.choices[0]?.message?.content || 'No content detected in image';
  } catch (error) {
    console.error('Error extracting content from image:', error);
    throw new Error('Failed to extract content from image');
  }
};

export const extractTextFromImageDataUrl = async (imageDataUrl: string): Promise<string> => {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Extract all text and visual elements (pictures, symbols, charts, graphs, tables, handwritten notes, icons) from this image, preserving the original format.
Return the content in a structured document format with the following guidelines:
1. Extract all readable text exactly as it appears
2. Identify all visual elements with precise positioning information
3. For each visual element, indicate it with a special tag [IMAGE_CROP_NEEDED: description] where:
   - description explains what the image contains, its type, and precise position
   - Use specific positioning terms like "top-left", "center", "bottom-right", etc.
   - Include size hints like "small", "medium", "large" when applicable
   - NEEDED indicates that the image should be cropped from the original
4. Maintain the original layout and structure as closely as possible
5. Use markdown formatting to organize the content:
   - Use headers for sections
   - Use lists for multiple items
   - Use code blocks for exact text extracts
   - Place [IMAGE_CROP_NEEDED: ...] tags where images should be inserted
6. If no content is found, return "No content detected in image"

Example format:
# Document Title

## Section 1
Main text content here...

[IMAGE_CROP_NEEDED: Large bar chart showing sales data for Q1-Q4 positioned in the center of the page]

More text content...

[IMAGE_CROP_NEEDED: Small handwritten note in the bottom-right corner saying "Important - Review by Friday"]`
            },
            {
              type: "image_url",
              image_url: {
                url: imageDataUrl,
                detail: "high"
              }
            }
          ]
        }
      ],
      max_tokens: 4000,
    });

    return response.choices[0]?.message?.content || 'No content detected in image';
  } catch (error) {
    console.error('Error extracting content from image:', error);
    throw new Error('Failed to extract content from image');
  }
};

export const processImageWithAI = async (imageFile: File): Promise<ExtractionResult> => {
  const startTime = Date.now();
  
  try {
    const content = await extractTextFromImage(imageFile);
    const processingTime = Date.now() - startTime;
    
    return {
      success: true,
      content,
      processingTime
    };
  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    return {
      success: false,
      content: '',
      error: error instanceof Error ? error.message : 'Failed to process image with AI',
      processingTime
    };
  }
};

export const processPDFWithAI = async (pdfFile: File, setProcessingState: (state: Partial<any>) => void): Promise<ExtractionResult> => {
  const startTime = Date.now();
  
  try {
    // For now, we'll just return a placeholder
    // In a real implementation, this would convert PDF pages to images and process them with AI
    const processingTime = Date.now() - startTime;
    
    return {
      success: true,
      content: `# PDF Content Extraction

## Instructions for Enhanced PDF Processing

To extract both text and visual elements from PDFs with actual image cropping:

1. Convert each PDF page to high-resolution images
2. Process each page image with the enhanced prompt for extracting text and visual elements
3. For each [IMAGE_CROP_NEEDED: ...] tag identified:
   - Use image processing libraries to crop the specific region
   - Save cropped images as separate files
   - Reference these images in the final document
4. Combine results maintaining document structure and page order

[IMAGE_CROP_NEEDED: Flowchart showing the PDF processing workflow in the center of the page]

Key features to implement:
- Multi-page document handling
- Visual element positioning across pages
- Table and chart reconstruction with actual images
- Handwritten note preservation with cropped images
- Layout structure maintenance

This is a placeholder for the actual implementation that would use the enhanced image processing capabilities with actual image cropping.`,
      processingTime
    };
  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    return {
      success: false,
      content: '',
      error: error instanceof Error ? error.message : 'Failed to process PDF with AI',
      processingTime
    };
  }
};

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};