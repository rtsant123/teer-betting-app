import React from 'react';

// Unified Button Component
export const Button = ({ 
  children, 
  className = '', 
  variant = 'primary', 
  size = 'md',
  disabled = false,
  loading = false,
  leftIcon = null,
  rightIcon = null,
  ...props 
}) => {
  const variants = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    outline: 'btn-outline',
  };

  const sizes = {
    sm: 'btn-sm',
    md: '',
    lg: 'btn-lg',
  };

  return (
    <button
      className={`
        btn
        ${variants[variant]}
        ${sizes[size]}
        ${disabled || loading ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="spinner w-4 h-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      {!loading && leftIcon && leftIcon}
      {children}
      {!loading && rightIcon && rightIcon}
    </button>
  );
};

// Number Button for Betting
export const NumberButton = ({ 
  number, 
  selected = false, 
  amount = 0,
  onClick,
  className = '',
  ...props 
}) => (
  <button
    className={`
      number-btn
      ${selected ? 'selected' : ''}
      ${className}
    `}
    onClick={onClick}
    {...props}
  >
    <div className="text-center">
      <div className="font-semibold">{number}</div>
      {amount > 0 && (
        <div className="text-xs opacity-75">₹{amount}</div>
      )}
    </div>
  </button>
);

// Icon-only Button
export const IconButton = ({ icon, className = '', variant = 'secondary', ...props }) => (
  <Button
    className={`!w-11 !h-11 !p-0 ${className}`}
    variant={variant}
    {...props}
  >
    {icon}
  </Button>
);
