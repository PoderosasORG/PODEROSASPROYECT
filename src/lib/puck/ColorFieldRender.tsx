"use client";

import { FieldLabel, type CustomFieldRender } from "@puckeditor/core";

export function ColorFieldRender({
  value,
  onChange,
  id,
  label,
}: Parameters<CustomFieldRender<string>>[0] & { label: string }) {
  return (
    <FieldLabel label={label} el="label">
      <input
        id={id}
        type="color"
        value={value || "#000000"}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded border cursor-pointer"
      />
    </FieldLabel>
  );
}
