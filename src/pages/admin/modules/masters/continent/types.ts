import type { ContinentPayload } from "@/tanstack/admin";

export type ContinentEditorProps = {
  initialPayload: ContinentPayload;
  isEdit: boolean;
  isSubmitting: boolean;
  onCancel: () => void;
  onSubmit: (payload: ContinentPayload) => Promise<void>;
};

