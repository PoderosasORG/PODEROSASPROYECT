import type { CustomField } from "@puckeditor/core";
import { ColorFieldRender } from "@/lib/puck/ColorFieldRender";
import { ImageUploadFieldRender, type ImageValue } from "@/lib/puck/ImageUploadFieldRender";
import { ProductPickerRender } from "@/lib/puck/ProductPickerRender";

// Sin "use client": estas son funciones normales que construyen un
// objeto de configuración (se evalúan también desde Server Components,
// como /[slug] al armar <Render>). Los componentes de render en sí
// (que usan hooks y partes del editor interactivo, como FieldLabel)
// viven en sus propios archivos marcados cliente.

// Campo de color real (en vez de pedir el código hex a mano).
export function colorField(label: string): CustomField<string> {
  return {
    type: "custom",
    label,
    render: (props) => <ColorFieldRender {...props} label={label} />,
  };
}

// Campo de subida de imagen: sube al bucket público "covers" de Supabase
// Storage y guarda la URL pública resultante, en vez de pedir una URL a mano.
export function imageUploadField(label: string): CustomField<ImageValue> {
  return {
    type: "custom",
    label,
    render: (props) => <ImageUploadFieldRender {...props} label={label} />,
  };
}

// Selector de uno de los productos PUBLICADOS de la propia creadora
// (en vez de pegar el ID a mano), con vista previa real (portada/precio).
export function productPickerField(label: string): CustomField<string> {
  return {
    type: "custom",
    label,
    render: (props) => <ProductPickerRender {...props} label={label} />,
  };
}
