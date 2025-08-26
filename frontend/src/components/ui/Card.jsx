import React from 'react';

// Unified Card Component - Single Design Style
export const Card = ({ children, className = '', ...props }) => {
  return (
    <div className={`card ${className}`} {...props}>
      {children}
    </div>
  );
};

export const CardHeader = ({ children, className = '', ...props }) => (
  <div className={`card-header ${className}`} {...props}>
    {children}
  </div>
);

export const CardContent = ({ children, className = '', ...props }) => (
  <div className={`card-content ${className}`} {...props}>
    {children}
  </div>
);

export const CardFooter = ({ children, className = '', ...props }) => (
  <div className={`card-footer ${className}`} {...props}>
    {children}
  </div>
);

export const CardTitle = ({ children, className = '', ...props }) => (
  <h3 className={`text-lg font-semibold text-gray-900 ${className}`} {...props}>
    {children}
  </h3>
);

export const CardDescription = ({ children, className = '', ...props }) => (
  <p className={`text-sm text-gray-600 mt-1 ${className}`} {...props}>
    {children}
  </p>
);

// Specialized Game Section Component
export const GameSection = ({ children, gameType, className = '', ...props }) => {
  const gameClasses = {
    fr: 'game-fr',
    sr: 'game-sr', 
    forecast: 'game-forecast'
  };

  return (
    <div 
      className={`game-section ${gameClasses[gameType] || ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
