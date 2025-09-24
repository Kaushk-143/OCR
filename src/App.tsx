import React from 'react';
import { FileText } from 'lucide-react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AppProvider } from './context/AppContext';
import { MethodSelector } from './components/MethodSelector';
import { UnifiedExtractor } from './components/UnifiedExtractor';
import { ExtractedContentsList } from './components/ExtractedContentsList';
import { ProcessingProgress } from './components/ProcessingProgress';

const AppContent: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Document Text Extraction Suite
              </h1>
              <p className="text-gray-600">
                Extract text from any document automatically
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Method Selector - Simplified */}
      <MethodSelector />

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Column - Unified Extractor */}
          <div>
            <UnifiedExtractor />
          </div>

          {/* Right Column - Extracted Contents */}
          <div className="lg:border-l lg:border-gray-200 lg:pl-8">
            <ExtractedContentsList />
          </div>
        </div>
      </main>

      {/* Processing Progress Modal */}
      <ProcessingProgress />
    </div>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </ErrorBoundary>
  );
}

export default App;