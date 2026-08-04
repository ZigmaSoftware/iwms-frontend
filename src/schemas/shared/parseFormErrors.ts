import type { z } from "zod";

export type FieldErrors = Record<string, string>;

/**
 * Runs a Zod schema against plain form state and returns per-field error
 * messages. The government app's forms use react-hook-form's `zodResolver`,
 * which wires a schema straight into `formState.errors`; these forms are
 * still built on plain `useState`, so this is that same wiring done by hand
 * inside `handleSubmit`.
 */
export function parseWithSchema<T>(
  schema: z.ZodTypeAny,
  values: unknown,
): { success: true; data: T } | { success: false; errors: FieldErrors } {
  const result = schema.safeParse(values);
  if (result.success) {
    return { success: true, data: result.data as T };
  }

  const errors: FieldErrors = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join(".") || "form";
    if (!errors[key]) errors[key] = issue.message;
  }
  return { success: false, errors };
}
