"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { FileUploadField } from "@/components/FileUploadField";

type ContentType = "ebook" | "plantilla" | "fisico" | "curso" | "otro";

type Step =
  | "contentType"
  | "files"
  | "name"
  | "freeForMembers"
  | "price"
  | "coupon"
  | "couponCode"
  | "cover"
  | "description"
  | "lessons"
  | "uploading"
  | "done";

const CONTENT_LABELS: Record<ContentType, string> = {
  ebook: "ebook",
  plantilla: "plantilla",
  fisico: "producto físico",
  curso: "curso virtual",
  otro: "contenido",
};

const CONTENT_TYPE_TO_PRODUCT_TYPE: Record<ContentType, string> = {
  ebook: "digital",
  plantilla: "digital",
  fisico: "physical",
  curso: "course",
  otro: "digital",
};

function needsFilesStep(contentType: ContentType | null) {
  return contentType === "ebook" || contentType === "plantilla" || contentType === "otro";
}

function formatPriceInput(digits: string) {
  if (!digits) return "";
  return new Intl.NumberFormat("es-CO").format(parseInt(digits, 10));
}

export function UploadWizard({
  creatorId,
  creatorName,
}: {
  creatorId: string;
  creatorName: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("contentType");
  const [error, setError] = useState<string | null>(null);

  const [contentType, setContentType] = useState<ContentType | null>(null);
  const [contentTypeOther, setContentTypeOther] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [name, setName] = useState("");
  const [freeForMembers, setFreeForMembers] = useState<boolean | null>(null);
  const [priceDigits, setPriceDigits] = useState("");
  const [couponEnabled, setCouponEnabled] = useState<boolean | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const [lessonFiles, setLessonFiles] = useState<File[]>([]);

  const contentLabel = contentType
    ? contentType === "otro" && contentTypeOther
      ? contentTypeOther
      : CONTENT_LABELS[contentType]
    : "contenido";

  function goNext() {
    setError(null);
    switch (step) {
      case "contentType":
        setStep(needsFilesStep(contentType) ? "files" : "name");
        return;
      case "files":
        setStep("name");
        return;
      case "name":
        if (!name.trim()) {
          setError("Ponle un nombre antes de continuar.");
          return;
        }
        setStep("freeForMembers");
        return;
      case "freeForMembers":
        if (freeForMembers === null) {
          setError("Elige una opción.");
          return;
        }
        setStep("price");
        return;
      case "price":
        if (!priceDigits) {
          setError("Escribe un valor.");
          return;
        }
        setStep("coupon");
        return;
      case "coupon":
        if (couponEnabled === null) {
          setError("Elige una opción.");
          return;
        }
        setStep(couponEnabled ? "couponCode" : "cover");
        return;
      case "couponCode":
        if (!couponCode.trim()) {
          setError("Escribe el código del cupón, o vuelve atrás y elige 'No'.");
          return;
        }
        setStep("cover");
        return;
      case "cover":
        setStep("description");
        return;
      case "description":
        if (!description.trim()) {
          setError("Escribe una descripción corta.");
          return;
        }
        setStep(contentType === "curso" ? "lessons" : "uploading");
        if (contentType !== "curso") void handleSubmit();
        return;
      case "lessons":
        setStep("uploading");
        void handleSubmit();
        return;
    }
  }

  function goBack() {
    setError(null);
    switch (step) {
      case "files":
        setStep("contentType");
        return;
      case "name":
        setStep(needsFilesStep(contentType) ? "files" : "contentType");
        return;
      case "freeForMembers":
        setStep("name");
        return;
      case "price":
        setStep("freeForMembers");
        return;
      case "coupon":
        setStep("price");
        return;
      case "couponCode":
        setStep("coupon");
        return;
      case "cover":
        setStep(couponEnabled ? "couponCode" : "coupon");
        return;
      case "description":
        setStep("cover");
        return;
      case "lessons":
        setStep("description");
        return;
    }
  }

  async function handleSubmit() {
    try {
      const supabase = createClient();
      const productType = contentType ? CONTENT_TYPE_TO_PRODUCT_TYPE[contentType] : "digital";
      const priceCents = parseInt(priceDigits || "0", 10) * 100;
      const productId = crypto.randomUUID();

      let coverImageUrl: string | null = null;
      if (coverFile) {
        const coverPath = `${creatorId}/${productId}/cover-${coverFile.name}`;
        const { error: coverError } = await supabase.storage
          .from("covers")
          .upload(coverPath, coverFile);
        if (coverError) throw coverError;
        coverImageUrl = supabase.storage.from("covers").getPublicUrl(coverPath).data.publicUrl;
      }

      const { error: insertError } = await supabase.from("products").insert({
        id: productId,
        creator_id: creatorId,
        type: productType,
        content_type: contentType,
        content_type_other: contentType === "otro" ? contentTypeOther : null,
        title: name,
        description,
        price_cents: priceCents,
        currency: "COP",
        is_free_for_members: freeForMembers ?? false,
        coupon_code: couponEnabled ? couponCode.trim() : null,
        cover_image_url: coverImageUrl,
        is_published: false,
      });
      if (insertError) throw insertError;

      if (needsFilesStep(contentType) && files.length > 0) {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const filePath = `${creatorId}/${productId}/${file.name}`;
          const { error: uploadError } = await supabase.storage
            .from("product-files")
            .upload(filePath, file);
          if (uploadError) throw uploadError;

          const { error: fileRowError } = await supabase.from("product_files").insert({
            product_id: productId,
            file_path: filePath,
            file_name: file.name,
            order_index: i,
          });
          if (fileRowError) throw fileRowError;
        }
      }

      if (contentType === "curso" && lessonFiles.length > 0) {
        for (let i = 0; i < lessonFiles.length; i++) {
          const file = lessonFiles[i];
          const filePath = `${creatorId}/${productId}/lesson-${file.name}`;
          const { error: uploadError } = await supabase.storage
            .from("product-files")
            .upload(filePath, file);
          if (uploadError) throw uploadError;

          const { error: lessonError } = await supabase.from("course_lessons").insert({
            product_id: productId,
            title: file.name,
            video_url: filePath,
            order_index: i,
          });
          if (lessonError) throw lessonError;
        }
      }

      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Algo salió mal, intenta de nuevo.");
      setStep(contentType === "curso" ? "lessons" : "description");
    }
  }

  const canGoBack = !["contentType", "uploading", "done"].includes(step);

  return (
    <div className="w-full max-w-lg bg-white rounded-3xl border border-gold-light/60 p-8 flex flex-col gap-6 min-h-[360px] justify-center">
      <div key={step} className="step-fade flex flex-col gap-5">
        {step === "contentType" && (
          <>
            <h2 className="font-serif text-xl text-center">
              Hola {creatorName} ¿Qué quieres subir hoy? Tus poderosas están
              ansiosas por verlo.
            </h2>
            <select
              className="rounded-lg border border-gold-light/60 px-3 py-2"
              value={contentType ?? ""}
              onChange={(e) => {
                setContentType(e.target.value as ContentType);
              }}
            >
              <option value="" disabled>
                Elige un tipo de contenido
              </option>
              <option value="ebook">EBOOK (Libro virtual)</option>
              <option value="plantilla">PLANTILLAS (Guía de texto PDF)</option>
              <option value="fisico">PRODUCTO FÍSICO (tus productos)</option>
              <option value="curso">CURSO VIRTUAL (imágenes o videos con capítulos)</option>
              <option value="otro">OTRO (especificar)</option>
            </select>
            {contentType === "otro" && (
              <input
                type="text"
                placeholder="¿Qué tipo de contenido es?"
                value={contentTypeOther}
                onChange={(e) => setContentTypeOther(e.target.value)}
                className="rounded-lg border border-gold-light/60 px-3 py-2"
              />
            )}
          </>
        )}

        {step === "files" && (
          <>
            <h2 className="font-serif text-xl text-center">
              {creatorName}, tu {contentLabel} ¡tendrá mucho éxito! Carga aquí
              el archivo.
            </h2>
            <p className="text-sm text-center text-foreground/60">
              Sube cuantos archivos desees.
            </p>
            <FileUploadField
              label="Subir archivo"
              multiple
              files={files}
              onChange={setFiles}
            />
          </>
        )}

        {step === "name" && (
          <>
            <h2 className="font-serif text-xl text-center">
              Nombre para tu {contentLabel}
            </h2>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-lg border border-gold-light/60 px-3 py-2"
              placeholder="Ej. Guía de claridad emocional"
            />
          </>
        )}

        {step === "freeForMembers" && (
          <>
            <h2 className="font-serif text-xl text-center">
              ¿Incluirlo gratis para quienes tienen la membresía?
            </h2>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => setFreeForMembers(true)}
                className={`rounded-full px-6 py-2 border ${freeForMembers === true ? "bg-gold text-white border-gold" : "border-gold-light/60"}`}
              >
                Sí
              </button>
              <button
                onClick={() => setFreeForMembers(false)}
                className={`rounded-full px-6 py-2 border ${freeForMembers === false ? "bg-gold text-white border-gold" : "border-gold-light/60"}`}
              >
                No
              </button>
            </div>
          </>
        )}

        {step === "price" && (
          <>
            <h2 className="font-serif text-xl text-center">Fija un valor</h2>
            <div className="flex items-center gap-2 justify-center">
              <span className="text-foreground/60">$</span>
              <input
                type="text"
                inputMode="numeric"
                value={formatPriceInput(priceDigits)}
                onChange={(e) =>
                  setPriceDigits(e.target.value.replace(/\D/g, ""))
                }
                className="rounded-lg border border-gold-light/60 px-3 py-2 text-center w-40"
                placeholder="0"
              />
              <span className="text-foreground/60">COP</span>
            </div>
          </>
        )}

        {step === "coupon" && (
          <>
            <h2 className="font-serif text-xl text-center">
              ¿Agregamos cupón de descuento?
            </h2>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => setCouponEnabled(true)}
                className={`rounded-full px-6 py-2 border ${couponEnabled === true ? "bg-gold text-white border-gold" : "border-gold-light/60"}`}
              >
                Sí
              </button>
              <button
                onClick={() => setCouponEnabled(false)}
                className={`rounded-full px-6 py-2 border ${couponEnabled === false ? "bg-gold text-white border-gold" : "border-gold-light/60"}`}
              >
                No
              </button>
            </div>
          </>
        )}

        {step === "couponCode" && (
          <>
            <h2 className="font-serif text-xl text-center">
              ¿Cuál será el cupón?
            </h2>
            <input
              type="text"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              className="rounded-lg border border-gold-light/60 px-3 py-2 text-center"
              placeholder="Ej. PODEROSA20"
            />
          </>
        )}

        {step === "cover" && (
          <>
            <h2 className="font-serif text-xl text-center">Imagen de portada</h2>
            <FileUploadField
              label="Subir imagen"
              accept="image/*"
              files={coverFile ? [coverFile] : []}
              onChange={(files) => setCoverFile(files[0] ?? null)}
            />
          </>
        )}

        {step === "description" && (
          <>
            <h2 className="font-serif text-xl text-center">
              Descripción de tu {contentLabel}
            </h2>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="rounded-lg border border-gold-light/60 px-3 py-2"
              placeholder="Cuéntales de qué se trata, en pocas líneas."
            />
          </>
        )}

        {step === "lessons" && (
          <>
            <h2 className="font-serif text-xl text-center">
              Sube los capítulos de tu curso
            </h2>
            <p className="text-sm text-center text-foreground/60">
              Sube cuantos videos o imágenes desees, uno por capítulo.
            </p>
            <FileUploadField
              label="Subir capítulos"
              multiple
              files={lessonFiles}
              onChange={setLessonFiles}
            />
          </>
        )}

        {step === "uploading" && (
          <p className="text-center text-foreground/60">Subiendo tu contenido...</p>
        )}

        {step === "done" && (
          <>
            <h2 className="font-serif text-xl text-center">
              ¡Listo {creatorName}! Tu {contentLabel} se subió satisfactoriamente.
            </h2>
            <p className="text-sm text-center text-foreground/60">
              Quedó guardado como borrador. Publícalo cuando quieras que se
              vea en tu página.
            </p>
            <div className="flex justify-center">
              <button
                onClick={() => router.push("/panel/contenido")}
                className="rounded-full bg-gold px-6 py-2.5 text-white hover:bg-gold-light hover:text-foreground transition-colors"
              >
                Ver mi contenido
              </button>
            </div>
          </>
        )}

        {error && <p className="text-sm text-red-600 text-center">{error}</p>}
      </div>

      {step !== "uploading" && step !== "done" && (
        <div className="flex justify-between pt-2">
          <button
            onClick={goBack}
            disabled={!canGoBack}
            className="text-sm text-gold hover:underline disabled:opacity-0"
          >
            ← Volver al paso anterior
          </button>
          <button
            onClick={goNext}
            disabled={step === "contentType" && !contentType}
            className="rounded-full bg-gold px-6 py-2 text-white text-sm hover:bg-gold-light hover:text-foreground transition-colors disabled:opacity-50"
          >
            Continuar
          </button>
        </div>
      )}
    </div>
  );
}
