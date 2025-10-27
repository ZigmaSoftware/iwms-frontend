import React from "react";

interface TextareaProps {
  id?: string;
  name?: string;
  placeholder?: string;
  rows?: number;
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  success?: boolean;
  error?: boolean;
  hint?: string;
}

const TextArea: React.FC<TextareaProps> = ({
  id,
  name,
  placeholder = "Enter your message",
  rows = 3,
  value = "",
  onChange,
  className = "",
  disabled = false,
  required = false,
  success = false,
  error = false,
  hint = "",
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (onChange) onChange(e.target.value);
  };

  // Base styling shared across states
  let textareaClasses = `input-validate w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 transition-colors duration-200 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 ${className}`;

  // Manual override (disabled / success / error)
  if (disabled) {
    textareaClasses += ` bg-gray-100 opacity-50 text-gray-500 border-gray-300 cursor-not-allowed dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700`;
  } else if (error) {
    textareaClasses += ` border-error-500 focus:border-error-300 focus:ring-error-500/20 dark:border-error-500 dark:focus:border-error-800`;
  } else if (success) {
    textareaClasses += ` border-success-500 focus:border-success-300 focus:ring-success-500/20 dark:border-success-500 dark:focus:border-success-800`;
  } else {
    textareaClasses += ` bg-transparent text-gray-900 border-gray-300 focus:border-brand-300 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800`;
  }

  return (
    <div className="relative">
      <textarea
        id={id}
        name={name}
        placeholder={placeholder}
        rows={rows}
        value={value}
        onChange={handleChange}
        disabled={disabled}
        required={required}
        className={textareaClasses}
      />

      {hint && (
        <p
          className={`mt-2 text-sm ${
            error
              ? "text-error-500"
              : success
              ? "text-success-500"
              : "text-gray-500 dark:text-gray-400"
          }`}
        >
          {hint}
        </p>
      )}
    </div>
  );
};

export default TextArea;
