/**
 * Image processing utilities for cropping and embedding images in documents
 */

import { default as cv } from '@techstark/opencv-js';

/**
 * Extract image elements from content and crop them from the original image
 * @param originalImageBlob The original image as a blob
 * @param content The extracted content with image tags
 * @returns Object containing the processed content and cropped images
 */
export const processImageContent = async (
  originalImageBlob: Blob,
  content: string
): Promise<{ processedContent: string; images: { id: string; blob: Blob; description: string }[] }> => {
  // Extract image tags from content
  const imageTags = [...content.matchAll(/\[IMAGE_CROP_NEEDED: (.*?)\]/g)];
  
  // Create image elements for each tag
  const images: { id: string; blob: Blob; description: string }[] = [];
  
  // Check if we have the original image blob
  if (originalImageBlob.size > 0) {
    // For each image tag, create a cropped image from the original
    for (let i = 0; i < imageTags.length; i++) {
      const description = imageTags[i][1];
      const imageId = `img_${i + 1}`;
      
      try {
        // Create a cropped image blob based on the description with a timeout
        const croppedBlob = await Promise.race([
          createCroppedImage(originalImageBlob, description),
          new Promise<Blob>((_, reject) => 
            setTimeout(() => reject(new Error('Image cropping timeout')), 10000)
          )
        ]);
        images.push({
          id: imageId,
          blob: croppedBlob,
          description
        });
      } catch (error) {
        console.warn(`Failed to create cropped image for ${description}, using placeholder:`, error);
        // Fallback to placeholder image
        const placeholderBlob = await createPlaceholderImage(description);
        images.push({
          id: imageId,
          blob: placeholderBlob,
          description
        });
      }
    }
  } else {
    // If we don't have the original image, create placeholder images
    for (let i = 0; i < imageTags.length; i++) {
      const description = imageTags[i][1];
      const imageId = `img_${i + 1}`;
      
      try {
        // Create a placeholder image blob with a timeout
        const placeholderBlob = await Promise.race([
          createPlaceholderImage(description),
          new Promise<Blob>((_, reject) => 
            setTimeout(() => reject(new Error('Placeholder image creation timeout')), 5000)
          )
        ]);
        images.push({
          id: imageId,
          blob: placeholderBlob,
          description
        });
      } catch (error) {
        console.warn(`Failed to create placeholder image for ${description}:`, error);
        // Fallback to empty blob
        images.push({
          id: imageId,
          blob: new Blob([], { type: 'image/png' }),
          description
        });
      }
    }
  }
  
  // Replace image tags with placeholders that can be replaced with actual images
  let processedContent = content;
  for (let i = 0; i < imageTags.length; i++) {
    const imageId = `img_${i + 1}`;
    processedContent = processedContent.replace(
      imageTags[i][0],
      `[IMAGE_PLACEHOLDER:${imageId}]`
    );
  }
  
  return { processedContent, images };
};

/**
 * Generate a Word document with embedded images
 * @param content The text content with image placeholders
 * @param images Array of image objects to embed
 * @param filename Base filename for the document
 */
export const generateWordWithImages = async (
  content: string,
  images: { id: string; blob: Blob; description: string }[],
  filename: string
): Promise<Blob> => {
  // Dynamically import docxtemplater and pizzip
  const [{ default: Docxtemplater }, { default: PizZip }] = await Promise.all([
    import('docxtemplater'),
    import('pizzip')
  ]);
  
  // Create a new PizZip instance
  const zip = new PizZip();
  
  // Create document XML with proper image placeholders
  const createDocumentXML = () => {
    // Split content into paragraphs
    const paragraphs = content.split('\n');
    
    // Create XML for each paragraph
    const xmlParagraphs = paragraphs.map(paragraph => {
      // Handle empty paragraphs
      if (paragraph.trim() === '') {
        return '<w:p/>';
      }
      
      // Check if this paragraph contains an image placeholder
      const imagePlaceholderMatch = paragraph.match(/\[IMAGE_PLACEHOLDER:(.*?)\]/);
      if (imagePlaceholderMatch) {
        const imageId = imagePlaceholderMatch[1];
        return `<w:p>
  <w:r>
    <w:drawing>
      <wp:inline distT="0" distB="0" distL="0" distR="0">
        <wp:extent cx="5486400" cy="4114800"/>
        <wp:effectExtent l="0" t="0" r="0" b="0"/>
        <wp:docPr id="${imageId.replace('img_', '')}" name="Image ${imageId.replace('img_', '')}"/>
        <wp:cNvGraphicFramePr>
          <a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/>
        </wp:cNvGraphicFramePr>
        <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
            <pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
              <pic:nvPicPr>
                <pic:cNvPr id="${imageId.replace('img_', '')}" name="Image ${imageId.replace('img_', '')}"/>
                <pic:cNvPicPr/>
              </pic:nvPicPr>
              <pic:blipFill>
                <a:blip r:embed="rId${imageId.replace('img_', '')}"/>
                <a:stretch>
                  <a:fillRect/>
                </a:stretch>
              </pic:blipFill>
              <pic:spPr>
                <a:xfrm>
                  <a:off x="0" y="0"/>
                  <a:ext cx="5486400" cy="4114800"/>
                </a:xfrm>
                <a:prstGeom prst="rect">
                  <a:avLst/>
                </a:prstGeom>
              </pic:spPr>
            </pic:pic>
          </a:graphicData>
        </a:graphic>
      </wp:inline>
    </w:drawing>
  </w:r>
</w:p>`;
      }
      
      // Handle regular text paragraphs
      const escapedText = paragraph
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      
      return `<w:p>
  <w:r>
    <w:t xml:space="preserve">${escapedText}</w:t>
  </w:r>
</w:p>`;
    });
    
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" 
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
            xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
            xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
            xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
  <w:body>
${xmlParagraphs.join('')}
  </w:body>
</w:document>`;
  };
  
  // Add document.xml
  zip.file("word/document.xml", createDocumentXML());
  
  // Add content types
  zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="png" ContentType="image/png"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`);
  
  // Add relationships
  let relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
`;
  
  // Add image relationships
  images.forEach((image, index) => {
    const relId = parseInt(image.id.replace('img_', ''));
    relsXml += `  <Relationship Id="rId${relId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image${relId}.png"/>\n`;
  });
  
  relsXml += '</Relationships>';
  zip.file("_rels/.rels", relsXml);
  
  // Add document relationships
  let documentRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
`;
  
  images.forEach((image, index) => {
    const relId = parseInt(image.id.replace('img_', ''));
    documentRelsXml += `  <Relationship Id="rId${relId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image${relId}.png"/>\n`;
  });
  
  documentRelsXml += '</Relationships>';
  zip.file("word/_rels/document.xml.rels", documentRelsXml);
  
  // Add styles
  zip.file("word/styles.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
      </w:rPr>
    </w:rPrDefault>
  </w:docDefaults>
</w:styles>`);
  
  // Add media folder and images
  for (const image of images) {
    const imageId = parseInt(image.id.replace('img_', ''));
    // Convert blob to array buffer for PizZip
    const arrayBuffer = await image.blob.arrayBuffer();
    zip.file(`word/media/image${imageId}.png`, arrayBuffer);
  }
  
  // Generate the docx file
  const blob = new Blob([zip.generate({ type: "blob" })], {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  });
  
  return blob;
};

/**
 * Create a cropped image from the original based on description
 * @param originalImageBlob The original image as a blob
 * @param description The description of what to crop
 * @returns A blob containing the cropped image
 */
const createCroppedImage = async (originalImageBlob: Blob, description: string): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    // Add a timeout to prevent hanging
    const timeout = setTimeout(() => {
      reject(new Error('Image cropping timed out'));
    }, 10000); // 10 second timeout
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      clearTimeout(timeout);
      // If we can't get a canvas context, return a placeholder
      createPlaceholderImage(description).then((blob) => {
        clearTimeout(timeout);
        resolve(blob);
      }).catch((error) => {
        clearTimeout(timeout);
        reject(error);
      });
      return;
    }
    
    // Create an image from the blob
    const img = new Image();
    img.onload = async () => {
      try {
        // Use intelligent cropping based on computer vision techniques
        const cropParams = await intelligentCropDetection(img, description);
        
        // Set canvas dimensions to the crop size
        canvas.width = cropParams.width;
        canvas.height = cropParams.height;
        
        // Draw the cropped region
        ctx.drawImage(
          img,
          cropParams.x, cropParams.y, cropParams.width, cropParams.height, // Source rectangle
          0, 0, cropParams.width, cropParams.height // Destination rectangle
        );
        
        canvas.toBlob((blob) => {
          clearTimeout(timeout);
          resolve(blob || new Blob());
        }, 'image/png');
      } catch (error) {
        clearTimeout(timeout);
        // If there's an error in cropping, create a placeholder
        createPlaceholderImage(description).then(resolve).catch(reject);
      }
    };
    
    img.onerror = () => {
      clearTimeout(timeout);
      // If there's an error loading the image, create a placeholder
      createPlaceholderImage(description).then(resolve).catch(reject);
    };
    
    // Convert blob to data URL and set as image source
    const reader = new FileReader();
    reader.onload = () => {
      img.src = reader.result as string;
    };
    reader.onerror = () => {
      clearTimeout(timeout);
      // If there's an error reading the blob, create a placeholder
      createPlaceholderImage(description).then(resolve).catch(reject);
    };
    reader.readAsDataURL(originalImageBlob);
  });
};

/**
 * Intelligent crop detection using computer vision techniques
 * @param img The original image element
 * @param description The AI-generated description of what to crop
 * @returns Object with x, y, width, and height for cropping
 */
const intelligentCropDetection = async (
  img: HTMLImageElement,
  description: string
): Promise<{ x: number; y: number; width: number; height: number }> => {
  const imgWidth = img.width;
  const imgHeight = img.height;
  
  // Initialize with default values
  let x = 0;
  let y = 0;
  let width = imgWidth;
  let height = imgHeight;
  
  // Parse the description for detailed positioning information
  const parsedInfo = parseVisualElementDescription(description);
  
  try {
    // Wait for OpenCV to be ready with a timeout
    await Promise.race([
      new Promise((resolve, reject) => {
        const checkReady = () => {
          // Check if OpenCV is properly loaded
          if (typeof cv === 'undefined') {
            reject(new Error('OpenCV library not loaded. Computer vision features will be disabled.'));
          } else if (cv.getBuildInformation) {
            resolve(true);
          } else {
            setTimeout(checkReady, 100);
          }
        };
        checkReady();
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('OpenCV initialization timeout - computer vision features will be disabled')), 5000)
      )
    ]);
    
    // Apply intelligent cropping based on element type and position
    if (parsedInfo.elementType === 'chart' || parsedInfo.elementType === 'graph') {
      // Charts typically have distinct visual characteristics
      const chartRegion = await detectChartRegionWithCV(img, parsedInfo.position, cv);
      x = chartRegion.x;
      y = chartRegion.y;
      width = chartRegion.width;
      height = chartRegion.height;
    } else if (parsedInfo.elementType === 'icon' || parsedInfo.elementType === 'symbol') {
      // Icons are usually small and have high contrast
      const iconRegion = await detectIconRegionWithCV(img, parsedInfo.position, cv);
      x = iconRegion.x;
      y = iconRegion.y;
      width = iconRegion.width;
      height = iconRegion.height;
    } else if (parsedInfo.elementType === 'picture' || parsedInfo.elementType === 'photo') {
      // Pictures often have varied colors and distinct boundaries
      const pictureRegion = await detectPictureRegionWithCV(img, parsedInfo.position, cv);
      x = pictureRegion.x;
      y = pictureRegion.y;
      width = pictureRegion.width;
      height = pictureRegion.height;
    } else if (parsedInfo.elementType === 'table') {
      // Tables have grid-like structures
      const tableRegion = await detectTableRegionWithCV(img, parsedInfo.position, cv);
      x = tableRegion.x;
      y = tableRegion.y;
      width = tableRegion.width;
      height = tableRegion.height;
    } else if (parsedInfo.elementType === 'handwritten' || parsedInfo.elementType === 'note') {
      // Handwritten notes have unique stroke patterns
      const noteRegion = await detectHandwrittenRegionWithCV(img, parsedInfo.position, cv);
      x = noteRegion.x;
      y = noteRegion.y;
      width = noteRegion.width;
      height = noteRegion.height;
    } else {
      // Fallback to position-based cropping
      const positionRegion = detectByPosition(img, parsedInfo.position);
      x = positionRegion.x;
      y = positionRegion.y;
      width = positionRegion.width;
      height = positionRegion.height;
    }
  } catch (error) {
    console.warn('Computer vision detection failed, falling back to heuristic method:', error);
    // Fallback to position-based cropping
    const positionRegion = detectByPosition(img, parsedInfo.position);
    x = positionRegion.x;
    y = positionRegion.y;
    width = positionRegion.width;
    height = positionRegion.height;
  }
  
  // Ensure bounds are within image dimensions
  x = Math.max(0, Math.min(x, imgWidth - width));
  y = Math.max(0, Math.min(y, imgHeight - height));
  width = Math.min(width, imgWidth - x);
  height = Math.min(height, imgHeight - y);
  
  return { x, y, width, height };
};

/**
 * Parse visual element description to extract element type and position
 * @param description The AI-generated description
 * @returns Object with element type and position information
 */
const parseVisualElementDescription = (description: string): {
  elementType: string;
  position: { top?: boolean; bottom?: boolean; left?: boolean; right?: boolean; center?: boolean };
  sizeHint?: string;
} => {
  const lowerDescription = description.toLowerCase();
  
  // Determine element type
  let elementType = 'unknown';
  if (lowerDescription.includes('chart') || lowerDescription.includes('graph')) {
    elementType = 'chart';
  } else if (lowerDescription.includes('icon') || lowerDescription.includes('symbol')) {
    elementType = 'icon';
  } else if (lowerDescription.includes('picture') || lowerDescription.includes('photo')) {
    elementType = 'picture';
  } else if (lowerDescription.includes('table')) {
    elementType = 'table';
  } else if (lowerDescription.includes('handwritten') || lowerDescription.includes('note')) {
    elementType = 'handwritten';
  }
  
  // Determine position
  const position: { top?: boolean; bottom?: boolean; left?: boolean; right?: boolean; center?: boolean } = {};
  if (lowerDescription.includes('top')) position.top = true;
  if (lowerDescription.includes('bottom')) position.bottom = true;
  if (lowerDescription.includes('left')) position.left = true;
  if (lowerDescription.includes('right')) position.right = true;
  if (lowerDescription.includes('center') || lowerDescription.includes('middle')) position.center = true;
  
  // Determine size hint
  let sizeHint: string | undefined;
  if (lowerDescription.includes('small')) sizeHint = 'small';
  else if (lowerDescription.includes('large')) sizeHint = 'large';
  else if (lowerDescription.includes('medium')) sizeHint = 'medium';
  
  return { elementType, position, sizeHint };
};

/**
 * Detect chart region in an image using computer vision
 * @param img The image element
 * @param position Position information
 * @param cv OpenCV.js module
 * @returns Crop parameters for chart region
 */
const detectChartRegionWithCV = async (
  img: HTMLImageElement,
  position: { top?: boolean; bottom?: boolean; left?: boolean; right?: boolean; center?: boolean },
  cv: any
): Promise<{ x: number; y: number; width: number; height: number }> => {
  // Convert image to OpenCV Mat
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    // Fallback to regular detection if we can't get canvas context
    return detectChartRegion(img, position);
  }
  
  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  
  // Create OpenCV Mat from image data
  const src = cv.matFromImageData(imageData);
  const gray = new cv.Mat();
  const edges = new cv.Mat();
  
  try {
    // Convert to grayscale
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    
    // Apply edge detection
    cv.Canny(gray, edges, 50, 150);
    
    // Find contours
    const contours = new cv.MatVector();
    const hierarchy = new cv.Mat();
    cv.findContours(edges, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
    
    // Find the largest rectangular contour (likely the chart)
    let largestArea = 0;
    let bestRect = null;
    
    for (let i = 0; i < contours.size(); ++i) {
      const contour = contours.get(i);
      const rect = cv.boundingRect(contour);
      
      // Check if this is a reasonable chart size (large and wide)
      if (rect.width > canvas.width * 0.3 && rect.height > canvas.height * 0.2) {
        const area = rect.width * rect.height;
        if (area > largestArea) {
          largestArea = area;
          bestRect = rect;
        }
      }
      contour.delete();
    }
    
    // Clean up
    src.delete();
    gray.delete();
    edges.delete();
    contours.delete();
    hierarchy.delete();
    
    if (bestRect) {
      // Adjust position based on description
      let x = bestRect.x;
      let y = bestRect.y;
      
      if (position.center) {
        x = Math.max(0, Math.min(bestRect.x, canvas.width - bestRect.width));
        y = Math.max(0, Math.min(bestRect.y, canvas.height - bestRect.height));
      } else if (position.right) {
        x = canvas.width - bestRect.width;
      } else if (position.left) {
        x = 0;
      }
      
      if (position.bottom) {
        y = canvas.height - bestRect.height;
      } else if (position.top) {
        y = 0;
      }
      
      return {
        x,
        y,
        width: bestRect.width,
        height: bestRect.height
      };
    }
  } catch (error) {
    console.warn('Computer vision chart detection failed, falling back to heuristic method:', error);
    // Clean up on error
    try {
      src.delete();
      gray.delete();
      edges.delete();
    } catch (e) {
      // Ignore cleanup errors
    }
    // Fallback to regular detection
    return detectChartRegion(img, position);
  }
  
  // Fallback to regular detection
  return detectChartRegion(img, position);
};

/**
 * Detect chart region in an image
 * @param img The image element
 * @param position Position information
 * @returns Crop parameters for chart region
 */
const detectChartRegion = (
  img: HTMLImageElement,
  position: { top?: boolean; bottom?: boolean; left?: boolean; right?: boolean; center?: boolean }
): { x: number; y: number; width: number; height: number } => {
  const imgWidth = img.width;
  const imgHeight = img.height;
  
  // Charts are typically wider than they are tall
  let width = imgWidth * 0.6;
  let height = imgHeight * 0.4;
  
  // Position based on description
  let x = 0;
  let y = 0;
  
  if (position.center) {
    x = (imgWidth - width) / 2;
    y = (imgHeight - height) / 2;
  } else if (position.right) {
    x = imgWidth - width;
  } else if (position.left) {
    x = 0;
  } else {
    // Default to center horizontally
    x = (imgWidth - width) / 2;
  }
  
  if (position.bottom) {
    y = imgHeight - height;
  } else if (position.top) {
    y = 0;
  } else {
    // Default to center vertically
    y = (imgHeight - height) / 2;
  }
  
  return { x, y, width, height };
};

/**
 * Detect icon region in an image using computer vision
 * @param img The image element
 * @param position Position information
 * @param cv OpenCV.js module
 * @returns Crop parameters for icon region
 */
const detectIconRegionWithCV = async (
  img: HTMLImageElement,
  position: { top?: boolean; bottom?: boolean; left?: boolean; right?: boolean; center?: boolean },
  cv: any
): Promise<{ x: number; y: number; width: number; height: number }> => {
  // Convert image to OpenCV Mat
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    // Fallback to regular detection if we can't get canvas context
    return detectIconRegion(img, position);
  }
  
  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  
  // Create OpenCV Mat from image data
  const src = cv.matFromImageData(imageData);
  const gray = new cv.Mat();
  const edges = new cv.Mat();
  
  try {
    // Convert to grayscale
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    
    // Apply edge detection
    cv.Canny(gray, edges, 50, 150);
    
    // Find contours
    const contours = new cv.MatVector();
    const hierarchy = new cv.Mat();
    cv.findContours(edges, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
    
    // Find small, high-contrast contours (likely icons)
    let bestIcon = null;
    let bestScore = 0;
    
    for (let i = 0; i < contours.size(); ++i) {
      const contour = contours.get(i);
      const rect = cv.boundingRect(contour);
      
      // Check if this is a reasonable icon size (small)
      if (rect.width < canvas.width * 0.2 && rect.height < canvas.height * 0.2) {
        // Calculate a score based on compactness and contrast
        const area = rect.width * rect.height;
        const perimeter = cv.arcLength(contour, true);
        const compactness = (4 * Math.PI * area) / (perimeter * perimeter);
        
        // Prefer more compact shapes (closer to circles or squares)
        const score = compactness * area;
        
        if (score > bestScore) {
          bestScore = score;
          bestIcon = rect;
        }
      }
      contour.delete();
    }
    
    // Clean up
    src.delete();
    gray.delete();
    edges.delete();
    contours.delete();
    hierarchy.delete();
    
    if (bestIcon) {
      // Adjust position based on description
      let x = bestIcon.x;
      let y = bestIcon.y;
      
      if (position.center) {
        x = Math.max(0, Math.min(bestIcon.x, canvas.width - bestIcon.width));
        y = Math.max(0, Math.min(bestIcon.y, canvas.height - bestIcon.height));
      } else if (position.right) {
        x = canvas.width - bestIcon.width;
      } else if (position.left) {
        x = 0;
      }
      
      if (position.bottom) {
        y = canvas.height - bestIcon.height;
      } else if (position.top) {
        y = 0;
      }
      
      return {
        x,
        y,
        width: bestIcon.width,
        height: bestIcon.height
      };
    }
  } catch (error) {
    console.warn('Computer vision icon detection failed, falling back to heuristic method:', error);
    // Clean up on error
    try {
      src.delete();
      gray.delete();
      edges.delete();
    } catch (e) {
      // Ignore cleanup errors
    }
    // Fallback to regular detection
    return detectIconRegion(img, position);
  }
  
  // Fallback to regular detection
  return detectIconRegion(img, position);
};

/**
 * Detect icon region in an image
 * @param img The image element
 * @param position Position information
 * @returns Crop parameters for icon region
 */
const detectIconRegion = (
  img: HTMLImageElement,
  position: { top?: boolean; bottom?: boolean; left?: boolean; right?: boolean; center?: boolean }
): { x: number; y: number; width: number; height: number } => {
  const imgWidth = img.width;
  const imgHeight = img.height;
  
  // Icons are typically small and square
  const size = Math.min(imgWidth, imgHeight) * 0.15;
  let width = size;
  let height = size;
  
  // Position based on description
  let x = 0;
  let y = 0;
  
  if (position.center) {
    x = (imgWidth - width) / 2;
    y = (imgHeight - height) / 2;
  } else if (position.right) {
    x = imgWidth - width;
  } else if (position.left) {
    x = 0;
  } else {
    // Default to left
    x = imgWidth * 0.1;
  }
  
  if (position.bottom) {
    y = imgHeight - height;
  } else if (position.top) {
    y = 0;
  } else {
    // Default to top
    y = imgHeight * 0.1;
  }
  
  return { x, y, width, height };
};

/**
 * Detect picture region in an image
 * @param img The image element
 * @param position Position information
 * @returns Crop parameters for picture region
 */
const detectPictureRegion = (
  img: HTMLImageElement,
  position: { top?: boolean; bottom?: boolean; left?: boolean; right?: boolean; center?: boolean }
): { x: number; y: number; width: number; height: number } => {
  const imgWidth = img.width;
  const imgHeight = img.height;
  
  // Pictures can vary in size but are often substantial
  let width = imgWidth * 0.5;
  let height = imgHeight * 0.5;
  
  // Position based on description
  let x = 0;
  let y = 0;
  
  if (position.center) {
    x = (imgWidth - width) / 2;
    y = (imgHeight - height) / 2;
  } else if (position.right) {
    x = imgWidth - width;
  } else if (position.left) {
    x = 0;
  } else {
    // Default to center
    x = (imgWidth - width) / 2;
  }
  
  if (position.bottom) {
    y = imgHeight - height;
  } else if (position.top) {
    y = 0;
  } else {
    // Default to center
    y = (imgHeight - height) / 2;
  }
  
  return { x, y, width, height };
};

/**
 * Detect picture region in an image using computer vision
 * @param img The image element
 * @param position Position information
 * @param cv OpenCV.js module
 * @returns Crop parameters for picture region
 */
const detectPictureRegionWithCV = async (
  img: HTMLImageElement,
  position: { top?: boolean; bottom?: boolean; left?: boolean; right?: boolean; center?: boolean },
  cv: any
): Promise<{ x: number; y: number; width: number; height: number }> => {
  // Convert image to OpenCV Mat
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    // Fallback to regular detection if we can't get canvas context
    return detectPictureRegion(img, position);
  }
  
  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  
  // Create OpenCV Mat from image data
  const src = cv.matFromImageData(imageData);
  const hsv = new cv.Mat();
  
  try {
    // Convert to HSV color space for better color analysis
    cv.cvtColor(src, hsv, cv.COLOR_RGBA2HSV);
    
    // Split channels
    const hsvPlanes = new cv.MatVector();
    cv.split(hsv, hsvPlanes);
    
    // Analyze saturation to find colorful regions (likely pictures)
    const saturation = hsvPlanes.get(1);
    const blurred = new cv.Mat();
    
    // Apply Gaussian blur to reduce noise
    cv.GaussianBlur(saturation, blurred, new cv.Size(15, 15), 0, 0);
    
    // Threshold to find high-saturation regions
    const thresholded = new cv.Mat();
    cv.threshold(blurred, thresholded, 50, 255, cv.THRESH_BINARY);
    
    // Find contours
    const contours = new cv.MatVector();
    const hierarchy = new cv.Mat();
    cv.findContours(thresholded, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
    
    // Find the largest colorful region
    let largestArea = 0;
    let bestRegion = null;
    
    for (let i = 0; i < contours.size(); ++i) {
      const contour = contours.get(i);
      const rect = cv.boundingRect(contour);
      
      // Check if this is a reasonable picture size
      if (rect.width > canvas.width * 0.2 && rect.height > canvas.height * 0.2) {
        const area = rect.width * rect.height;
        if (area > largestArea) {
          largestArea = area;
          bestRegion = rect;
        }
      }
      contour.delete();
    }
    
    // Clean up
    src.delete();
    hsv.delete();
    hsvPlanes.delete();
    saturation.delete();
    blurred.delete();
    thresholded.delete();
    contours.delete();
    hierarchy.delete();
    
    if (bestRegion) {
      // Adjust position based on description
      let x = bestRegion.x;
      let y = bestRegion.y;
      
      if (position.center) {
        x = Math.max(0, Math.min(bestRegion.x, canvas.width - bestRegion.width));
        y = Math.max(0, Math.min(bestRegion.y, canvas.height - bestRegion.height));
      } else if (position.right) {
        x = canvas.width - bestRegion.width;
      } else if (position.left) {
        x = 0;
      }
      
      if (position.bottom) {
        y = canvas.height - bestRegion.height;
      } else if (position.top) {
        y = 0;
      }
      
      return {
        x,
        y,
        width: bestRegion.width,
        height: bestRegion.height
      };
    }
  } catch (error) {
    console.warn('Computer vision picture detection failed, falling back to heuristic method:', error);
    // Clean up on error
    try {
      src.delete();
      hsv.delete();
      hsvPlanes.delete();
      saturation.delete();
      blurred.delete();
      thresholded.delete();
      contours.delete();
      hierarchy.delete();
    } catch (e) {
      // Ignore cleanup errors
    }
    // Fallback to regular detection
    return detectPictureRegion(img, position);
  }
  
  // Fallback to regular detection
  return detectPictureRegion(img, position);
};

/**
 * Detect table region in an image
 * @param img The image element
 * @param position Position information
 * @returns Crop parameters for table region
 */
const detectTableRegion = (
  img: HTMLImageElement,
  position: { top?: boolean; bottom?: boolean; left?: boolean; right?: boolean; center?: boolean }
): { x: number; y: number; width: number; height: number } => {
  const imgWidth = img.width;
  const imgHeight = img.height;
  
  // Tables are typically wide and of medium height
  let width = imgWidth * 0.7;
  let height = imgHeight * 0.3;
  
  // Position based on description
  let x = 0;
  let y = 0;
  
  if (position.center) {
    x = (imgWidth - width) / 2;
    y = (imgHeight - height) / 2;
  } else if (position.right) {
    x = imgWidth - width;
  } else if (position.left) {
    x = 0;
  } else {
    // Default to center
    x = (imgWidth - width) / 2;
  }
  
  if (position.bottom) {
    y = imgHeight - height;
  } else if (position.top) {
    y = 0;
  } else {
    // Default to center
    y = (imgHeight - height) / 2;
  }
  
  return { x, y, width, height };
};

/**
 * Detect table region in an image using computer vision
 * @param img The image element
 * @param position Position information
 * @returns Crop parameters for table region
 */
const detectTableRegionWithCV = async (
  img: HTMLImageElement,
  position: { top?: boolean; bottom?: boolean; left?: boolean; right?: boolean; center?: boolean },
  cv: any
): Promise<{ x: number; y: number; width: number; height: number }> => {
  // Convert image to OpenCV Mat
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    // Fallback to regular detection if we can't get canvas context
    return detectTableRegion(img, position);
  }
  
  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  
  // Create OpenCV Mat from image data
  const src = cv.matFromImageData(imageData);
  const gray = new cv.Mat();
  const edges = new cv.Mat();
  
  try {
    // Convert to grayscale
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    
    // Apply adaptive threshold to handle varying lighting
    const thresholded = new cv.Mat();
    cv.adaptiveThreshold(gray, thresholded, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 11, 2);
    
    // Apply morphological operations to enhance table structure
    const kernel = cv.Mat.ones(3, 3, cv.CV_8U);
    const morphed = new cv.Mat();
    cv.morphologyEx(thresholded, morphed, cv.MORPH_CLOSE, kernel);
    
    // Find horizontal and vertical lines
    const horizontal = morphed.clone();
    const vertical = morphed.clone();
    
    // Create structure elements for extracting horizontal and vertical lines
    const horizontaStructure = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(25, 1));
    const verticalStructure = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(1, 25));
    
    // Apply erosion and dilation to extract horizontal lines
    cv.erode(horizontal, horizontal, horizontaStructure);
    cv.dilate(horizontal, horizontal, horizontaStructure);
    
    // Apply erosion and dilation to extract vertical lines
    cv.erode(vertical, vertical, verticalStructure);
    cv.dilate(vertical, vertical, verticalStructure);
    
    // Combine horizontal and vertical lines
    const lines = new cv.Mat();
    cv.add(horizontal, vertical, lines);
    
    // Find contours of potential tables
    const contours = new cv.MatVector();
    const hierarchy = new cv.Mat();
    cv.findContours(lines, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
    
    // Find the region with the most line intersections (likely a table)
    let bestTable = null;
    let maxLineDensity = 0;
    
    for (let i = 0; i < contours.size(); ++i) {
      const contour = contours.get(i);
      const rect = cv.boundingRect(contour);
      
      // Check if this is a reasonable table size
      if (rect.width > canvas.width * 0.3 && rect.height > canvas.height * 0.2) {
        // Calculate line density within this region
        const region = lines.roi(rect);
        const whitePixels = cv.countNonZero(region);
        const density = whitePixels / (rect.width * rect.height);
        region.delete();
        
        if (density > maxLineDensity) {
          maxLineDensity = density;
          bestTable = rect;
        }
      }
      contour.delete();
    }
    
    // Clean up
    src.delete();
    gray.delete();
    edges.delete();
    thresholded.delete();
    morphed.delete();
    horizontal.delete();
    vertical.delete();
    lines.delete();
    contours.delete();
    hierarchy.delete();
    
    if (bestTable) {
      // Adjust position based on description
      let x = bestTable.x;
      let y = bestTable.y;
      
      if (position.center) {
        x = Math.max(0, Math.min(bestTable.x, canvas.width - bestTable.width));
        y = Math.max(0, Math.min(bestTable.y, canvas.height - bestTable.height));
      } else if (position.right) {
        x = canvas.width - bestTable.width;
      } else if (position.left) {
        x = 0;
      }
      
      if (position.bottom) {
        y = canvas.height - bestTable.height;
      } else if (position.top) {
        y = 0;
      }
      
      return {
        x,
        y,
        width: bestTable.width,
        height: bestTable.height
      };
    }
  } catch (error) {
    console.warn('Computer vision table detection failed, falling back to heuristic method:', error);
    // Clean up on error
    try {
      src.delete();
      gray.delete();
      edges.delete();
      thresholded.delete();
      morphed.delete();
      horizontal.delete();
      vertical.delete();
      lines.delete();
      contours.delete();
      hierarchy.delete();
    } catch (e) {
      // Ignore cleanup errors
    }
    // Fallback to regular detection
    return detectTableRegion(img, position);
  }
  
  // Fallback to regular detection
  return detectTableRegion(img, position);
};

/**
 * Detect handwritten region in an image
 * @param img The image element
 * @param position Position information
 * @returns Crop parameters for handwritten region
 */
const detectHandwrittenRegion = (
  img: HTMLImageElement,
  position: { top?: boolean; bottom?: boolean; left?: boolean; right?: boolean; center?: boolean }
): { x: number; y: number; width: number; height: number } => {
  const imgWidth = img.width;
  const imgHeight = img.height;
  
  // Handwritten notes are often in margins and vary in size
  let width = imgWidth * 0.4;
  let height = imgHeight * 0.2;
  
  // Position based on description
  let x = 0;
  let y = 0;
  
  if (position.center) {
    x = (imgWidth - width) / 2;
    y = (imgHeight - height) / 2;
  } else if (position.right) {
    x = imgWidth - width;
  } else if (position.left) {
    x = 0;
  } else {
    // Default to right margin for notes
    x = imgWidth * 0.6;
  }
  
  if (position.bottom) {
    y = imgHeight - height;
  } else if (position.top) {
    y = 0;
  } else {
    // Default to bottom for notes
    y = imgHeight * 0.7;
  }
  
  return { x, y, width, height };
};

/**
 * Detect handwritten region in an image using computer vision
 * @param img The image element
 * @param position Position information
 * @returns Crop parameters for handwritten region
 */
const detectHandwrittenRegionWithCV = async (
  img: HTMLImageElement,
  position: { top?: boolean; bottom?: boolean; left?: boolean; right?: boolean; center?: boolean },
  cv: any
): Promise<{ x: number; y: number; width: number; height: number }> => {
  // Convert image to OpenCV Mat
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    // Fallback to regular detection if we can't get canvas context
    return detectHandwrittenRegion(img, position);
  }
  
  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  
  // Create OpenCV Mat from image data
  const src = cv.matFromImageData(imageData);
  const gray = new cv.Mat();
  
  try {
    // Convert to grayscale
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    
    // Apply morphological operations to enhance thin strokes
    const kernel = cv.Mat.ones(3, 3, cv.CV_8U);
    const morphed = new cv.Mat();
    cv.morphologyEx(gray, morphed, cv.MORPH_GRADIENT, kernel);
    
    // Apply threshold to isolate dark strokes (handwriting)
    const thresholded = new cv.Mat();
    cv.threshold(morphed, thresholded, 30, 255, cv.THRESH_BINARY_INV);
    
    // Find contours of potential handwritten text
    const contours = new cv.MatVector();
    const hierarchy = new cv.Mat();
    cv.findContours(thresholded, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
    
    // Find regions with many small, thin contours (characteristic of handwriting)
    const regions = [];
    
    for (let i = 0; i < contours.size(); ++i) {
      const contour = contours.get(i);
      const rect = cv.boundingRect(contour);
      
      // Check if this is a reasonable size for handwriting strokes
      if (rect.width < canvas.width * 0.1 && rect.height < canvas.height * 0.1) {
        regions.push(rect);
      }
      contour.delete();
    }
    
    // Group nearby regions to find clusters (likely words/phrases)
    const clusters = [];
    for (const region of regions) {
      let foundCluster = false;
      for (const cluster of clusters) {
        // Check if this region is close to any existing cluster
        const centerX = region.x + region.width / 2;
        const centerY = region.y + region.height / 2;
        const clusterCenterX = cluster.x + cluster.width / 2;
        const clusterCenterY = cluster.y + cluster.height / 2;
        
        const distance = Math.sqrt(
          Math.pow(centerX - clusterCenterX, 2) + Math.pow(centerY - clusterCenterY, 2)
        );
        
        // If close enough, merge with cluster
        if (distance < Math.max(region.width, region.height) * 3) {
          // Expand cluster to include this region
          const newX = Math.min(cluster.x, region.x);
          const newY = Math.min(cluster.y, region.y);
          const newWidth = Math.max(cluster.x + cluster.width, region.x + region.width) - newX;
          const newHeight = Math.max(cluster.y + cluster.height, region.y + region.height) - newY;
          
          cluster.x = newX;
          cluster.y = newY;
          cluster.width = newWidth;
          cluster.height = newHeight;
          foundCluster = true;
          break;
        }
      }
      
      // If not close to any cluster, create a new one
      if (!foundCluster) {
        clusters.push({ ...region });
      }
    }
    
    // Find the largest cluster (likely the main handwritten note)
    let largestCluster = null;
    let largestArea = 0;
    
    for (const cluster of clusters) {
      const area = cluster.width * cluster.height;
      if (area > largestArea) {
        largestArea = area;
        largestCluster = cluster;
      }
    }
    
    // Clean up
    src.delete();
    gray.delete();
    morphed.delete();
    thresholded.delete();
    contours.delete();
    hierarchy.delete();
    
    if (largestCluster) {
      // Adjust position based on description
      let x = largestCluster.x;
      let y = largestCluster.y;
      
      if (position.center) {
        x = Math.max(0, Math.min(largestCluster.x, canvas.width - largestCluster.width));
        y = Math.max(0, Math.min(largestCluster.y, canvas.height - largestCluster.height));
      } else if (position.right) {
        x = canvas.width - largestCluster.width;
      } else if (position.left) {
        x = 0;
      }
      
      if (position.bottom) {
        y = canvas.height - largestCluster.height;
      } else if (position.top) {
        y = 0;
      }
      
      return {
        x,
        y,
        width: largestCluster.width,
        height: largestCluster.height
      };
    }
  } catch (error) {
    console.warn('Computer vision handwritten detection failed, falling back to heuristic method:', error);
    // Clean up on error
    try {
      src.delete();
      gray.delete();
      // ... (delete other mats if they exist)
    } catch (e) {
      // Ignore cleanup errors
    }
    // Fallback to regular detection
    return detectHandwrittenRegion(img, position);
  }
  
  // Fallback to regular detection
  return detectHandwrittenRegion(img, position);
};

/**
 * Fallback detection based on position only
 * @param img The image element
 * @param position Position information
 * @returns Crop parameters based on position
 */
const detectByPosition = (
  img: HTMLImageElement,
  position: { top?: boolean; bottom?: boolean; left?: boolean; right?: boolean; center?: boolean }
): { x: number; y: number; width: number; height: number } => {
  const imgWidth = img.width;
  const imgHeight = img.height;
  
  // Default to a reasonable portion of the image
  let width = imgWidth * 0.5;
  let height = imgHeight * 0.5;
  
  // Position based on description
  let x = 0;
  let y = 0;
  
  if (position.center) {
    x = (imgWidth - width) / 2;
    y = (imgHeight - height) / 2;
  } else if (position.right) {
    x = imgWidth - width;
  } else if (position.left) {
    x = 0;
  } else {
    // Default to center
    x = (imgWidth - width) / 2;
  }
  
  if (position.bottom) {
    y = imgHeight - height;
  } else if (position.top) {
    y = 0;
  } else {
    // Default to center
    y = (imgHeight - height) / 2;
  }
  
  return { x, y, width, height };
};

/**
 * Create a placeholder image when the original image is not available
 * @param description The description of what the image should represent
 * @returns A blob containing a placeholder image
 */
const createPlaceholderImage = async (description: string): Promise<Blob> => {
  // Create a canvas for the placeholder image
  const canvas = document.createElement('canvas');
  const size = 300; // Size of the placeholder image
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    // If we can't get a canvas context, return an empty blob
    return new Blob([], { type: 'image/png' });
  }
  
  // Fill background
  ctx.fillStyle = '#f0f0f0';
  ctx.fillRect(0, 0, size, size);
  
  // Draw border
  ctx.strokeStyle = '#ccc';
  ctx.lineWidth = 2;
  ctx.strokeRect(10, 10, size - 20, size - 20);
  
  // Draw text
  ctx.fillStyle = '#666';
  ctx.font = '16px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // Split description into words and wrap text
  const words = description.split(' ');
  const lines = [];
  let currentLine = words[0];
  
  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const width = ctx.measureText(currentLine + " " + word).width;
    if (width < size - 40) {
      currentLine += " " + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  lines.push(currentLine);
  
  // Draw each line
  const lineHeight = 20;
  const startY = (size - (lines.length - 1) * lineHeight) / 2;
  
  lines.forEach((line, i) => {
    ctx.fillText(line, size / 2, startY + i * lineHeight);
  });
  
  // Convert to blob
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob || new Blob([], { type: 'image/png' }));
    }, 'image/png');
  });
};
