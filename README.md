# Document Text Extraction Suite

A comprehensive React-TypeScript web application for extracting text from any document type (PDFs, images, Word documents) in a single unified interface.

## Features

### 🔄 Unified Document Processing
- Upload any supported document (PDF, image, or Word) in one place
- Automatic detection of the best extraction method based on file type
- No need to select different methods for different file types
- Consistent user experience across all document types

### 🔤 Direct Text Extraction
- Extract text directly from text-based PDFs and Word documents
- No AI processing required - fast and reliable
- Preserves document formatting where possible

### 🖼️ AI-Powered OCR
- Extract text from images using OpenAI GPT-4o mini
- Advanced text recognition for complex images
- Handles various text orientations and styles

## Supported File Types

- **PDF Documents**: .pdf files (text-based and image-based)
- **Image Files**: .png, .jpg, .jpeg, .webp
- **Word Documents**: .docx and .doc files

## Technology Stack

- **Frontend**: React 18+ with TypeScript
- **PDF Processing**: PDF.js (pdfjs-dist)
- **Word Processing**: Mammoth.js
- **AI Integration**: OpenAI GPT-4o mini
- **UI Components**: Tailwind CSS + Lucide React icons
- **File Handling**: react-dropzone
- **State Management**: React Context API
- **Build Tool**: Vite

## Getting Started

### Prerequisites

- Node.js 16+ and npm
- OpenAI API key for image OCR

### Installation

1. Clone the repository:
\`\`\`bash
git clone <repository-url>
cd document-extraction-suite
\`\`\`

2. Install dependencies:
\`\`\`bash
npm install
\`\`\`

3. Create environment file:
\`\`\`bash
cp .env.example .env
\`\`\`

4. Add your OpenAI API key to `.env`:
\`\`\`bash
VITE_OPENAI_API_KEY=your_openai_api_key_here
\`\`\`

5. Start the development server:
\`\`\`bash
npm run dev
\`\`\`

## Usage

### Unified Document Processing
1. Upload any supported document file (PDF, image, or Word document)
2. The system automatically detects the file type and applies the appropriate extraction method:
   - Text-based PDFs and Word documents: Direct text extraction
   - Images: AI-powered OCR using OpenAI
3. View and download the extracted text in the results panel

## Project Structure

\`\`\`
src/
├── components/          # React components
│   ├── ErrorBoundary.tsx
│   ├── FileDropzone.tsx
│   ├── ProcessingProgress.tsx
│   ├── MethodSelector.tsx
│   ├── UnifiedExtractor.tsx
│   ├── ExtractedContentCard.tsx
│   └── ExtractedContentsList.tsx
├── context/             # React Context for state management
│   └── AppContext.tsx
├── services/            # External service integrations
│   └── openaiService.ts
├── utils/              # Utility functions
│   ├── fileValidation.ts
│   ├── pdfProcessor.ts
│   └── wordProcessor.ts
├── types/              # TypeScript type definitions
│   └── index.ts
└── App.tsx             # Main application component
\`\`\`

## Key Features

### Automatic File Type Detection
- PDF files: Direct text extraction or AI processing based on content
- Image files: AI-powered OCR
- Word documents: Direct text extraction

### File Validation
- PDF files: max 10MB
- Word documents: max 10MB
- Image files: max 5MB
- Supported formats validation
- File type checking

### Error Handling
- Comprehensive error boundaries
- User-friendly error messages
- Loading states and progress indicators
- Graceful failure handling

### State Management
- React Context API for global state
- TypeScript for type safety
- Organized actions and reducers

### User Experience
- Single drag-and-drop upload area
- Real-time processing progress
- Download extracted text as TXT files
- Responsive design

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_OPENAI_API_KEY` | OpenAI API key for GPT-4o mini | Yes (for OCR) |

## API Integration

### OpenAI GPT-4o mini
- Used for image OCR text extraction
- Requires valid API key in environment variables

**Note**: In production, consider using a backend proxy instead of direct browser API calls for better security.

## Browser Compatibility

- Modern browsers with ES2020 support
- Chrome 80+
- Firefox 75+
- Safari 13.1+
- Edge 80+

## Performance Considerations

- PDF.js uses web workers for non-blocking processing
- Large files may take longer to process
- AI processing includes rate limiting delays
- Progress indicators keep users informed

## Error Handling

The application includes comprehensive error handling:
- File validation errors
- Processing errors
- API errors
- Network errors
- Browser compatibility issues

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions:
1. Check the README documentation
2. Review error messages and console logs
3. Ensure environment variables are correctly set
4. Verify file formats and sizes are within limits