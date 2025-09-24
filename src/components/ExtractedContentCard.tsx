import React from 'react';
import { Download, Trash2, Clock, FileText, Image as ImageIcon, Brain, File as FileIcon } from 'lucide-react';
import { ExtractedContent } from '../types';
import { saveAs } from 'file-saver';
import { processImageContent, generateWordWithImages } from '../utils/imageProcessor';

interface ExtractedContentCardProps {
  content: ExtractedContent;
  onRemove: (id: string) => void;
}

export const ExtractedContentCard: React.FC<ExtractedContentCardProps> = ({
  content,
  onRemove,
}) => {
  const downloadAsTxt = () => {
    const blob = new Blob([content.content], { type: 'text/plain;charset=utf-8' });
    const fileName = `${content.filename.replace(/\.[^/.]+$/, '')}_extracted.txt`;
    saveAs(blob, fileName);
  };

  const downloadAsWord = async () => {
    console.log('Word download button clicked');
    console.log('Content to be processed:', content);
    try {
      console.log('Checking for image tags in content');
      // Check if this content has image tags that need processing
      if (content.content.includes('[IMAGE_CROP_NEEDED:')) {
        console.log('Content contains image tags, processing with image handler');
        // Use the original file if available, otherwise create a placeholder
        const fileBlob = content.originalFile || new Blob([], { type: 'application/octet-stream' });
        console.log('File blob for image processing:', fileBlob);
        
        // Process the content to extract images with a timeout
        console.log('Processing content with image processor');
        const imageProcessingPromise = processImageContent(
          fileBlob,
          content.content
        );
        
        // Add a timeout to prevent hanging
        const { processedContent, images } = await Promise.race([
          imageProcessingPromise,
          new Promise<{ processedContent: string; images: { id: string; blob: Blob; description: string }[] }>((_, reject) => 
            setTimeout(() => reject(new Error('Image processing timeout after 15 seconds')), 15000)
          )
        ]);
        
        console.log('Image processing complete. Processed content:', processedContent, 'Images:', images);
        
        // Generate Word document with embedded images
        console.log('Generating Word document with images');
        const blob = await generateWordWithImages(
          processedContent,
          images,
          content.filename.replace(/\.[^/.]+$/, '')
        );
        console.log('Word document with images generated. Blob size:', blob.size);
        
        const fileName = `${content.filename.replace(/\.[^/.]+$/, '')}_extracted.docx`;
        console.log('Saving file:', fileName);
        saveAs(blob, fileName);
        console.log('File save initiated');
      } else {
        console.log('Content does not contain image tags, processing as regular content');
        // Create a new PizZip instance for regular content
        console.log('Importing PizZip');
        const PizZip = await import('pizzip').then(m => m.default);
        console.log('PizZip imported successfully');
        const zip = new PizZip();
        console.log('PizZip instance created');
        
        console.log('Processing content into XML paragraphs');
        // Process content into properly formatted XML paragraphs
        const processContent = (text: string) => {
          console.log('Processing text content:', text.substring(0, 100) + '...');
          // Split text by double newlines to create paragraphs, then by single newlines for line breaks
          const paragraphs = text.split('\n\n');
          console.log('Split into paragraphs:', paragraphs.length);
          
          // Create XML for each paragraph
          const xmlParagraphs = paragraphs.map((paragraph, index) => {
            console.log(`Processing paragraph ${index}:`, paragraph.substring(0, 50) + '...');
            // Handle empty paragraphs
            if (paragraph.trim() === '') {
              console.log(`Paragraph ${index} is empty`);
              return '<w:p/>';
            }
            
            // Split paragraph into lines
            const lines = paragraph.split('\n');
            console.log(`Paragraph ${index} split into lines:`, lines.length);
            
            // Create XML for each line
            const xmlLines = lines.map(line => {
              // Handle empty lines
              if (line.trim() === '') {
                return '';
              }
              
              // Escape XML special characters properly
              const escapedText = line
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
              
              return `<w:t xml:space="preserve">${escapedText}</w:t>`;
            }).filter(line => line !== ''); // Remove empty lines
            
            // Join lines with line break elements
            const xmlLineElements = xmlLines.map((line, index) => {
              if (index === xmlLines.length - 1) {
                return line;
              }
              return `${line}<w:br/>`;
            });
            
            // Handle case where all lines were empty
            if (xmlLineElements.length === 0) {
              console.log(`Paragraph ${index} has no content after processing`);
              return '<w:p/>';
            }
            
            console.log(`Paragraph ${index} XML elements:`, xmlLineElements);
            return `<w:p><w:r>${xmlLineElements.join('')}</w:r></w:p>`;
          });
          
          console.log('All XML paragraphs processed:', xmlParagraphs);
          return xmlParagraphs.join('\n    ');
        };
        
        console.log('Creating document.xml');
        // Create a complete valid document.xml
        const processedContent = processContent(content.content);
        console.log('Processed content for document.xml:', processedContent);
        const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    ${processedContent}
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;
        console.log('Document.xml created');
        
        // Add all required files for a valid .docx
        console.log('Adding document.xml to zip');
        zip.file("word/document.xml", documentXml);
        
        console.log('Adding [Content_Types].xml to zip');
        zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`);
        
        console.log('Adding _rels/.rels to zip');
        zip.file("_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);
        
        console.log('Adding word/_rels/document.xml.rels to zip');
        zip.file("word/_rels/document.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
</Relationships>`);
        
        console.log('Adding word/styles.xml to zip');
        // Add minimal required styles
        zip.file("word/styles.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="Calibri" w:cs="Calibri"/>
        <w:sz w:val="24"/>
        <w:szCs w:val="24"/>
      </w:rPr>
    </w:rPrDefault>
  </w:docDefaults>
</w:styles>`);
        
        console.log('Generating zip content');
        // Generate the docx file
        const zipContent = zip.generate({ type: "blob" });
        console.log('Zip content generated. Size:', zipContent.size);
        const blob = new Blob([zipContent], {
          type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        });
        console.log('Blob created. Size:', blob.size);
        
        const fileName = `${content.filename.replace(/\.[^/.]+$/, '')}_extracted.docx`;
        console.log('Saving file:', fileName);
        saveAs(blob, fileName);
        console.log('File save initiated');
      }
    } catch (error: unknown) {
      console.error('Error generating Word document:', error);
      console.error('Full error object:', error);
      // Show an alert to the user and fallback to text download
      const errorMessage = error instanceof Error ? error.message : String(error);
      alert(`Error generating Word document: ${errorMessage}. Downloading as text file instead.`);
      console.error('Content that failed to generate Word document:', content.content);
      // Fallback to text download if Word generation fails
      downloadAsTxt();
    }
  };

  const getMethodIcon = () => {
    switch (content.method) {
      case 'direct':
        return <FileText className="h-4 w-4" />;
      case 'ocr':
        return <ImageIcon className="h-4 w-4" />;
      case 'ai-pdf':
        return <Brain className="h-4 w-4" />;
    }
  };

  const getMethodLabel = () => {
    switch (content.method) {
      case 'direct':
        return 'Direct PDF Text';
      case 'ocr':
        return 'Image OCR';
      case 'ai-pdf':
        return 'AI-Powered PDF';
    }
  };

  const getMethodColor = () => {
    switch (content.method) {
      case 'direct':
        return 'text-green-600 bg-green-100';
      case 'ocr':
        return 'text-blue-600 bg-blue-100';
      case 'ai-pdf':
        return 'text-purple-600 bg-purple-100';
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-900 mb-1">{content.filename}</h3>
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <div className={`flex items-center space-x-1 px-2 py-1 rounded-full ${getMethodColor()}`}>
              {getMethodIcon()}
              <span className="font-medium">{getMethodLabel()}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Clock className="h-3 w-3" />
              <span>{content.processingTime}ms</span>
            </div>
          </div>
        </div>
        
        <div className="flex space-x-2">
          <button
            onClick={downloadAsTxt}
            className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
            title="Download as TXT"
          >
            <Download className="h-4 w-4" />
          </button>
          <button
            onClick={downloadAsWord}
            className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
            title="Download as Word Document"
          >
            <FileIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => onRemove(content.id)}
            className="p-2 text-gray-400 hover:text-red-600 transition-colors"
            title="Remove"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
      
      <div className="bg-gray-50 rounded-md p-4 max-h-64 overflow-y-auto">
        <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
          {content.content.length > 500 
            ? `${content.content.substring(0, 500)}...\n\n[Content truncated - Download full text]`
            : content.content
          }
        </pre>
      </div>
      
      <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
        <span>
          {new Date(content.timestamp).toLocaleString()}
        </span>
        <span>
          {Math.round(content.fileSize / 1024)} KB
        </span>
      </div>
    </div>
  );
};