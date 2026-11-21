import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { csvResponse, isAdminRequest, pesos } from "@/lib/admin/csv";
import { leftover, missingFields, unitCents, type InventoryItem } from "@/lib/admin/inventory";

export async function GET(req: Request) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const evento = new URL(req.url).searchParams.get("evento");
  let query = createAdminClient().from("admin_inventory_items").select("*").order("event_name").order("purchase_date");
  if (evento) query = query.eq("event_name", evento);
  const { data } = await query;

  const rows = ((data ?? []) as InventoryItem[]).map((i) => [
    i.event_name,
    i.item_category,
    i.item,
    i.quantity,
    i.quantity_used,
    leftover(i),
    pesos(unitCents(i)),
    pesos(i.total_cents),
    i.is_estimated ? "Sí" : "No",
    i.store,
    i.status === "comprado" ? "Comprado" : "Por comprar",
    i.paid === true ? "Pagado" : i.paid === false ? "Falta pagar" : "Por confirmar",
    i.purchase_date,
    i.bought_by,
    missingFields(i).join(", "),
    i.notes,
  ]);

  return csvResponse(
    `inventario-poderosas-${new Date().toISOString().slice(0, 10)}.csv`,
    ["Evento", "Categoría", "Producto", "Cantidad comprada", "Utilizadas", "Sobrantes", "Valor unitario COP", "Valor total COP", "Estimado", "Tienda", "Estado", "Pago", "Fecha de compra", "Quién lo compró", "Falta", "Notas"],
    rows,
  );
}
