import type { SubPropertyPayload } from "@/helpers/admin/directQueries";

export type SubPropertyOptionRecord = {
  unique_id: string | number;
  property_name: string;
  is_active: boolean;
};

export type SubPropertyEditorProps = {
  initialPayload: SubPropertyPayload;
  properties: SubPropertyOptionRecord[];
  isEdit: boolean;
  isSubmitting: boolean;
  onCancel: () => void;
  onSubmit: (payload: SubPropertyPayload) => Promise<void>;
};
