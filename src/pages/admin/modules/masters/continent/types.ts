import type { ContinentPayload } from "@/helpers/admin/directQueries";

export type ContinentEditorProps = {
  initialPayload: ContinentPayload;
  isEdit: boolean;
  isSubmitting: boolean;
  onCancel: () => void;
  onSubmit: (payload: ContinentPayload) => Promise<void>;
};

