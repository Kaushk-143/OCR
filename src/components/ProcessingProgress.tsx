import React from 'react';
import { Loader2 } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

export const ProcessingProgress: React.FC = () => {
  const { processingState } = useAppContext();
  
  if (!processingState.isProcessing) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Processing...
          </h3>
          <p className="text-gray-600 mb-4">{processingState.currentStep}</p>
          
          <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${processingState.progress}%` }}
            />
          </div>
          
          <p className="text-sm text-gray-500">
            {processingState.progress}% complete
          </p>
        </div>
      </div>
    </div>
  );
};