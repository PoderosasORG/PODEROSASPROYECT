import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendTicketEmail } from "@/lib/sendTicketEmail";
import { sendCourseEmail } from "@/lib/sendCourseEmail";
import { sendReceiptEmail } from "@/lib/sendReceiptEmail";
import { wompiCrmFields } from "@/lib/admin/wompiCrm";
import { registerStudent } from "@/lib/welcome/journey";
import { claimEmail, ensurePreferences, finishEmail } from "@/lib/welcome/comms";
import { loadCourseInfo } from "@/lib/welcome/courseInfo";
import { sendWelcomeEmail } from "@/lib/welcome/welcomeEmail";
import { trackDeclined, trackPurchase } from "@/lib/analytics/server";
import { registerInstallmentPayment } from "@/lib/installments/plans";
import { sendInstallmentEmail } from "@/lib/installments/emails";
import { pauseDate } from "@/lib/installments/schedule";

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
      "id, creator_id, product_id, buyer_id, buyer_name, buyer_email, status, amount_cents, currency, products(id, type, title, billing_interval, access_duration_months)",
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

  const product = Array.isArray(order.products) ? order.products[0] : order.products;
  const justApproved = newStatus === "approved" && !wasAlreadyApproved;

  // Productos con acceso por tiempo limitado (ej. Metodología PODEROSAS,
  // 6 meses): la fecha de vencimiento se fija una sola vez, la primera
  // vez que ESTA orden queda aprobada — no se recalcula si Wompi
  // reenvía el mismo evento después.
  let accessExpiresAt: string | undefined;
  if (justApproved && product?.access_duration_months) {
    const expiry = new Date();
    expiry.setUTCMonth(expiry.getUTCMonth() + product.access_duration_months);
    accessExpiresAt = expiry.toISOString();
  }

  // Pago en cuotas: consulta aparte y tolerante (si las columnas no
  // existieran, el pago se aprueba igual como compra normal). Cada cuota
  // habilita solo su tramo del acceso (ver src/lib/installments/config.ts).
  let installment: { planId: string; number: number } | null = null;
  try {
    const { data: instRow } = await admin
      .from("orders")
      .select("installment_plan_id, installment_number")
      .eq("id", order.id)
      .maybeSingle();
    if (instRow?.installment_plan_id && instRow.installment_number) {
      installment = { planId: instRow.installment_plan_id, number: instRow.installment_number };
    }
  } catch {
    installment = null;
  }
  let installmentResult: Awaited<ReturnType<typeof registerInstallmentPayment>> = null;
  if (justApproved && installment) {
    try {
      installmentResult = await registerInstallmentPayment({ ...installment, buyerId: order.buyer_id ?? null });
      if (installmentResult) accessExpiresAt = installmentResult.accessUntil.toISOString();
    } catch (err) {
      console.error("[cuotas] no se pudo registrar la cuota:", err);
    }
  }

  await admin
    .from("orders")
    .update({
      status: newStatus,
      wompi_transaction_id: transaction.id,
      ...(accessExpiresAt ? { access_expires_at: accessExpiresAt } : {}),
    })
    .eq("id", order.id);

  // Datos de CRM/finanzas para /admin. Va en un update aparte para que,
  // si algo falla aquí, no afecte la aprobación del pago de arriba.
  if (justApproved) {
    const crm = wompiCrmFields(transaction, order.amount_cents);
    const { error: crmError } = await admin.from("orders").update(crm).eq("id", order.id);
    if (crmError) console.error("[webhook] no se guardaron los datos de CRM:", crmError.message);
  }

  // Medición del embudo (GA4 / Meta): la compra se envía solo aquí, con el
  // pago confirmado por Wompi, y una sola vez por pedido (analytics_sent).
  // Sin datos personales. Nunca afecta la aprobación del pago.
  const conversion = {
    orderId: order.id,
    productId: order.product_id,
    productTitle: product?.title ?? "",
    amountCents: order.amount_cents,
    currency: order.currency,
    siteUrl: req.nextUrl.origin,
  };
  if (justApproved) {
    await trackPurchase(conversion);
  } else if (["declined", "voided", "error"].includes(newStatus) && !wasAlreadyApproved && transaction.id) {
    await trackDeclined({ ...conversion, transactionId: String(transaction.id), status: newStatus });
  }

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
  // Cuotas 2 y 3: la alumna ya tiene cuenta y ya recibió la bienvenida.
  const isLaterInstallment = !!installment && installment.number > 1;
  if (justApproved && product?.type === "course" && order.buyer_email && !isLaterInstallment) {
    // Compra sin cuenta (el checkout ya no exige login antes de pagar):
    // la orden llega con buyer_id null. has_access_to_product exige
    // buyer_id = auth.uid(), así que sin esto el pago quedaría aprobado
    // pero sin dar acceso a nada. Se crea (o se encuentra, si ya existía)
    // la cuenta con ese correo y se vincula a la orden.
    let setPasswordUrl: string | undefined;
    // ¿La alumna ya tiene una cuenta usable? (compró con sesión iniciada,
    // o ya existía una cuenta suya en la que alguna vez entró).
    let accountActive = !!order.buyer_id;
    let studentUserId: string | null = order.buyer_id ?? null;
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
          const found = list?.users.find(
            (u) => u.email?.toLowerCase() === order.buyer_email!.toLowerCase(),
          );
          accountUserId = found?.id;
          accountActive = !!found?.last_sign_in_at;
        }
        studentUserId = accountUserId ?? null;

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
      // Flujo de bienvenida (Metodología): registrar a la alumna, sus
      // preferencias de comunicación y enviar la bienvenida UNA sola vez
      // por compra, aunque Wompi repita el aviso o lleguen dos a la vez.
      try {
        await registerStudent({
          productId: order.product_id,
          email: order.buyer_email,
          userId: studentUserId,
          fullName: order.buyer_name ?? null,
          orderId: order.id,
          accountActive,
        });
      } catch (err) {
        console.error("[bienvenida] no se pudo registrar a la alumna:", err);
      }

      let manageToken: string | null = null;
      try {
        // Consulta aparte y tolerante: si la columna no existiera, el pago
        // igual se aprueba (nunca depende de esto).
        const { data: optRow } = await admin.from("orders").select("marketing_opt_in").eq("id", order.id).maybeSingle();
        manageToken = await ensurePreferences(order.buyer_email, optRow?.marketing_opt_in === true, "checkout");
      } catch (err) {
        console.error("[bienvenida] no se pudieron guardar las preferencias:", err);
      }

      const dedupeKey = `bienvenida:${order.id}`;
      if (await claimEmail({ dedupeKey, email: order.buyer_email, kind: "bienvenida_metodologia", category: "operativo" })) {
        try {
          const origin = req.nextUrl.origin;
          await sendWelcomeEmail({
            to: order.buyer_email,
            buyerName: order.buyer_name ?? "",
            courseUrl: `${origin}/cursos/metodologia-poderosa`,
            loginUrl: `${origin}/login?next=/cursos/metodologia-poderosa`,
            setPasswordUrl,
            accessUntil: accessExpiresAt ?? null,
            whatsappUrl: process.env.WHATSAPP_COMMUNITY_URL || null,
            preferencesUrl: manageToken ? `${origin}/preferencias?t=${manageToken}` : null,
            info: await loadCourseInfo(order.product_id),
          });
          await finishEmail(dedupeKey, true);
        } catch (err) {
          await finishEmail(dedupeKey, false);
          console.error("[bienvenida] no se pudo enviar el correo de bienvenida:", err);
        }
      }
    } else {
      try {
        await sendCourseEmail({
          to: order.buyer_email,
          buyerName: order.buyer_name ?? "",
          courseTitle: product.title,
          courseUrl: `${req.nextUrl.origin}/cursos/metodologia-poderosa`,
          setPasswordUrl,
          accessDurationMonths: product.access_duration_months ?? undefined,
        });
      } catch (err) {
        console.error("No se pudo enviar el correo de confirmación del curso:", err);
      }
    }
  }

  // Correo del plan de cuotas: qué cuota se pagó y la próxima fecha límite.
  if (installmentResult && order.buyer_email) {
    const plan = installmentResult.plan;
    try {
      // La cuenta pudo crearse arriba (compra sin sesión): se guarda en el plan.
      if (!plan.buyer_id) {
        const { data: linked } = await admin.from("orders").select("buyer_id").eq("id", order.id).maybeSingle();
        if (linked?.buyer_id) await admin.from("installment_plans").update({ buyer_id: linked.buyer_id }).eq("id", plan.id);
      }
      const payUrl = `${req.nextUrl.origin}/cuotas/${plan.pay_token}`;
      if (installmentResult.done) {
        await sendInstallmentEmail({
          to: order.buyer_email,
          name: order.buyer_name,
          payUrl,
          email: { kind: "completada", total: plan.installments_total, accessUntil: installmentResult.accessUntil },
        });
      } else if (installmentResult.nextDue) {
        const nextNumber = plan.installments_paid + 1;
        await sendInstallmentEmail({
          to: order.buyer_email,
          name: order.buyer_name,
          payUrl,
          email: {
            kind: "pagada",
            paidNumber: installment!.number,
            total: plan.installments_total,
            nextNumber,
            nextAmountCents: plan.schedule.installments[nextNumber - 1].amountCents,
            nextDue: installmentResult.nextDue,
            pauseOn: pauseDate(plan.schedule, new Date(plan.access_start!), nextNumber),
            accessUntil: installmentResult.accessUntil,
          },
        });
      }
    } catch (err) {
      console.error("[cuotas] no se pudo enviar el correo de la cuota:", err);
    }
  }

  // Comprobante de venta para Shei — solo para productos con acceso por
  // tiempo limitado (ej. Metodología PODEROSAS), no para cada venta del
  // sitio: es lo que pidió para organizar esos ingresos con su contadora.
  if (justApproved && product?.access_duration_months) {
    try {
      await sendReceiptEmail({
        orderId: order.id,
        buyerName: order.buyer_name ?? "",
        buyerEmail: order.buyer_email ?? "",
        productTitle: product.title,
        amountCents: order.amount_cents,
        currency: order.currency,
        paidAt: new Date(),
      });
    } catch (err) {
      console.error("No se pudo enviar el comprobante de venta a Shei:", err);
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
