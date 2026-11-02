"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { translateAuthError } from "@/lib/authErrors";

export default function ActualizarContrasenaPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    setLoading(false);

    if (error) {
      setError(translateAuthError(error.message));
      return;
    }

    setDone(true);
    setTimeout(() => {
      router.push("/panel");
      router.refresh();
    }, 1500);
  }

  if (done) {
    return (
      <div className="flex flex-1 items-center justify-center bg-beige-light px-6 py-24">
        <div className="max-w-md text-center flex flex-col gap-3">
          <h1 className="font-serif text-2xl">Contraseña actualizada</h1>
          <p className="text-foreground/70">Te llevamos a tu panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-beige-light px-6 py-24">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm flex flex-col gap-4 bg-white p-8 rounded-3xl border border-gold-light/60"
      >
        <h1 className="font-serif text-2xl text-center">
          Crea una contraseña nueva
        </h1>

        <label className="flex flex-col gap-1 text-sm">
          Contraseña nueva
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-lg border border-gold-light/60 px-3 py-2 outline-none focus:border-gold"
          />
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="rounded-full bg-gold px-6 py-2.5 text-white font-medium hover:bg-gold-light hover:text-foreground transition-colors disabled:opacity-60"
        >
          {loading ? "Guardando..." : "Guardar contraseña"}
        </button>
      </form>
    </div>
  );
}
