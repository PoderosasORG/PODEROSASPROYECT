import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PurchasedContent } from "@/components/PurchasedContent";

export const dynamic = "force-dynamic";

export default async function MisComprasPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/mis-compras");
  }

  const { data: orders } = await supabase
    .from("orders")
    .select(
      `id, created_at, products (
        id, title, type, cover_image_url,
        course_lessons ( id, title, order_index, is_free_preview ),
        product_files ( id, file_name, order_index )
      )`,
    )
    .eq("buyer_id", user.id)
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  const purchases = (orders ?? [])
    .map((o) => (Array.isArray(o.products) ? o.products[0] : o.products))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  return (
    <div className="flex flex-1 flex-col items-center gap-8 px-6 py-16">
      <h1 className="font-serif text-3xl">Mis compras</h1>
      {purchases.length === 0 ? (
        <p className="text-foreground/70">Todavía no has comprado nada.</p>
      ) : (
        <div className="flex flex-col gap-6 w-full max-w-2xl">
          {purchases.map((product) => (
            <PurchasedContent key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
