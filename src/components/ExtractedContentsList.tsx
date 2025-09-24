import React from 'react';
import { Trash2 } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { ExtractedContentCard } from './ExtractedContentCard';

export const ExtractedContentsList: React.FC = () => {
  const { extractedContents, removeExtractedContent, clearExtractedContents } = useAppContext();

  if (extractedContents.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No extracted content yet. Upload a file to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">
          Extracted Content ({extractedContents.length})
        </h2>
        <button
          onClick={clearExtractedContents}
          className="flex items-center space-x-2 px-3 py-2 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors"
        >
          <Trash2 className="h-4 w-4" />
          <span>Clear All</span>
        </button>
      </div>

      <div className="grid gap-6">
        {extractedContents.map((content) => (
          <ExtractedContentCard
            key={content.id}
            content={content}
            onRemove={removeExtractedContent}
          />
        ))}
      </div>
    </div>
  );
};