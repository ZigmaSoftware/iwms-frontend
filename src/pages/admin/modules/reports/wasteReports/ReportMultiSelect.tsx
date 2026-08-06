import { MultiSelect } from "@/components/form/MultiSelect";

export type ReportMultiSelectOption = {
  value: string;
  label: string;
};

type ReportMultiSelectProps = {
  value: string[];
  onChange: (value: string[]) => void;
  options: ReportMultiSelectOption[];
  placeholder: string;
  disabled?: boolean;
  ariaLabel: string;
};

export default function ReportMultiSelect({
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
  ariaLabel,
}: ReportMultiSelectProps) {
  return (
    <MultiSelect
      value={value}
      onChange={(next) => onChange(next.map(String))}
      options={options}
      maxSelectedLabels={1}
      placeholder={placeholder}
      disabled={disabled}
      id={ariaLabel.toLowerCase().replace(/[^a-z0-9]+/g, "-")}
      filter
    />
  );
}
