"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { translateAuthError } from "@/lib/authErrors";

export default function RecuperarPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/confirm?next=/actualizar-contrasena`,
    });

    setLoading(false);

    if (error) {
      setError(translateAuthError(error.message));
      return;
    }

    setDone(true);
  }

  if (done) {
    return (
      <div className="flex flex-1 items-center justify-center bg-beige-light px-6 py-24">
        <div className="max-w-md text-center flex flex-col gap-3">
          <h1 className="font-serif text-2xl">Revisa tu correo</h1>
          <p className="text-foreground/70">
            Si <strong>{email}</strong> tiene una cuenta con nosotras, te
            enviamos un enlace para crear una contraseña nueva.
          </p>
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
          Recuperar contraseña
        </h1>
        <p className="text-sm text-foreground/60 text-center">
          Escribe tu correo y te enviaremos un enlace para crear una
          contraseña nueva.
        </p>

        <label className="flex flex-col gap-1 text-sm">
          Correo electrónico
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-lg border border-gold-light/60 px-3 py-2 outline-none focus:border-gold"
          />
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="rounded-full bg-gold px-6 py-2.5 text-white font-medium hover:bg-gold-light hover:text-foreground transition-colors disabled:opacity-60"
        >
          {loading ? "Enviando..." : "Enviar enlace"}
        </button>

        <p className="text-sm text-center text-foreground/60">
          <Link href="/login" className="text-gold hover:underline">
            Volver a iniciar sesión
          </Link>
        </p>
      </form>
    </div>
  );
}
