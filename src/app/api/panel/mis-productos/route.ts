import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const { data: products } = await supabase
    .from("products")
    .select("id, title, price_cents, currency, cover_image_url, is_published")
    .eq("creator_id", user.id)
    .order("created_at", { ascending: false });

  return NextResponse.json({ products: products ?? [] });
}
