import React from 'react';

interface ProgressBarProps {
  progress: number;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ progress }) => {
  const roundedProgress = Math.round(progress);
  return (
    <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mt-6 overflow-hidden">
      <div
        className="bg-gradient-to-r from-yellow-400 to-brand-primary h-2.5 rounded-full text-xs font-medium text-white text-center p-0.5 leading-none transition-all duration-300 ease-out"
        style={{ width: `${roundedProgress}%` }}
      />
    </div>
  );
};

export default ProgressBar;
