import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return json(405, { success: false, error: "Method not allowed" });
  }

  const cronSecret = Deno.env.get("CRON_SECRET");
  if (cronSecret) {
    const received = req.headers.get("x-cron-secret") || "";
    if (received !== cronSecret) {
      return json(401, { success: false, error: "Unauthorized" });
    }
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return json(500, { success: false, error: "Missing Supabase env vars" });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: alerts, error: alertsError } = await supabase
    .from("price_alerts")
    .select("id, user_id, product_id, target_price")
    .eq("is_active", true);

  if (alertsError) {
    return json(500, { success: false, error: alertsError.message });
  }

  if (!alerts || alerts.length === 0) {
    return json(200, {
      success: true,
      processedAlerts: 0,
      matchedAlerts: 0,
      sent: 0,
      skippedAlreadySent: 0,
      failed: 0,
    });
  }

  const productIds = [...new Set(alerts.map((a) => a.product_id).filter(Boolean))];

  const { data: publications, error: pubsError } = await supabase
    .from("price_publications")
    .select(
      "id, product_id, price, created_at, product:products(name, brand:brands(name)), store:stores(name)",
    )
    .eq("is_active", true)
    .in("product_id", productIds)
    .order("price", { ascending: true })
    .order("created_at", { ascending: false });

  if (pubsError) {
    return json(500, { success: false, error: pubsError.message });
  }

  const bestPublicationByProduct = new Map<number, any>();
  for (const publication of publications || []) {
    if (!bestPublicationByProduct.has(publication.product_id)) {
      bestPublicationByProduct.set(publication.product_id, publication);
    }
  }

  const matched = alerts
    .map((alert) => {
      const publication = bestPublicationByProduct.get(alert.product_id);
      if (!publication) return null;
      if (Number(publication.price) > Number(alert.target_price)) return null;
      return { alert, publication };
    })
    .filter(Boolean) as Array<{ alert: any; publication: any }>;

  if (matched.length === 0) {
    return json(200, {
      success: true,
      processedAlerts: alerts.length,
      matchedAlerts: 0,
      sent: 0,
      skippedAlreadySent: 0,
      failed: 0,
    });
  }

  const alertIds = [...new Set(matched.map((m) => m.alert.id))];
  const publicationIds = [...new Set(matched.map((m) => m.publication.id))];

  const { data: existingNotifications, error: notifError } = await supabase
    .from("price_alert_notifications")
    .select("alert_id, publication_id, channel")
    .in("alert_id", alertIds)
    .in("publication_id", publicationIds)
    .eq("channel", "in_app");

  if (notifError) {
    return json(500, { success: false, error: notifError.message });
  }

  const existingSet = new Set(
    (existingNotifications || []).map(
      (n) => `${n.alert_id}:${n.publication_id}:${n.channel}`,
    ),
  );

  let sent = 0;
  let skippedAlreadySent = 0;
  let failed = 0;

  for (const { alert, publication } of matched) {
    const dedupKey = `${alert.id}:${publication.id}:in_app`;
    if (existingSet.has(dedupKey)) {
      skippedAlreadySent += 1;
      continue;
    }

    const { error: insertError } = await supabase
      .from("price_alert_notifications")
      .insert({
        alert_id: alert.id,
        publication_id: publication.id,
        user_id: alert.user_id,
        channel: "in_app",
        status: "sent",
        error: null,
      });

    if (insertError) {
      failed += 1;
      continue;
    }

    sent += 1;
    existingSet.add(dedupKey);
  }

  return json(200, {
    success: true,
    processedAlerts: alerts.length,
    matchedAlerts: matched.length,
    sent,
    skippedAlreadySent,
    failed,
  });
});
