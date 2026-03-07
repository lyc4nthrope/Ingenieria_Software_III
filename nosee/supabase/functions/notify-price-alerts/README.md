# notify-price-alerts

Edge Function para generar notificaciones in-app cuando una alerta de precio se cumple.

## Variables requeridas

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CRON_SECRET` (token secreto para invocación programada)

## Deploy

```bash
supabase functions deploy notify-price-alerts
```

## Probar manual

```bash
curl -X POST \
  "https://<PROJECT_REF>.supabase.co/functions/v1/notify-price-alerts" \
  -H "x-cron-secret: <CRON_SECRET>"
```

## Programar ejecución

Opción recomendada: cron externo (GitHub Actions / cron-job.org / n8n) cada 10 minutos.

- URL: `https://<PROJECT_REF>.supabase.co/functions/v1/notify-price-alerts`
- Método: `POST`
- Header: `x-cron-secret: <CRON_SECRET>`

> Esta función es aditiva y no modifica flujos existentes de la app.
> Guarda filas en `public.price_alert_notifications` con `channel = 'in_app'`.
