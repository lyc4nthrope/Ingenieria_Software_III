/**
 * process-mp-compromiso — Edge Function
 *
 * Procesa el pago del fondo de compromiso (5% del total del pedido, mínimo 1.000 COP).
 * Se ejecuta cuando el repartidor ya aceptó el pedido (estado pendiente_compromiso)
 * y el cliente paga el fondo antes de que el repartidor salga a comprar.
 *
 * FLUJO:
 *   1. Validar JWT del usuario autenticado
 *   2. Verificar que el pedido pertenece al usuario y está en 'pendiente_compromiso'
 *   3. Llamar a la API de MercadoPago con el token del CardPayment brick
 *   4. Si aprobado → confirm_compromiso_payment RPC (→ status: 'comprando') + guardar tarjeta
 *   5. Retornar { success, status, paymentId, customerId }
 *
 * DIFERENCIAS con process-mp-payment:
 *   - Valida status === 'pendiente_compromiso' (no 'pendiente_pago')
 *   - Usa order.compromiso_amount como monto (no delivery_fee)
 *   - Descripción: "Fondo de compromiso — pedido #N"
 *   - Llama RPC confirm_compromiso_payment (no confirm_order_payment)
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });

const mpFetch = (path: string, token: string, method = "GET", body?: unknown) =>
  fetch(`https://api.mercadopago.com${path}`, {
    method,
    headers: {
      "Content-Type":      "application/json",
      "Authorization":     `Bearer ${token}`,
      "X-Idempotency-Key": crypto.randomUUID(),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  }).then((r) => r.json());

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, content-type, x-client-info, apikey",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    });
  }

  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return json(401, { error: "Missing Authorization header" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey     = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const mpToken     = Deno.env.get("MP_ACCESS_TOKEN")!;

  const anonClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth:   { persistSession: false, autoRefreshToken: false },
  });
  const adminClient = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: { user }, error: authErr } = await anonClient.auth.getUser();
  if (authErr || !user) return json(401, { error: "Unauthorized", detail: authErr?.message });

  let body: {
    orderId:               number;
    token:                 string;
    paymentMethodId:       string;
    issuerId?:             string | number;
    installments?:         number;
    email:                 string;
    identificationType?:   string;
    identificationNumber?: string;
  };

  try { body = await req.json(); }
  catch { return json(400, { error: "Invalid JSON body" }); }

  const { orderId, token, paymentMethodId, issuerId, installments, email,
          identificationType, identificationNumber } = body;

  console.log("[process-mp-compromiso] === INICIO ===");
  console.log("[process-mp-compromiso] orderId:", orderId);
  console.log("[process-mp-compromiso] paymentMethodId:", paymentMethodId);
  console.log("[process-mp-compromiso] email:", email);
  console.log("[process-mp-compromiso] hasIssuerId:", !!issuerId);
  console.log("[process-mp-compromiso] installments:", installments);
  console.log("[process-mp-compromiso] hasIdentification:", !!(identificationType && identificationNumber));

  if (!orderId || !token || !paymentMethodId || !email) {
    console.log("[process-mp-compromiso] ERROR: Faltan campos requeridos");
    return json(400, { error: "Missing required fields" });
  }

  const { data: order, error: orderErr } = await adminClient
    .from("orders")
    .select("id, user_id, compromiso_amount, status")
    .eq("id", orderId)
    .single();

  console.log("[process-mp-compromiso] orderErr:", orderErr ? orderErr.message : "none");
  console.log("[process-mp-compromiso] orderFound:", !!order);
  console.log("[process-mp-compromiso] orderId:", orderId);
  console.log("[process-mp-compromiso] userId:", user.id);

  if (orderErr || !order) {
    console.log("[process-mp-compromiso] ERROR: Order not found");
    return json(404, { error: "Order not found" });
  }

  console.log("[process-mp-compromiso] pedido encontrado - id:", order.id);
  console.log("[process-mp-compromiso] pedido status:", order.status);
  console.log("[process-mp-compromiso] compromiso_amount:", order.compromiso_amount);
  console.log("[process-mp-compromiso] userMatch:", order.user_id === user.id);

  if (order.user_id !== user.id) {
    console.log("[process-mp-compromiso] ERROR: Forbidden - user mismatch");
    return json(403, { error: "Forbidden" });
  }
  if (order.status !== "pendiente_compromiso") {
    console.log("[process-mp-compromiso] ERROR: Invalid status - esperado pendiente_compromiso, recibido:", order.status);
    return json(400, { error: `Invalid status: ${order.status}` });
  }

  console.log("[process-mp-compromiso] Calling MercadoPago API...");
  console.log("[process-mp-compromiso] mpToken starts with:", mpToken ? mpToken.substring(0, 10) : "undefined");

  let mpData: { status: string; status_detail: string; id?: number; message?: string };
  try {
    mpData = await mpFetch("/v1/payments", mpToken, "POST", {
      transaction_amount: Number(order.compromiso_amount),
      token,
      description:       `Fondo de compromiso - pedido #${orderId}`,
      installments:      installments ?? 1,
      payment_method_id: paymentMethodId,
      ...(issuerId ? { issuer_id: issuerId } : {}),
      payer: {
        email,
        ...(identificationType && identificationNumber
          ? { identification: { type: identificationType, number: identificationNumber } }
          : {}),
      },
    });
  } catch (err) {
    console.log("[process-mp-compromiso] ERROR: No se pudo conectar a MP:", String(err));
    return json(502, { error: "Failed to reach MercadoPago API", detail: String(err) });
  }

  console.log("[process-mp-compromiso] MP response status:", mpData.status);
  console.log("[process-mp-compromiso] MP response status_detail:", mpData.status_detail);
  console.log("[process-mp-compromiso] MP response id:", mpData.id);
  console.log("[process-mp-compromiso] MP response message:", mpData.message || "none");

  if (mpData.status !== "approved") {
    console.log("[process-mp-compromiso] Pago NO aprobado, status:", mpData.status, "detail:", mpData.status_detail);
    return json(200, { success: false, status: mpData.status, detail: mpData.status_detail });
  }

  console.log("[process-mp-compromiso] Pago aprobado! paymentId:", mpData.id);

  const { error: rpcErr } = await anonClient.rpc("confirm_compromiso_payment", {
    p_order_id:   orderId,
    p_payment_id: String(mpData.id),
  });
  if (rpcErr) {
    console.error("[process-mp-compromiso] RPC ERROR:", rpcErr.message, "code:", rpcErr.code);
    return json(500, { error: "Payment approved but compromiso confirmation failed", detail: rpcErr.message });
  }

  console.log("[process-mp-compromiso] RPC confirm_compromiso_payment exitoso");

  let customerId: string | null = null;
  try {
    const { data: userRow } = await adminClient
      .from("users")
      .select("mp_customer_id")
      .eq("id", user.id)
      .single();

    if (userRow?.mp_customer_id) {
      customerId = userRow.mp_customer_id;
    } else {
      const mpCustomer = await mpFetch("/v1/customers", mpToken, "POST", { email });
      if (mpCustomer?.id) {
        customerId = String(mpCustomer.id);
        await adminClient
          .from("users")
          .update({ mp_customer_id: customerId })
          .eq("id", user.id);
      }
    }

    if (customerId) {
      await mpFetch(`/v1/customers/${customerId}/cards`, mpToken, "POST", { token });
    }
  } catch (err) {
    console.warn("[process-mp-compromiso] card save failed:", String(err));
  }

  return json(200, {
    success:    true,
    status:     "approved",
    paymentId:  mpData.id,
    customerId,
  });
});
