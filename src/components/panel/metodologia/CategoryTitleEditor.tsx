// src/components/panel/metodologia/CategoryTitleEditor.tsx
"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function CategoryTitleEditor({ categoryId, initialTitle }: { categoryId: string; initialTitle: string }) {
  const [title, setTitle] = useState(initialTitle);
  const [saving, setSaving] = useState(false);

  async function handleBlur() {
    if (!title.trim() || title === initialTitle) return;
    setSaving(true);
    const supabase = createClient();
    await supabase.from("course_categories").update({ title: title.trim() }).eq("id", categoryId);
    setSaving(false);
  }

  return (
    <input
      value={title}
      onChange={(e) => setTitle(e.target.value)}
      onBlur={handleBlur}
      disabled={saving}
      className="font-serif text-2xl bg-transparent border-b border-gold-light/60 focus:border-gold outline-none px-1"
    />
  );
}
