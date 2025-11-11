// src/components/FileUploader.tsx
import { useEffect, useMemo, useState } from "react";

/**
 * Uniwersalny uploader plików z podglądem:
 *  - obrazki: miniatury
 *  - .md / text/*: podgląd w <textarea>
 */
type FileUploaderProps = {
  label?: string;
  accept?: string;
  multiple?: boolean;
  files: File[];
  onFilesChange: (files: File[]) => void;
  className?: string;
};

type PreviewItem =
  | { kind: "image"; name: string; url: string }
  | { kind: "text"; name: string; text: string }
  | { kind: "other"; name: string; size: number };

export default function FileUploader({
  label,
  accept,
  multiple,
  files,
  onFilesChange,
  className = "",
}: FileUploaderProps) {
  const [previews, setPreviews] = useState<PreviewItem[]>([]);

  const isMarkdown = (f: File) =>
    /\.md$/i.test(f.name) ||
    f.type === "text/markdown" ||
    (f.type.startsWith("text/") && !/html/i.test(f.type));

  useEffect(() => {
    let on = true;

    async function buildPreviews() {
      // zwolnij poprzednie objectURL
      setPreviews((prev) => {
        prev.forEach((p) => {
          if (p.kind === "image") URL.revokeObjectURL(p.url);
        });
        return [];
      });

      const next: PreviewItem[] = [];

      for (const f of files) {
        if (f.type.startsWith("image/")) {
          const url = URL.createObjectURL(f);
          next.push({ kind: "image", name: f.name, url });
        } else if (isMarkdown(f)) {
          const text = await f.text();
          next.push({ kind: "text", name: f.name, text });
        } else {
          next.push({ kind: "other", name: f.name, size: f.size });
        }
      }
      if (on) setPreviews(next);
    }

    if (files.length) buildPreviews();
    else setPreviews([]);

    return () => {
      on = false;
      previews.forEach((p) => {
        if (p.kind === "image") URL.revokeObjectURL(p.url);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files]);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    onFilesChange(multiple ? selected : selected.slice(0, 1));
  };

  const hasOnlyText = useMemo(
    () => previews.length > 0 && previews.every((p) => p.kind === "text"),
    [previews]
  );

  return (
    <div className={className}>
      {label && <label className="block text-sm font-medium mb-1">{label}</label>}
      <input
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleInput}
        className="border p-2 rounded w-full"
      />

      {/* Podglądy */}
      {previews.length > 0 && (
        <div className="mt-3 space-y-3">
          {/* obrazy */}
          {previews.some((p) => p.kind === "image") && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {previews
                .filter((p): p is Extract<PreviewItem, { kind: "image" }> => p.kind === "image")
                .map((p, i) => (
                  <figure key={i} className="border rounded overflow-hidden bg-neutral-50">
                    <img
                      src={p.url}
                      alt={p.name}
                      className="w-full h-40 object-cover"
                      loading="lazy"
                    />
                    <figcaption className="text-[11px] px-2 py-1 text-neutral-600 truncate">
                      {p.name}
                    </figcaption>
                  </figure>
                ))}
            </div>
          )}

          {/* markdown / tekst */}
          {hasOnlyText &&
            previews.map((p, i) =>
              p.kind === "text" ? (
                <div key={i} className="space-y-1">
                  <div className="text-[11px] text-neutral-500">{p.name}</div>
                  <textarea
                    readOnly
                    value={p.text}
                    className="w-full min-h-[220px] border rounded p-3 text-sm bg-white"
                  />
                </div>
              ) : null
            )}

          {/* inne */}
          {previews.some((p) => p.kind === "other") && (
            <ul className="text-xs text-neutral-600 space-y-1">
              {previews
                .filter((p): p is Extract<PreviewItem, { kind: "other" }> => p.kind === "other")
                .map((p, i) => (
                  <li key={i} className="border rounded p-2 bg-neutral-50">
                    {p.name} · {(p.size / 1024).toFixed(1)} KB
                  </li>
                ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
