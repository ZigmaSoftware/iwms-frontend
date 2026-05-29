import type { PropertyPayload } from "@/helpers/admin/directQueries";

export type PropertyEditorProps = {
  initialPayload: PropertyPayload;
  isEdit: boolean;
  isSubmitting: boolean;
  onCancel: () => void;
  onSubmit: (payload: PropertyPayload) => Promise<void>;
};

