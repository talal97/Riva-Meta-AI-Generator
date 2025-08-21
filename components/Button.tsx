
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
}

const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', ...props }) => {
  const baseClasses = "inline-flex items-center justify-center font-semibold rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none dark:focus:ring-offset-brand-dark-card transition-all duration-300 ease-in-out";

  const primaryClasses = "px-8 py-3 border border-transparent text-base shadow-lg shadow-brand-primary/20 text-white bg-gradient-to-br from-yellow-500 to-brand-primary transform hover:-translate-y-0.5 hover:shadow-xl disabled:bg-gray-400 disabled:from-gray-400 disabled:to-gray-500 dark:disabled:bg-gray-600";
  
  const secondaryClasses = "px-6 py-2 border border-gray-300 dark:border-gray-600 text-sm bg-white dark:bg-brand-dark-card text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:text-gray-400 dark:disabled:text-gray-500";

  const variantClasses = variant === 'primary' ? primaryClasses : secondaryClasses;
  
  return (
    <button
      className={`${baseClasses} ${variantClasses}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
