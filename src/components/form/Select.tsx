import type { ReactNode } from "react";

import {
  Select as ShadSelect,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type SelectOption = {
  value: string | number;
  label: ReactNode;
};

interface SelectProps {
  id?: string;
  value?: string | number | null;
  onChange?: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
}

export default function Select({
  id,
  value,
  onChange,
  options = [],
  placeholder,
  className,
  disabled,
  required,
}: SelectProps) {
  const normalizedValue = value === null || value === undefined ? "" : String(value);
  const finalPlaceholder = placeholder ?? "Select an option";
  const optionValues = options.map((option) => String(option.value));
  let placeholderValue = "__placeholder__";

  while (optionValues.includes(placeholderValue)) {
    placeholderValue = `_${placeholderValue}`;
  }

  const isEmpty = normalizedValue === "";
  const shadValue = isEmpty ? placeholderValue : normalizedValue;

  return (
    <ShadSelect
      value={shadValue}
      onValueChange={(val) => {
        if (val === placeholderValue) return;
        onChange?.(val);
      }}
      disabled={disabled}
    >
      <SelectTrigger id={id} className={className} aria-required={required}>
        <SelectValue placeholder={finalPlaceholder} />
      </SelectTrigger>
      <SelectContent>
        {isEmpty && (
          <SelectItem value={placeholderValue} disabled>
            {finalPlaceholder}
          </SelectItem>
        )}
        {options.map((option) => (
          <SelectItem key={option.value} value={String(option.value)}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </ShadSelect>
  );
}
