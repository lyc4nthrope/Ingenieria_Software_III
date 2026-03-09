-- Permitir actualizar tiendas a cualquier usuario autenticado
-- para edición de dirección/ubicación desde "Ver detalles".

drop policy if exists stores_update_authenticated on public.stores;
create policy stores_update_authenticated
on public.stores
for update
to authenticated
using (true)
with check (true);
