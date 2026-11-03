// src/components/cursos/ModuleQA.tsx
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Question = {
  id: string;
  question: string;
  answer: string | null;
  created_at: string;
  asker_id: string;
};

// Sección de preguntas estilo comentarios, debajo de la descripción del
// módulo: cualquiera con acceso al módulo puede preguntar (misma regla
// de RLS que ya protege el video y el material de apoyo), y solo la
// dueña de la categoría puede responder.
export function ModuleQA({ moduleId }: { moduleId: string }) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [newQuestion, setNewQuestion] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [answerDrafts, setAnswerDrafts] = useState<Record<string, string>>({});
  const [answeringId, setAnsweringId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUserId(user?.id ?? null);

      const { data: rows } = await supabase
        .from("module_questions")
        .select("id, question, answer, created_at, asker_id")
        .eq("module_id", moduleId)
        .order("created_at", { ascending: false });
      setQuestions(rows ?? []);

      if (user) {
        const { data: moduleRow } = await supabase
          .from("category_modules")
          .select("course_categories(owner_id)")
          .eq("id", moduleId)
          .maybeSingle();
        const category = moduleRow
          ? Array.isArray(moduleRow.course_categories)
            ? moduleRow.course_categories[0]
            : moduleRow.course_categories
          : null;
        setIsOwner(category?.owner_id === user.id);
      }

      setLoading(false);
    }

    load();
  }, [moduleId]);

  async function handleAsk(e: React.FormEvent) {
    e.preventDefault();
    if (!newQuestion.trim() || !userId) return;
    setSubmitting(true);
    setError(null);

    const supabase = createClient();
    const { data, error: insertError } = await supabase
      .from("module_questions")
      .insert({ module_id: moduleId, asker_id: userId, question: newQuestion.trim() })
      .select("id, question, answer, created_at, asker_id")
      .single();

    setSubmitting(false);
    if (insertError) {
      setError("No se pudo enviar tu pregunta, intenta de nuevo.");
      return;
    }
    setQuestions((prev) => [data as Question, ...prev]);
    setNewQuestion("");
  }

  async function handleAnswer(questionId: string) {
    const answer = (answerDrafts[questionId] ?? "").trim();
    if (!answer) return;
    setAnsweringId(questionId);

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("module_questions")
      .update({ answer, answered_at: new Date().toISOString() })
      .eq("id", questionId);

    setAnsweringId(null);
    if (updateError) {
      setError("No se pudo guardar la respuesta, intenta de nuevo.");
      return;
    }
    setQuestions((prev) => prev.map((q) => (q.id === questionId ? { ...q, answer } : q)));
    setAnswerDrafts((prev) => ({ ...prev, [questionId]: "" }));
  }

  if (loading) return null;

  return (
    <div className="flex flex-col gap-3 bg-white border border-gold-light/50 rounded-xl p-4">
      <h2 className="font-serif text-lg">Preguntas</h2>

      {userId ? (
        <form onSubmit={handleAsk} className="flex flex-col gap-2">
          <textarea
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
            placeholder="Escribe tu pregunta sobre este módulo..."
            rows={2}
            className="rounded-lg border border-gold-light/60 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={submitting || !newQuestion.trim()}
            className="self-start rounded-full bg-gold px-5 py-1.5 text-white text-xs hover:bg-gold-light hover:text-foreground transition-colors disabled:opacity-50"
          >
            {submitting ? "Enviando..." : "Preguntar"}
          </button>
        </form>
      ) : (
        <p className="text-xs text-foreground/50">Inicia sesión para dejar una pregunta.</p>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}

      {questions.length === 0 ? (
        <p className="text-xs text-foreground/50">Todavía no hay preguntas sobre este módulo.</p>
      ) : (
        <div className="flex flex-col gap-3 mt-1">
          {questions.map((q) => (
            <div key={q.id} className="border-t border-gold-light/30 pt-3 flex flex-col gap-1.5">
              <p className="text-sm text-foreground">{q.question}</p>
              <p className="text-[11px] text-foreground/40">
                {new Date(q.created_at).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" })}
              </p>

              {q.answer ? (
                <div className="ml-3 pl-3 border-l-2 border-gold-light/60 flex flex-col gap-0.5">
                  <p className="text-xs text-gold font-medium">Respuesta</p>
                  <p className="text-sm text-foreground/80">{q.answer}</p>
                </div>
              ) : isOwner ? (
                <div className="ml-3 flex flex-col gap-1.5">
                  <textarea
                    value={answerDrafts[q.id] ?? ""}
                    onChange={(e) => setAnswerDrafts((prev) => ({ ...prev, [q.id]: e.target.value }))}
                    placeholder="Responder..."
                    rows={2}
                    className="rounded-lg border border-gold-light/60 px-3 py-1.5 text-sm"
                  />
                  <button
                    onClick={() => handleAnswer(q.id)}
                    disabled={answeringId === q.id || !(answerDrafts[q.id] ?? "").trim()}
                    className="self-start rounded-full border border-gold px-4 py-1 text-gold text-xs hover:bg-gold hover:text-white transition-colors disabled:opacity-50"
                  >
                    {answeringId === q.id ? "Guardando..." : "Responder"}
                  </button>
                </div>
              ) : (
                <p className="ml-3 text-xs text-foreground/40 italic">Pendiente de respuesta</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
