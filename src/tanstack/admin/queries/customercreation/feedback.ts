import { useMutation, useQueryClient } from "@tanstack/react-query";

import { feedbackApi } from "@/helpers/admin";

import { enterpriseQuery } from "../enterpriseQuery";

export type FeedbackRecord = {
  unique_id: string | number;
  customer?: string | number | null;
  customer_id?: string | number | null;
  customer_unique_id?: string | number | null;
  customer_name?: string;
  contact_no?: string;
  building_no?: string;
  zone_name?: string;
  city_name?: string;
  street?: string;
  area?: string;
  pincode?: string;
  latitude?: string;
  longitude?: string;
  id_proof_type?: string;
  id_no?: string;
  qr_code?: string;
  is_active_customer?: boolean;
  category: string;
  feedback_details: string;
  is_deleted?: boolean;
  is_active?: boolean;
  company_id?: string | number | null;
  company_unique_id?: string | number | null;
  company_name?: string | null;
  project_id?: string | number | null;
  project_unique_id?: string | number | null;
  project_name?: string | null;
};

export type FeedbackPayload = {
  customer: string | number;
  category: string;
  feedback_details: string;
};

const normalizeFeedbackId = (id: string | number) => String(id);

const listFeedbacks = () => feedbackApi.list() as Promise<FeedbackRecord[]>;

const getFeedback = (id: string | number) =>
  feedbackApi.get(id) as Promise<FeedbackRecord>;

const createFeedback = (payload: FeedbackPayload) =>
  feedbackApi.create(payload) as Promise<FeedbackRecord>;

const updateFeedback = (id: string | number, payload: FeedbackPayload) =>
  feedbackApi.update(id, payload) as Promise<FeedbackRecord>;

const replaceFeedbackInList = (
  feedbacks: FeedbackRecord[] | undefined,
  feedback: FeedbackRecord
) => {
  if (!feedbacks) return feedbacks;

  const feedbackId = normalizeFeedbackId(feedback.unique_id);

  return feedbacks.map((record) =>
    normalizeFeedbackId(record.unique_id) === feedbackId ? feedback : record
  );
};

export const feedbackQueryKeys = {
  all: ["customer masters", "feedbacks"] as const,
  detail: (id: string | number) =>
    ["customer masters", "feedbacks", normalizeFeedbackId(id)] as const,
};

export function useFeedbacksQuery() {
  return enterpriseQuery<FeedbackRecord[]>({
    queryKey: feedbackQueryKeys.all,
    queryFn: listFeedbacks,
  });
}

export function useFeedbackQuery(id: string | number | null | undefined) {
  return enterpriseQuery<FeedbackRecord>({
    queryKey: feedbackQueryKeys.detail(id ?? "new"),
    queryFn: () => getFeedback(id as string | number),
    enabled: Boolean(id),
  });
}

export function useCreateFeedbackMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createFeedback,
    onSuccess: async (feedback) => {
      queryClient.setQueryData(
        feedbackQueryKeys.detail(feedback.unique_id),
        feedback
      );
      await queryClient.invalidateQueries({ queryKey: feedbackQueryKeys.all });
    },
  });
}

export function useUpdateFeedbackMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string | number;
      payload: FeedbackPayload;
    }) => updateFeedback(id, payload),
    onSuccess: async (feedback, variables) => {
      queryClient.setQueryData(feedbackQueryKeys.detail(variables.id), feedback);
      queryClient.setQueryData<FeedbackRecord[]>(
        feedbackQueryKeys.all,
        (current) => replaceFeedbackInList(current, feedback)
      );
      await queryClient.invalidateQueries({ queryKey: feedbackQueryKeys.all });
    },
  });
}
