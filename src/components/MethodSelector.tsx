import React from 'react';
import { FileText } from '../types';
import { useAppContext } from '../context/AppContext';

export const MethodSelector: React.FC = () => {
  // Simplified selector - we're using a unified approach now
  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-800">
            Unified Document Text Extraction
          </h2>
          <p className="text-gray-600 mt-1">
            Extract text from PDFs, images, and Word documents automatically
          </p>
        </div>
      </div>
    </div>
  );
};