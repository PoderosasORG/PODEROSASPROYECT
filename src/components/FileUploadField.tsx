"use client";

type FileUploadFieldProps = {
  label: string;
  multiple?: boolean;
  accept?: string;
  files: File[];
  onChange: (files: File[]) => void;
};

export function FileUploadField({
  label,
  multiple,
  accept,
  files,
  onChange,
}: FileUploadFieldProps) {
  return (
    <div className="flex flex-col items-center gap-3">
      <label className="cursor-pointer rounded-full bg-gold px-6 py-2.5 text-white text-sm font-medium hover:bg-gold-light hover:text-foreground transition-colors">
        {label}
        <input
          type="file"
          multiple={multiple}
          accept={accept}
          className="hidden"
          onChange={(e) => onChange(Array.from(e.target.files ?? []))}
        />
      </label>
      {files.length > 0 && (
        <ul className="text-sm text-foreground/70 flex flex-col gap-1 items-center">
          {files.map((f) => (
            <li key={f.name}>📄 {f.name}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
