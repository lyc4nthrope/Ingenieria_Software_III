import { supabase } from "@/services/supabase.client";

export const createAutoModerationReport = async ({
  reportedType,
  reportedId,
  reporterUserId,
  reportedUserId = null,
  reason = "offensive",
  description = null,
}) => {
  if (!reportedType || !reportedId || !reporterUserId) return;

  await supabase.from("reports").insert({
    reported_type: String(reportedType),
    reported_id: String(reportedId),
    reporter_user_id: reporterUserId,
    reported_user_id: reportedUserId || reporterUserId,
    reason,
    description,
    status: "PENDING",
    created_at: new Date().toISOString(),
    action_taken: "AUTO_FLAGGED_BY_MODERATION",
  });
};
