import { useState } from "react";

interface Option {
  value: string;
  label: string;
}

interface SelectProps {
  id?: string;
  options: Option[];
  value: string; // ✅ controlled by parent
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  className?: string;
}

const Select: React.FC<SelectProps> = ({
  id,
  options,
  value,
  onChange,
  required = false,
  placeholder = "Select an option",
  className = "",
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(e.target.value);
  };

  return (
    <select
      id={id}
      required={required}
      value={value}
      onChange={handleChange}
      className={`input-validate h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 pr-11 text-sm shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 ${
        value
          ? "text-gray-800 dark:text-white/90"
          : "text-gray-400 dark:text-gray-400"
      } ${className}`}
    >
      {/* Placeholder */}
      <option
        value=""
        disabled
        className="text-gray-700 dark:bg-gray-900 dark:text-gray-400"
      >
        {placeholder}
      </option>

      {/* Real options */}
      {options.map((option) => (
        <option
          key={option.value}
          value={option.value}
          className="text-gray-700 dark:bg-gray-900 dark:text-gray-400"
        >
          {option.label}
        </option>
      ))}
    </select>
  );
};

export default Select;
