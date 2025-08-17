import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({ children, ...props }) => {
  return (
    <button
      className="inline-flex items-center justify-center px-8 py-3 border border-transparent text-base font-semibold rounded-lg shadow-lg shadow-brand-primary/20 text-white bg-gradient-to-br from-yellow-500 to-brand-primary transform hover:-translate-y-0.5 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary disabled:bg-gray-400 disabled:from-gray-400 disabled:to-gray-500 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none dark:disabled:bg-gray-600 dark:focus:ring-offset-brand-dark-card transition-all duration-300 ease-in-out"
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
