import { requireAdmin } from "@/lib/admin/auth";

export async function Proximamente({ title, items }: { title: string; items: string[] }) {
  await requireAdmin();
  return (
    <div className="flex flex-col gap-4 max-w-2xl">
      <h1 className="font-serif text-3xl">{title}</h1>
      <div className="rounded-2xl border border-gold-light/60 bg-white p-5 text-sm">
        <p className="font-medium mb-2">Próxima fase. Va a incluir:</p>
        <ul className="list-disc pl-5 text-foreground/70 space-y-1">
          {items.map((i) => (
            <li key={i}>{i}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
