"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type BonusFile = { id: string; file_name: string; display_name: string | null };

export function CourseBonuses({ productId }: { productId: string }) {
  const [files, setFiles] = useState<BonusFile[]>([]);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("product_files")
      .select("id, file_name, display_name")
      .eq("product_id", productId)
      .order("order_index")
      .then(({ data }) => setFiles(data ?? []));
  }, [productId]);

  if (files.length === 0) return null;

  return (
    <div className="p-4 border-t border-gold-light/40">
      <h3 className="text-sm font-medium text-gold mb-2">Bonos de tu compra</h3>
      <div className="flex flex-col gap-1.5">
        {files.map((file) => (
          <a
            key={file.id}
            href={`/api/mis-compras/files/${file.id}/download`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-left text-sm px-2 py-1.5 rounded hover:bg-beige-light"
          >
            ⬇ {file.display_name || file.file_name}
          </a>
        ))}
      </div>
    </div>
  );
}
