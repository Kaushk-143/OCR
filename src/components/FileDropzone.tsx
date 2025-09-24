import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, Image } from 'lucide-react';

interface FileDropzoneProps {
  onFileDrop: (files: File[]) => void;
  accept: Record<string, string[]>;
  multiple?: boolean;
  className?: string;
  icon?: 'pdf' | 'image';
}

export const FileDropzone: React.FC<FileDropzoneProps> = ({
  onFileDrop,
  accept,
  multiple = false,
  className = '',
  icon = 'pdf',
}) => {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    onFileDrop(acceptedFiles);
  }, [onFileDrop]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept,
    multiple,
    maxSize: icon === 'pdf' ? 10 * 1024 * 1024 : 5 * 1024 * 1024, // 10MB for PDF, 5MB for images
  });

  const IconComponent = icon === 'pdf' ? FileText : Image;

  return (
    <div
      {...getRootProps()}
      className={`
        border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all
        ${isDragActive && !isDragReject 
          ? 'border-blue-500 bg-blue-50' 
          : isDragReject 
          ? 'border-red-500 bg-red-50' 
          : 'border-gray-300 hover:border-gray-400'
        }
        ${className}
      `}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center space-y-4">
        <div className="flex space-x-2">
          <IconComponent className="h-8 w-8 text-gray-400" />
          <Upload className="h-8 w-8 text-gray-400" />
        </div>
        
        {isDragActive && !isDragReject ? (
          <div>
            <p className="text-blue-600 font-medium">Drop the file here</p>
            <p className="text-sm text-gray-500">Release to upload</p>
          </div>
        ) : isDragReject ? (
          <div>
            <p className="text-red-600 font-medium">Invalid file type</p>
            <p className="text-sm text-gray-500">Please select a valid file</p>
          </div>
        ) : (
          <div>
            <p className="text-gray-700 font-medium">
              Drop your {icon === 'pdf' ? 'PDF' : 'image'} here, or click to browse
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {icon === 'pdf' 
                ? 'Supports PDF files up to 10MB' 
                : 'Supports PNG, JPG, JPEG, WebP up to 5MB'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
};