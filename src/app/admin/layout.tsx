import Link from "next/link";
import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin/auth";

export const metadata: Metadata = {
  title: "Admin · Poderosas",
  robots: { index: false, follow: false },
};

const SECTIONS = [
  { href: "/admin", label: "Finanzas" },
  { href: "/admin/crm", label: "CRM" },
  { href: "/admin/gastos", label: "Gastos y suscripciones" },
  { href: "/admin/referidos", label: "Referidos", soon: true },
  { href: "/admin/codigos", label: "Códigos de regalo", soon: true },
  { href: "/admin/inventario", label: "Inventario" },
  { href: "/admin/pqr", label: "PQR", soon: true },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <div className="flex flex-1 flex-col bg-beige-light">
      <div className="border-b border-gold-light/60 bg-white/70">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 py-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="font-serif text-2xl">Panel interno Poderosas</p>
            <Link href="/panel" className="text-sm text-gold hover:underline">
              ← Mi panel
            </Link>
          </div>
          <nav className="flex gap-2 overflow-x-auto pb-1 text-sm">
            {SECTIONS.map((s) => (
              <Link
                key={s.href}
                href={s.href}
                className="whitespace-nowrap rounded-full border border-gold-light/70 bg-white px-3 py-1.5 hover:border-gold"
              >
                {s.label}
                {s.soon ? <span className="ml-1 text-[10px] text-foreground/40">pronto</span> : null}
              </Link>
            ))}
          </nav>
        </div>
      </div>
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 py-8">{children}</div>
    </div>
  );
}
