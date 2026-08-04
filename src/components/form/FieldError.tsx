type FieldErrorProps = {
  message?: string;
};

/** Standard inline validation-error text, matching the app's existing error styling. */
export function FieldError({ message }: FieldErrorProps) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-red-500">{message}</p>;
}
