"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  DESKTOP_CANVAS,
  MOBILE_CANVAS,
  COVER_HEIGHT,
  FONT_OPTIONS,
  FONT_STACKS,
  DEFAULT_THEME,
  DEFAULT_BIO_STYLE,
  DEFAULT_TEXT_STYLE,
  normalizeDevicePosition,
  type Device,
  type DevicePosition,
  type Position,
  type PanelBlock,
  type Theme,
  type BioStyle,
} from "@/lib/panelLayout";

type Product = {
  id: string;
  title: string;
  price_cents: number;
  currency: string;
  cover_image_url: string | null;
};

type Creator = {
  id: string;
  bio: string | null;
  avatar_url: string | null;
  avatar_size_mobile: number;
  avatar_size_desktop: number;
  avatar_position: DevicePosition | Position;
  bio_position: DevicePosition | Position;
  bio_style: BioStyle | null;
  theme: Theme | null;
  cover_image_url: string | null;
  cover_offset_y: number;
  featured_product_id: string | null;
};

function formatPrice(p: { price_cents: number; currency: string }) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: p.currency,
    maximumFractionDigits: 0,
  }).format(p.price_cents / 100);
}

// Manija de selección tipo Photoshop/Paint: 4 esquinas arrastrables
// que agrandan/achican el elemento desde su centro.
function ResizeHandles({
  visible,
  onResizeStart,
}: {
  visible: boolean;
  onResizeStart: (e: React.PointerEvent) => void;
}) {
  if (!visible) return null;
  const corners: Array<[string, string]> = [
    ["-top-1.5 -left-1.5", "nwse-resize"],
    ["-top-1.5 -right-1.5", "nesw-resize"],
    ["-bottom-1.5 -left-1.5", "nesw-resize"],
    ["-bottom-1.5 -right-1.5", "nwse-resize"],
  ];
  return (
    <div className="absolute inset-0 border-2 border-dashed border-gold pointer-events-none">
      {corners.map(([pos, cursor]) => (
        <div
          key={pos}
          onPointerDown={onResizeStart}
          className={`absolute ${pos} h-3.5 w-3.5 bg-white border-2 border-gold rounded-sm pointer-events-auto`}
          style={{ cursor }}
        />
      ))}
    </div>
  );
}

export function PanelEditor({
  creator,
  products,
  initialBlocks,
}: {
  creator: Creator;
  products: Product[];
  initialBlocks: PanelBlock[];
}) {
  const supabase = createClient();
  const canvasRef = useRef<HTMLDivElement>(null);

  const [device, setDevice] = useState<Device>("mobile");
  const [selected, setSelected] = useState<string | null>(null);
  const [avatarPos, setAvatarPos] = useState<DevicePosition>(
    normalizeDevicePosition(creator.avatar_position, { mobile: { x: 50, y: 18 }, desktop: { x: 50, y: 50 } }),
  );
  const [avatarSizeMobile, setAvatarSizeMobile] = useState(creator.avatar_size_mobile ?? 128);
  const [avatarSizeDesktop, setAvatarSizeDesktop] = useState(creator.avatar_size_desktop ?? 220);
  const [bioPos, setBioPos] = useState<DevicePosition>(
    normalizeDevicePosition(creator.bio_position, { mobile: { x: 50, y: 40 }, desktop: { x: 75, y: 50 } }),
  );
  const [bioStyle, setBioStyle] = useState<BioStyle>(creator.bio_style ?? DEFAULT_BIO_STYLE);
  const [theme, setTheme] = useState<Theme>(creator.theme ?? DEFAULT_THEME);
  const [coverUrl, setCoverUrl] = useState(creator.cover_image_url);
  const [coverOffsetY, setCoverOffsetY] = useState(creator.cover_offset_y ?? 50);
  const [missingMigration, setMissingMigration] = useState(false);
  const [featuredProductId, setFeaturedProductId] = useState(creator.featured_product_id ?? "");
  const [productToAdd, setProductToAdd] = useState("");
  const [blocks, setBlocks] = useState<PanelBlock[]>(initialBlocks);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const canvas = device === "mobile" ? MOBILE_CANVAS : DESKTOP_CANVAS;
  const avatarSize = device === "mobile" ? avatarSizeMobile : avatarSizeDesktop;
  const setAvatarSize = device === "mobile" ? setAvatarSizeMobile : setAvatarSizeDesktop;
  const visibleBlocks = blocks.filter((b) => b.device === device).sort((a, b) => a.z_index - b.z_index);

  function flash(msg: string) {
    setStatus(msg);
    setTimeout(() => setStatus(null), 1800);
  }

  function reportError(err: unknown, fallback: string) {
    const message = err instanceof Error ? err.message : fallback;
    console.error(message);
    if (/column .* does not exist/i.test(message)) {
      setMissingMigration(true);
    } else {
      alert(message);
    }
  }

  function clientToPercent(clientX: number, clientY: number) {
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.min(100, Math.max(0, ((clientY - rect.top) / rect.height) * 100));
    return { x, y };
  }

  function startDrag(e: React.PointerEvent, id: string, onMove: (pos: Position) => void) {
    e.preventDefault();
    e.stopPropagation();
    setSelected(id);
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);

    function handleMove(ev: PointerEvent) {
      onMove(clientToPercent(ev.clientX, ev.clientY));
    }
    function handleUp() {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      setDirty(true);
    }
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  }

  function startCoverDrag(e: React.PointerEvent) {
    e.preventDefault();
    const startY = e.clientY;
    const startOffset = coverOffsetY;
    function move(ev: PointerEvent) {
      const deltaPercent = ((ev.clientY - startY) / 160) * 100;
      setCoverOffsetY(Math.min(100, Math.max(0, startOffset + deltaPercent)));
    }
    function up() {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      setDirty(true);
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  function startAvatarResize(e: React.PointerEvent) {
    e.stopPropagation();
    e.preventDefault();
    const startSize = avatarSize;
    const startX = e.clientX;
    function move(ev: PointerEvent) {
      setAvatarSize(Math.max(60, Math.min(420, startSize + (ev.clientX - startX) * 2)));
    }
    function up() {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      setDirty(true);
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  function startBlockResize(e: React.PointerEvent, block: PanelBlock) {
    e.stopPropagation();
    e.preventDefault();
    const rect = canvasRef.current!.getBoundingClientRect();
    const startW = block.width;
    const startH = block.height;
    const startX = e.clientX;
    const startY = e.clientY;
    function move(ev: PointerEvent) {
      const dw = ((ev.clientX - startX) / rect.width) * 100 * 2;
      const dh = ((ev.clientY - startY) / rect.height) * 100 * 2;
      updateBlock(block.id, {
        width: Math.max(8, Math.min(98, startW + dw)),
        height: Math.max(8, Math.min(98, startH + dh)),
      });
    }
    function up() {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      setDirty(true);
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  function updateBlock(id: string, patch: Partial<PanelBlock>) {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  }

  function reorderBlock(id: string, direction: "front" | "back") {
    setBlocks((prev) => {
      const zIndexes = prev.map((b) => b.z_index);
      const nextZ = direction === "front" ? Math.max(0, ...zIndexes) + 1 : Math.min(0, ...zIndexes) - 1;
      return prev.map((b) => (b.id === id ? { ...b, z_index: nextZ } : b));
    });
    setDirty(true);
  }

  async function handleUploadCover(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      const path = `${creator.id}/cover-${crypto.randomUUID()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from("covers").upload(path, file);
      if (uploadError) throw uploadError;
      const url = supabase.storage.from("covers").getPublicUrl(path).data.publicUrl;
      await supabase.from("creators").update({ cover_image_url: url }).eq("id", creator.id);
      setCoverUrl(url);
      flash("Portada actualizada");
    } catch (err) {
      reportError(err, "Error al subir la portada");
    } finally {
      setUploading(false);
    }
  }

  async function handleAddMediaBlock(file: File | undefined, type: "image" | "video") {
    if (!file) return;
    setUploading(true);
    try {
      const path = `${creator.id}/blocks/${crypto.randomUUID()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from("covers").upload(path, file);
      if (uploadError) throw uploadError;
      const mediaUrl = supabase.storage.from("covers").getPublicUrl(path).data.publicUrl;
      const maxZ = Math.max(0, ...blocks.map((b) => b.z_index));

      const { data, error: insertError } = await supabase
        .from("panel_blocks")
        .insert({
          creator_id: creator.id,
          block_type: type,
          media_url: mediaUrl,
          x: 50,
          y: 50,
          width: 40,
          height: 20,
          z_index: maxZ + 1,
          device,
        })
        .select()
        .single();
      if (insertError) throw insertError;

      setBlocks((prev) => [...prev, data as PanelBlock]);
      flash("Bloque agregado");
    } catch (err) {
      reportError(err, "Error al subir");
    } finally {
      setUploading(false);
    }
  }

  async function handleAddTextBlock() {
    const maxZ = Math.max(0, ...blocks.map((b) => b.z_index));
    const { data, error } = await supabase
      .from("panel_blocks")
      .insert({
        creator_id: creator.id,
        block_type: "text",
        text_content: "Escribe aquí",
        text_style: DEFAULT_TEXT_STYLE,
        x: 50,
        y: 50,
        width: 40,
        height: 12,
        z_index: maxZ + 1,
        device,
      })
      .select()
      .single();
    if (error) {
      reportError(error, "No se pudo agregar el texto");
      return;
    }
    setBlocks((prev) => [...prev, data as PanelBlock]);
    setSelected(data.id);
    flash("Texto agregado");
  }

  async function handleAddProductBlock() {
    if (!productToAdd) return;
    const product = products.find((p) => p.id === productToAdd);
    if (!product) return;
    const maxZ = Math.max(0, ...blocks.map((b) => b.z_index));
    const { data, error } = await supabase
      .from("panel_blocks")
      .insert({
        creator_id: creator.id,
        block_type: "product",
        product_id: product.id,
        x: 50,
        y: 50,
        width: 35,
        height: 22,
        z_index: maxZ + 1,
        device,
      })
      .select()
      .single();
    if (error) {
      reportError(error, "No se pudo agregar el producto");
      return;
    }
    setBlocks((prev) => [...prev, data as PanelBlock]);
    setSelected(data.id);
    setProductToAdd("");
    flash("Producto agregado al lienzo");
  }

  function handleEditText(block: PanelBlock) {
    const value = prompt("Texto:", block.text_content ?? "");
    if (value === null) return;
    updateBlock(block.id, { text_content: value });
    setDirty(true);
  }

  async function handleDeleteBlock(id: string) {
    if (!confirm("¿Borrar este bloque?")) return;
    await supabase.from("panel_blocks").delete().eq("id", id);
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    if (selected === id) setSelected(null);
    flash("Borrado");
  }

  async function handleSaveAll() {
    setSaving(true);
    try {
      const { error: creatorError } = await supabase
        .from("creators")
        .update({
          avatar_position: avatarPos,
          avatar_size_mobile: avatarSizeMobile,
          avatar_size_desktop: avatarSizeDesktop,
          bio_position: bioPos,
          bio_style: bioStyle,
          theme,
          cover_offset_y: coverOffsetY,
          featured_product_id: featuredProductId || null,
        })
        .eq("id", creator.id);
      if (creatorError) throw creatorError;

      await Promise.all(
        blocks.map((b) =>
          supabase
            .from("panel_blocks")
            .update({
              x: b.x,
              y: b.y,
              width: b.width,
              height: b.height,
              z_index: b.z_index,
              text_content: b.text_content,
              text_style: b.text_style,
            })
            .eq("id", b.id),
        ),
      );

      setDirty(false);
      flash("¡Guardado! Tu configuración se mantendrá.");
    } catch (err) {
      reportError(err, "No se pudo guardar, intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  const selectedBlock = blocks.find((b) => b.id === selected);

  return (
    <div className="w-full max-w-2xl flex flex-col items-center gap-4 pb-24">
      {missingMigration && (
        <div className="w-full rounded-xl bg-red-50 border border-red-300 text-red-700 text-sm p-4">
          Falta correr una migración SQL en Supabase (panel_customization_v2.sql y/o
          panel_customization_v3.sql). Por eso esta acción no se pudo guardar. Pégalas en
          Supabase → SQL Editor → Run, en ese orden, y recarga esta página.
        </div>
      )}
      <p className="text-sm text-foreground/60 text-center">
        Arrastra tu portada, tu foto, tu descripción y tus bloques. Toca un elemento para
        seleccionarlo y agrandarlo desde sus esquinas, como en Photoshop.
      </p>

      <div className="flex rounded-full border border-gold-light/60 overflow-hidden">
        <button
          onClick={() => setDevice("mobile")}
          className={`px-5 py-2 text-sm ${device === "mobile" ? "bg-gold text-white" : "text-foreground/70"}`}
        >
          📱 Teléfono
        </button>
        <button
          onClick={() => setDevice("desktop")}
          className={`px-5 py-2 text-sm ${device === "desktop" ? "bg-gold text-white" : "text-foreground/70"}`}
        >
          🖥️ PC / TV
        </button>
      </div>

      <div className="w-full overflow-x-auto">
        <div
          ref={canvasRef}
          onPointerDown={() => setSelected(null)}
          className="relative mx-auto rounded-2xl border border-gold-light/60 overflow-hidden touch-none select-none"
          style={{
            width: canvas.width,
            height: canvas.height,
            maxWidth: device === "mobile" ? canvas.width : "none",
            backgroundColor: theme.bgColor,
            fontFamily: FONT_STACKS[theme.fontFamily],
          }}
        >
          {/* Portada */}
          <div
            className="absolute top-0 left-0 right-0 bg-gold-light/40 overflow-hidden cursor-ns-resize"
            style={{ height: COVER_HEIGHT[device] }}
            onPointerDown={(e) => {
              e.stopPropagation();
              startCoverDrag(e);
            }}
          >
            {coverUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={coverUrl}
                alt=""
                className="h-full w-full object-cover pointer-events-none"
                style={{ objectPosition: `center ${coverOffsetY}%` }}
              />
            )}
            <label className="absolute bottom-2 right-2 cursor-pointer rounded-full bg-white/90 px-3 py-1 text-xs shadow">
              {uploading ? "Subiendo..." : "Cambiar portada"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploading}
                onChange={(e) => handleUploadCover(e.target.files?.[0])}
              />
            </label>
          </div>

          {/* Avatar */}
          <div
            className="absolute rounded-full bg-gradient-to-br from-pink-light to-gold-light border-4 border-white shadow-inner cursor-grab active:cursor-grabbing overflow-visible"
            style={{
              left: `${avatarPos[device].x}%`,
              top: `${avatarPos[device].y}%`,
              width: avatarSize,
              height: avatarSize,
              transform: "translate(-50%, -50%)",
            }}
            onPointerDown={(e) =>
              startDrag(e, "avatar", (pos) => setAvatarPos((prev) => ({ ...prev, [device]: pos })))
            }
          >
            <div className="h-full w-full rounded-full overflow-hidden">
              {creator.avatar_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={creator.avatar_url} alt="" className="h-full w-full object-cover pointer-events-none" />
              )}
            </div>
            <ResizeHandles visible={selected === "avatar"} onResizeStart={startAvatarResize} />
          </div>

          {/* Bio */}
          <div
            className="absolute max-w-[70%] bg-white/90 rounded-xl px-3 py-2 cursor-grab active:cursor-grabbing shadow-sm"
            style={{
              left: `${bioPos[device].x}%`,
              top: `${bioPos[device].y}%`,
              transform: "translate(-50%, -50%)",
              color: theme.textColor,
              fontWeight: bioStyle.bold ? 700 : 400,
              fontStyle: bioStyle.italic ? "italic" : "normal",
              fontSize: bioStyle.fontSize,
            }}
            onPointerDown={(e) =>
              startDrag(e, "bio", (pos) => setBioPos((prev) => ({ ...prev, [device]: pos })))
            }
          >
            {creator.bio || "Tu descripción aparecerá aquí"}
          </div>

          {/* Bloques libres */}
          {visibleBlocks.map((block) => (
            <div
              key={block.id}
              className="absolute cursor-grab active:cursor-grabbing rounded-lg overflow-visible group"
              style={{
                left: `${block.x}%`,
                top: `${block.y}%`,
                width: `${block.width}%`,
                height: `${block.height}%`,
                transform: "translate(-50%, -50%)",
                zIndex: block.z_index,
              }}
              onPointerDown={(e) => startDrag(e, block.id, (pos) => updateBlock(block.id, pos))}
            >
              <div className="h-full w-full rounded-lg overflow-hidden border-2 border-white shadow-sm">
                {block.block_type === "image" && block.media_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={block.media_url} alt="" className="h-full w-full object-cover pointer-events-none" />
                )}
                {block.block_type === "video" && block.media_url && (
                  <video
                    src={block.media_url}
                    className="h-full w-full object-cover pointer-events-none"
                    muted
                    loop
                    playsInline
                    autoPlay
                    preload="auto"
                  />
                )}
                {block.block_type === "text" && (
                  <div
                    className="h-full w-full flex items-center justify-center text-center px-2 bg-white/60"
                    style={{
                      color: block.text_style?.color ?? "#2A2420",
                      fontWeight: block.text_style?.bold ? 700 : 400,
                      fontStyle: block.text_style?.italic ? "italic" : "normal",
                      fontSize: block.text_style?.fontSize ?? 16,
                    }}
                  >
                    {block.text_content}
                  </div>
                )}
                {block.block_type === "product" && (
                  <div className="h-full w-full bg-white flex flex-col overflow-hidden pointer-events-none">
                    {(() => {
                      const p = products.find((prod) => prod.id === block.product_id);
                      if (!p) return <span className="text-xs p-2">Producto eliminado</span>;
                      return (
                        <>
                          {p.cover_image_url && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.cover_image_url} alt="" className="w-full h-2/3 object-cover" />
                          )}
                          <div className="flex-1 flex flex-col justify-center px-2">
                            <p className="text-xs font-medium truncate">{p.title}</p>
                            <span className="text-xs text-gold">{formatPrice(p)}</span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>

              <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {block.block_type === "text" && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditText(block);
                    }}
                    className="h-6 w-6 rounded-full bg-white/90 text-xs"
                    title="Editar texto"
                  >
                    ✎
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    reorderBlock(block.id, "front");
                  }}
                  className="h-6 w-6 rounded-full bg-white/90 text-xs"
                  title="Traer al frente"
                >
                  ⬆
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    reorderBlock(block.id, "back");
                  }}
                  className="h-6 w-6 rounded-full bg-white/90 text-xs"
                  title="Enviar atrás"
                >
                  ⬇
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteBlock(block.id);
                  }}
                  className="h-6 w-6 rounded-full bg-red-600 text-white text-xs"
                >
                  ✕
                </button>
              </div>

              <ResizeHandles
                visible={selected === block.id}
                onResizeStart={(e) => startBlockResize(e, block)}
              />
            </div>
          ))}

          {status && (
            <span className="absolute top-2 left-1/2 -translate-x-1/2 text-xs bg-foreground text-white px-3 py-1 rounded-full z-50">
              {status}
            </span>
          )}
        </div>
      </div>

      {selectedBlock?.block_type === "text" && (
        <div className="w-full flex items-center gap-2 bg-white rounded-2xl border border-gold-light/60 p-4">
          <span className="text-xs text-foreground/60">Estilo del texto seleccionado:</span>
          <button
            onClick={() => {
              updateBlock(selectedBlock.id, {
                text_style: { ...(selectedBlock.text_style ?? DEFAULT_TEXT_STYLE), bold: !selectedBlock.text_style?.bold },
              });
              setDirty(true);
            }}
            className={`h-8 w-8 rounded-lg border font-bold ${selectedBlock.text_style?.bold ? "bg-gold text-white border-gold" : "border-gold-light/60"}`}
          >
            B
          </button>
          <button
            onClick={() => {
              updateBlock(selectedBlock.id, {
                text_style: { ...(selectedBlock.text_style ?? DEFAULT_TEXT_STYLE), italic: !selectedBlock.text_style?.italic },
              });
              setDirty(true);
            }}
            className={`h-8 w-8 rounded-lg border italic ${selectedBlock.text_style?.italic ? "bg-gold text-white border-gold" : "border-gold-light/60"}`}
          >
            I
          </button>
          <input
            type="range"
            min={11}
            max={48}
            value={selectedBlock.text_style?.fontSize ?? 16}
            onChange={(e) => {
              updateBlock(selectedBlock.id, {
                text_style: { ...(selectedBlock.text_style ?? DEFAULT_TEXT_STYLE), fontSize: Number(e.target.value) },
              });
              setDirty(true);
            }}
            className="flex-1"
          />
          <input
            type="color"
            value={selectedBlock.text_style?.color ?? "#2A2420"}
            onChange={(e) => {
              updateBlock(selectedBlock.id, {
                text_style: { ...(selectedBlock.text_style ?? DEFAULT_TEXT_STYLE), color: e.target.value },
              });
              setDirty(true);
            }}
            className="h-8 w-8 rounded"
          />
        </div>
      )}

      <div className="w-full flex flex-col gap-4 bg-white rounded-2xl border border-gold-light/60 p-5">
        <div>
          <label className="text-sm text-foreground/70 block mb-1">
            Curso/producto que se muestra primero en tu banner
          </label>
          <select
            className="w-full rounded-lg border border-gold-light/60 px-3 py-2 text-sm"
            value={featuredProductId}
            onChange={(e) => {
              setFeaturedProductId(e.target.value);
              setDirty(true);
            }}
          >
            <option value="">Sin preferencia (más reciente primero)</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-foreground/60 block mb-1">Fondo</label>
            <input
              type="color"
              value={theme.bgColor}
              onChange={(e) => {
                setTheme((t) => ({ ...t, bgColor: e.target.value }));
                setDirty(true);
              }}
              className="w-full h-9 rounded-lg border border-gold-light/60"
            />
          </div>
          <div>
            <label className="text-xs text-foreground/60 block mb-1">Texto</label>
            <input
              type="color"
              value={theme.textColor}
              onChange={(e) => {
                setTheme((t) => ({ ...t, textColor: e.target.value }));
                setDirty(true);
              }}
              className="w-full h-9 rounded-lg border border-gold-light/60"
            />
          </div>
          <div>
            <label className="text-xs text-foreground/60 block mb-1">Acento</label>
            <input
              type="color"
              value={theme.accentColor}
              onChange={(e) => {
                setTheme((t) => ({ ...t, accentColor: e.target.value }));
                setDirty(true);
              }}
              className="w-full h-9 rounded-lg border border-gold-light/60"
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-foreground/60 block mb-1">Tipografía</label>
          <select
            className="w-full rounded-lg border border-gold-light/60 px-3 py-2 text-sm"
            value={theme.fontFamily}
            onChange={(e) => {
              setTheme((t) => ({ ...t, fontFamily: e.target.value as Theme["fontFamily"] }));
              setDirty(true);
            }}
          >
            {FONT_OPTIONS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs text-foreground/60 block mb-1">Estilo de tu descripción</label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setBioStyle((s) => ({ ...s, bold: !s.bold }));
                setDirty(true);
              }}
              className={`h-8 w-8 rounded-lg border font-bold ${bioStyle.bold ? "bg-gold text-white border-gold" : "border-gold-light/60"}`}
            >
              B
            </button>
            <button
              onClick={() => {
                setBioStyle((s) => ({ ...s, italic: !s.italic }));
                setDirty(true);
              }}
              className={`h-8 w-8 rounded-lg border italic ${bioStyle.italic ? "bg-gold text-white border-gold" : "border-gold-light/60"}`}
            >
              I
            </button>
            <input
              type="range"
              min={11}
              max={28}
              value={bioStyle.fontSize}
              onChange={(e) => {
                setBioStyle((s) => ({ ...s, fontSize: Number(e.target.value) }));
                setDirty(true);
              }}
              className="flex-1"
            />
            <span className="text-xs text-foreground/60 w-8">{bioStyle.fontSize}px</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 pt-2 border-t border-gold-light/40">
          <label className="cursor-pointer rounded-full bg-gold px-4 py-2 text-white text-xs hover:bg-gold-light hover:text-foreground transition-colors">
            {uploading ? "Subiendo..." : "+ Agregar imagen"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploading}
              onChange={(e) => handleAddMediaBlock(e.target.files?.[0], "image")}
            />
          </label>
          <label className="cursor-pointer rounded-full border border-gold px-4 py-2 text-gold text-xs hover:bg-gold hover:text-white transition-colors">
            {uploading ? "Subiendo..." : "+ Agregar video"}
            <input
              type="file"
              accept="video/*"
              className="hidden"
              disabled={uploading}
              onChange={(e) => handleAddMediaBlock(e.target.files?.[0], "video")}
            />
          </label>
          <button
            onClick={handleAddTextBlock}
            className="rounded-full border border-gold px-4 py-2 text-gold text-xs hover:bg-gold hover:text-white transition-colors"
          >
            + Agregar texto
          </button>
        </div>

        {products.length > 0 && (
          <div className="flex gap-2 items-center pt-2 border-t border-gold-light/40">
            <select
              className="flex-1 rounded-lg border border-gold-light/60 px-3 py-2 text-sm"
              value={productToAdd}
              onChange={(e) => setProductToAdd(e.target.value)}
            >
              <option value="">Elige un producto para agregar al lienzo</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
            <button
              onClick={handleAddProductBlock}
              disabled={!productToAdd}
              className="rounded-full bg-gold px-4 py-2 text-white text-xs hover:bg-gold-light hover:text-foreground transition-colors disabled:opacity-40"
            >
              + Agregar
            </button>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gold-light/60 p-4 flex items-center justify-center gap-4 z-50">
        <span className="text-xs text-foreground/60">
          {dirty ? "Tienes cambios sin guardar" : "Todo guardado"}
        </span>
        <button
          onClick={handleSaveAll}
          disabled={saving || !dirty}
          className="rounded-full bg-gold px-8 py-2.5 text-white text-sm font-medium hover:bg-gold-light hover:text-foreground transition-colors disabled:opacity-40"
        >
          {saving ? "Guardando..." : "Guardar cambios"}
        </button>
      </div>
    </div>
  );
}
