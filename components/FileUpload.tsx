import React, { useState, useCallback } from 'react';
import { UploadCloudIcon } from './Icons';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  disabled: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, disabled }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState('');

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);
  
  const isValidFile = (file: File) => {
    const lowerCaseName = file.name.toLowerCase();
    return lowerCaseName.endsWith('.csv') || lowerCaseName.endsWith('.xlsx');
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (disabled) return;
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      if(isValidFile(files[0])) {
        setFileName(files[0].name);
        onFileSelect(files[0]);
      } else {
        alert("Please upload a valid CSV or Excel (.xlsx) file.");
      }
    }
  }, [disabled, onFileSelect]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
       if(isValidFile(files[0])) {
        setFileName(files[0].name);
        onFileSelect(files[0]);
      } else {
        alert("Please upload a valid CSV or Excel (.xlsx) file.");
      }
    }
    // Reset the input value to allow re-uploading the same file
    e.target.value = '';
  };

  const dragClass = isDragging ? 'border-brand-primary bg-brand-primary/10' : 'border-gray-300/80 dark:border-gray-600/80';

  return (
    <div className="mt-6">
      <label
        htmlFor="file-upload"
        className={`relative flex justify-center w-full h-56 px-6 pt-5 pb-6 border-2 ${dragClass} border-dashed rounded-xl transition-all duration-300 ease-in-out ${disabled ? 'cursor-not-allowed bg-gray-100 dark:bg-gray-700/50' : 'cursor-pointer bg-white dark:bg-gray-900/20 hover:border-gray-400 dark:hover:border-gray-500'}`}
      >
        <div 
          className="absolute inset-0"
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        />
        <div className="space-y-2 text-center self-center">
          <UploadCloudIcon className="mx-auto h-12 w-12 text-gray-400" />
          <div className="flex text-sm text-gray-600 dark:text-gray-300">
            <span className={`font-semibold ${disabled ? '' : 'text-brand-primary'}`}>
              Click to upload
            </span>
            <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept=".csv, .xlsx, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" disabled={disabled} />
            <p className="pl-1">or drag and drop</p>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">CSV or Excel (.xlsx) files only</p>
          {fileName && <p className="text-sm text-green-500 pt-2 font-medium">✓ {fileName}</p>}
        </div>
      </label>
    </div>
  );
};

export default FileUpload;