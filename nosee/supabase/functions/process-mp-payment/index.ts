/**
 * process-mp-payment — Edge Function
 *
 * Procesa el pago de la tarifa de servicio (delivery_fee) mediante MercadoPago.
 *
 * FLUJO:
 *   1. Validar JWT del usuario autenticado
 *   2. Verificar que el pedido pertenece al usuario y está en 'pendiente_pago'
 *   3. Llamar a la API de MercadoPago con el token del CardPayment brick
 *   4. Si aprobado → confirm_order_payment RPC + guardar tarjeta en customer MP
 *   5. Retornar { success, status, paymentId, customerId }
 *
 * SEGURIDAD:
 *   - ACCESS_TOKEN de MP nunca sale del servidor
 *   - confirm_order_payment usa auth.uid() → se llama con anonClient (JWT del usuario)
 *   - El monto nunca viene del cliente: se lee de la BD
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

  // ── 1. Validar JWT ────────────────────────────────────────────────────────
  const anonClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth:   { persistSession: false, autoRefreshToken: false },
  });
  const adminClient = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: { user }, error: authErr } = await anonClient.auth.getUser();
  if (authErr || !user) return json(401, { error: "Unauthorized", detail: authErr?.message });

  // ── 2. Parsear body ───────────────────────────────────────────────────────
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

  if (!orderId || !token || !paymentMethodId || !email) {
    return json(400, { error: "Missing required fields" });
  }

  // ── 3. Verificar pedido ───────────────────────────────────────────────────
  const { data: order, error: orderErr } = await adminClient
    .from("orders")
    .select("id, user_id, delivery_fee, status")
    .eq("id", orderId)
    .single();

  if (orderErr || !order) return json(404, { error: "Order not found" });
  if (order.user_id !== user.id) return json(403, { error: "Forbidden" });
  if (order.status !== "pendiente_pago") {
    return json(400, { error: `Invalid status: ${order.status}` });
  }

  // ── 4. Procesar pago con MercadoPago ─────────────────────────────────────
  let mpData: { status: string; status_detail: string; id?: number };
  try {
    mpData = await mpFetch("/v1/payments", mpToken, "POST", {
      transaction_amount: Number(order.delivery_fee),
      token,
      description:       `Tarifa de servicio — pedido #${orderId}`,
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
    return json(502, { error: "Failed to reach MercadoPago API", detail: String(err) });
  }

  if (mpData.status !== "approved") {
    return json(200, { success: false, status: mpData.status, detail: mpData.status_detail });
  }

  // ── 5. Confirmar pedido en BD ─────────────────────────────────────────────
  const { error: rpcErr } = await anonClient.rpc("confirm_order_payment", { p_order_id: orderId });
  if (rpcErr) {
    console.error("[process-mp-payment] confirm_order_payment failed:", rpcErr.message);
    return json(500, { error: "Payment approved but order confirmation failed", detail: rpcErr.message });
  }

  // ── 6. Guardar tarjeta en customer de MercadoPago ─────────────────────────
  // Permite que en próximos pagos el brick muestre la tarjeta guardada.
  let customerId: string | null = null;
  try {
    // Leer mp_customer_id existente
    const { data: userRow } = await adminClient
      .from("users")
      .select("mp_customer_id")
      .eq("id", user.id)
      .single();

    if (userRow?.mp_customer_id) {
      customerId = userRow.mp_customer_id;
    } else {
      // Crear customer nuevo en MP
      const mpCustomer = await mpFetch("/v1/customers", mpToken, "POST", { email });
      if (mpCustomer?.id) {
        customerId = String(mpCustomer.id);
        await adminClient
          .from("users")
          .update({ mp_customer_id: customerId })
          .eq("id", user.id);
      }
    }

    // Guardar tarjeta en el customer
    if (customerId) {
      await mpFetch(`/v1/customers/${customerId}/cards`, mpToken, "POST", { token });
    }
  } catch (err) {
    // No bloqueamos el flujo si falla el guardado — el pago ya fue procesado
    console.warn("[process-mp-payment] card save failed:", String(err));
  }

  return json(200, {
    success:    true,
    status:     "approved",
    paymentId:  mpData.id,
    customerId,
  });
});
