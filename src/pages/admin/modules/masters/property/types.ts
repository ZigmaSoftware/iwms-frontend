import type { PropertyPayload } from "@/tanstack/admin/queries/wastetype/property";

export type PropertyEditorProps = {
  initialPayload: PropertyPayload;
  isEdit: boolean;
  isSubmitting: boolean;
  onCancel: () => void;
  onSubmit: (payload: PropertyPayload) => Promise<void>;
};

