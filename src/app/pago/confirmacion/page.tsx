import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const STATUS_COPY: Record<string, { title: string; message: string }> = {
  approved: {
    title: "¡Pago aprobado!",
    message: "Tu compra quedó confirmada. Ya puedes acceder a tu contenido.",
  },
  declined: {
    title: "Pago rechazado",
    message: "Tu banco o tarjeta rechazó el pago. Puedes intentar de nuevo con otro medio de pago.",
  },
  voided: {
    title: "Pago anulado",
    message: "Esta transacción fue anulada. No se realizó ningún cobro.",
  },
  error: {
    title: "Algo salió mal",
    message: "Hubo un error procesando el pago. Si el dinero salió de tu cuenta, se te reembolsará automáticamente.",
  },
  pending: {
    title: "Estamos confirmando tu pago",
    message: "Esto puede tardar unos segundos. Refresca esta página en un momento.",
  },
};

export default async function ConfirmacionPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string; id?: string }>;
}) {
  const { order: orderId, id: wompiTransactionId } = await searchParams;
  const supabase = await createClient();

  if (!orderId) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
        <h1 className="font-serif text-2xl">No encontramos esa orden</h1>
        <Link href="/" className="text-gold hover:underline">
          ← Volver a Poderosas
        </Link>
      </div>
    );
  }

  const { data: order } = await supabase
    .from("orders")
    .select("id, status, creator_id, creators(slug, wompi_public_key)")
    .eq("id", orderId)
    .maybeSingle();

  if (!order) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
        <h1 className="font-serif text-2xl">No encontramos esa orden</h1>
        <Link href="/" className="text-gold hover:underline">
          ← Volver a Poderosas
        </Link>
      </div>
    );
  }

  let status = order.status;
  const creator = Array.isArray(order.creators) ? order.creators[0] : order.creators;

  // Feedback inmediato para el comprador. El webhook de Wompi es la
  // fuente de verdad definitiva y actualizará el mismo registro
  // aunque el comprador cierre esta pestaña antes de que cargue.
  if (wompiTransactionId && status === "pending" && creator?.wompi_public_key) {
    const isSandbox = creator.wompi_public_key.startsWith("pub_test_");
    const host = isSandbox ? "https://sandbox.wompi.co/v1" : "https://production.wompi.co/v1";
    try {
      const res = await fetch(`${host}/transactions/${wompiTransactionId}`, { cache: "no-store" });
      const json = await res.json();
      const wompiStatus = json?.data?.status?.toLowerCase();
      if (wompiStatus) {
        status = wompiStatus;
        const admin = createAdminClient();
        await admin
          .from("orders")
          .update({ status: wompiStatus, wompi_transaction_id: wompiTransactionId })
          .eq("id", order.id);
      }
    } catch {
      // Si Wompi no responde a tiempo, dejamos el estado como estaba;
      // el webhook lo confirmará después.
    }
  }

  const copy = STATUS_COPY[status] ?? STATUS_COPY.pending;

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
      <h1 className="font-serif text-3xl">{copy.title}</h1>
      <p className="text-foreground/70 max-w-md">{copy.message}</p>
      <Link
        href={creator?.slug ? `/${creator.slug}` : "/"}
        className="mt-4 rounded-full bg-gold px-6 py-2.5 text-white text-sm hover:bg-gold-light hover:text-foreground transition-colors"
      >
        Volver al perfil
      </Link>
    </div>
  );
}
