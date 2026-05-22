import type { SubPropertyPayload } from "@/tanstack/admin/queries/wastetype/subProperty";

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
