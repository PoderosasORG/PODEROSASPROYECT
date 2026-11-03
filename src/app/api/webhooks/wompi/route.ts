import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendTicketEmail } from "@/lib/sendTicketEmail";
import { sendCourseEmail } from "@/lib/sendCourseEmail";

// Wompi llama esta URL directamente desde sus servidores (no desde
// el navegador del comprador), así que es la fuente de verdad real
// del estado del pago — funciona aunque el comprador cierre la
// pestaña antes de volver a /pago/confirmacion.
// Configúrala en Wompi → Desarrolladores → Eventos como:
//   https://tu-dominio.com/api/webhooks/wompi

function getByPath(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in acc) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

export async function POST(req: NextRequest) {
  const payload = await req.json().catch(() => null);
  if (!payload) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  const transaction = payload?.data?.transaction;
  const reference: string | undefined = transaction?.reference;
  const properties: string[] = payload?.signature?.properties ?? [];
  const checksum: string | undefined = payload?.signature?.checksum;
  const timestamp = payload?.timestamp;

  if (!reference || !checksum || properties.length === 0) {
    return NextResponse.json({ error: "malformed event" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: order } = await admin
    .from("orders")
    .select(
      "id, creator_id, product_id, buyer_id, buyer_name, buyer_email, status, amount_cents, products(id, type, title, billing_interval)",
    )
    .eq("id", reference)
    .maybeSingle();

  if (!order) {
    // No es un error de Wompi: puede ser un evento de otra orden/entorno.
    return NextResponse.json({ ok: true });
  }

  const { data: secretRow } = await admin
    .from("creator_payment_secrets")
    .select("wompi_events_secret")
    .eq("creator_id", order.creator_id)
    .maybeSingle();

  if (!secretRow?.wompi_events_secret) {
    return NextResponse.json({ error: "missing events secret" }, { status: 400 });
  }

  const concatenated =
    properties.map((path) => String(getByPath(payload.data, path) ?? "")).join("") +
    String(timestamp) +
    secretRow.wompi_events_secret;
  const expectedChecksum = crypto.createHash("sha256").update(concatenated).digest("hex");

  if (expectedChecksum.toLowerCase() !== String(checksum).toLowerCase()) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let newStatus = String(transaction.status).toLowerCase();
  const wasAlreadyApproved = order.status === "approved";

  // Defensa adicional: aunque amount-in-cents ya está protegido por la
  // firma de integridad (si alguien lo manipula, la firma no coincide
  // y Wompi rechaza el pago antes de llegar aquí), igual confirmamos
  // que lo efectivamente cobrado no sea menor a lo que la orden dice
  // que costaba — nunca confiar en un solo control. Pagar de más no
  // se bloquea (puede pasar por redondeos o cuotas).
  const paidCents = Number(transaction.amount_in_cents);
  if (newStatus === "approved" && Number.isFinite(paidCents) && paidCents < order.amount_cents) {
    console.error(
      `Integridad de pago: orden ${order.id} esperaba ${order.amount_cents} centavos, Wompi reporta ${paidCents}. No se aprueba.`,
    );
    newStatus = "error";
  }

  await admin
    .from("orders")
    .update({
      status: newStatus,
      wompi_transaction_id: transaction.id,
    })
    .eq("id", order.id);

  const product = Array.isArray(order.products) ? order.products[0] : order.products;
  const justApproved = newStatus === "approved" && !wasAlreadyApproved;

  // Solo generamos la boleta la primera vez que la orden queda aprobada
  // (Wompi puede reenviar el mismo evento más de una vez).
  if (justApproved && product?.type === "event" && order.buyer_email) {
    const { data: ticket } = await admin
      .from("event_tickets")
      .insert({ order_id: order.id, product_id: order.product_id })
      .select("id")
      .single();

    if (ticket) {
      try {
        await sendTicketEmail({
          to: order.buyer_email,
          buyerName: order.buyer_name ?? "",
          ticketId: ticket.id,
          siteUrl: req.nextUrl.origin,
        });
      } catch (err) {
        // No tumbamos el webhook por un fallo de correo: la boleta ya
        // quedó creada en la base de datos y se puede reenviar a mano.
        console.error("No se pudo enviar el correo de la boleta:", err);
      }
    }
  }

  // Confirmación de compra de un curso con categorías (ej. Metodología
  // Poderosa) — distinto de los cursos "normales" (lecciones sueltas),
  // que hoy no mandan correo de confirmación.
  if (justApproved && product?.type === "course" && order.buyer_email) {
    // Compra sin cuenta (el checkout ya no exige login antes de pagar):
    // la orden llega con buyer_id null. has_access_to_product exige
    // buyer_id = auth.uid(), así que sin esto el pago quedaría aprobado
    // pero sin dar acceso a nada. Se crea (o se encuentra, si ya existía)
    // la cuenta con ese correo y se vincula a la orden.
    let setPasswordUrl: string | undefined;
    if (!order.buyer_id) {
      try {
        const { data: created, error: createError } = await admin.auth.admin.createUser({
          email: order.buyer_email,
          email_confirm: true,
          user_metadata: { full_name: order.buyer_name ?? "" },
        });

        let accountUserId = created?.user?.id;

        if (createError) {
          // Ya existe una cuenta con ese correo (comprador recurrente que
          // nunca inició sesión en este checkout) — se busca en vez de
          // fallar. listUsers no filtra por email en todas las versiones
          // del SDK, así que se recorre la lista corta de resultados.
          const { data: list } = await admin.auth.admin.listUsers({ perPage: 200 });
          accountUserId = list?.users.find(
            (u) => u.email?.toLowerCase() === order.buyer_email!.toLowerCase(),
          )?.id;
        }

        if (accountUserId) {
          await admin.from("orders").update({ buyer_id: accountUserId }).eq("id", order.id);

          const { data: link } = await admin.auth.admin.generateLink({
            type: "recovery",
            email: order.buyer_email,
            options: {
              redirectTo: `${req.nextUrl.origin}/auth/confirm?next=/actualizar-contrasena`,
            },
          });
          setPasswordUrl = link?.properties?.action_link;
        }
      } catch (err) {
        // No tumba el webhook: la orden ya quedó aprobada. Si esto
        // falla, toca vincular la cuenta a mano desde el panel.
        console.error("No se pudo crear/vincular la cuenta del comprador:", err);
      }
    }

    const { count: categorizedCount } = await admin
      .from("course_categories")
      .select("id", { count: "exact", head: true })
      .eq("product_id", order.product_id);

    if (categorizedCount && categorizedCount > 0) {
      try {
        await sendCourseEmail({
          to: order.buyer_email,
          buyerName: order.buyer_name ?? "",
          courseTitle: product.title,
          courseUrl: `${req.nextUrl.origin}/cursos/metodologia-poderosa`,
          setPasswordUrl,
        });
      } catch (err) {
        console.error("No se pudo enviar el correo de confirmación del curso:", err);
      }
    }
  }

  // Al aprobarse una suscripción, activa/renueva la membresía. Es un
  // pago único por período (mes o año), no un cobro recurrente — Wompi
  // no ofrece eso, así que renovar significa "vuelve a pagar".
  if (justApproved && product?.type === "membership" && order.buyer_id) {
    const months = product.billing_interval === "year" ? 12 : 1;
    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + months);

    await admin.from("memberships").upsert(
      {
        buyer_id: order.buyer_id,
        creator_id: order.creator_id,
        product_id: product.id,
        status: "active",
        current_period_end: periodEnd.toISOString(),
      },
      { onConflict: "buyer_id,product_id" },
    );
  }

  return NextResponse.json({ ok: true });
}
