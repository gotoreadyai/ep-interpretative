/* eslint-disable react-hooks/exhaustive-deps */
// src/pages/AddInterpretacjaPage.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../auth/useAuth";
import { listMotywy } from "../services/motywy";
import type { MotywDef, MotywId, Rozdzial } from "../types";
import FileUploader from "../components/FileUploader";

// --- helpers ---
const DIACRITIC_MAP: Record<string, string> = {
  ą: "a",
  ć: "c",
  ę: "e",
  ł: "l",
  ń: "n",
  ó: "o",
  ś: "s",
  ż: "z",
  ź: "z",
};
const slug = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[ąćęłńóśżź]/g, (c) => DIACRITIC_MAP[c] ?? c)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

async function uploadToImgBB(file: File): Promise<{ id: string; url: string }> {
  const apiKey = import.meta.env.VITE_IMGBB_API_KEY as string;
  if (!apiKey) throw new Error("Brak VITE_IMGBB_API_KEY w env");
  const form = new FormData();
  form.append("image", file);
  const res = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
    method: "POST",
    body: form,
  });
  const data = await res.json();
  if (!data?.success) throw new Error("Nie udało się wysłać pliku do imgbb");
  return { id: data.data.id, url: data.data.url };
}

type UIChapter = {
  tytul: string;
  czas: string;
  file?: File | null; // opcjonalny lokalny plik .md (do podglądu)
  imageFiles?: File[]; // obrazki rozdziału
  urls?: { md?: string };
};

type MotywPick = {
  id: MotywId;
  pytanie: string;
  fragmenty: string[];
};

export default function AddInterpretacjaPage() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);

  // --- meta źródła
  const [form, setForm] = useState({
    tytul: "",
    podtytul: "",
    lektura: "",
    autor: "",
    wspolczesnyAutor: "",
    dataPublikacji: "",
    epokiCSV: "pozytywizm,współczesność",
    tagsCSV: "warszawa,miłość,klasa,social-media",
    czasCzytania: "~25 min",
  });

  // okładka
  const [coverFile, setCoverFile] = useState<File | null>(null);

  // rozdziały
  const [rozdzialy, setRozdzialy] = useState<UIChapter[]>([
    { tytul: "", czas: "~5 min", file: null, imageFiles: [] },
  ]);

  // motywy
  const [availableMotywy, setAvailableMotywy] = useState<MotywDef[]>([]);
  const [wybraneMotywy, setWybraneMotywy] = useState<MotywPick[]>([]);

  // argumenty/cytaty
  const [argumentInput, setArgumentInput] = useState("");
  const [argumenty, setArgumenty] = useState<string[]>([]);
  const [cytatInput, setCytatInput] = useState("");
  const [cytaty, setCytaty] = useState<string[]>([]);

  const canSave = useMemo(() => {
    return Boolean(
      user && form.tytul && form.lektura && form.autor && rozdzialy.length > 0
    );
  }, [user, form, rozdzialy]);

  useEffect(() => {
    let on = true;
    (async () => {
      try {
        const items = await listMotywy();
        if (on) setAvailableMotywy(items);
      } catch {
        /* no-op */
      }
    })();
    return () => {
      on = false;
    };
  }, []);

  if (!user) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <p className="text-neutral-600">
          Musisz być zalogowany, aby dodać interpretację.
        </p>
      </div>
    );
  }

  // --- rozdziały UI helpers ---
  const updateRozdzial = (idx: number, patch: Partial<UIChapter>) => {
    setRozdzialy((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, ...patch } : r))
    );
  };
  const addRozdzial = () =>
    setRozdzialy((p) => [
      ...p,
      { tytul: "", czas: "~5 min", file: null, imageFiles: [] },
    ]);
  const removeRozdzial = (idx: number) =>
    setRozdzialy((p) => p.filter((_, i) => i !== idx));

  // motywy wybór
  const toggleMotyw = (m: MotywDef) => {
    setWybraneMotywy((prev) => {
      const found = prev.find((x) => x.id === m.id);
      if (found) return prev.filter((x) => x.id !== m.id);
      return [
        ...prev,
        { id: m.id, pytanie: m.pytaniePrzewodnie, fragmenty: [] },
      ];
    });
  };
  const addFragmentToMotyw = (id: MotywId, text: string) => {
    if (!text.trim()) return;
    setWybraneMotywy((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, fragmenty: [...m.fragmenty, text.trim()] } : m
      )
    );
  };
  const removeFragmentFromMotyw = (id: MotywId, i: number) => {
    setWybraneMotywy((prev) =>
      prev.map((m) =>
        m.id === id
          ? { ...m, fragmenty: m.fragmenty.filter((_, idx) => idx !== i) }
          : m
      )
    );
  };

  // argumenty/cytaty
  const pushArgument = () => {
    if (!argumentInput.trim()) return;
    setArgumenty((p) => [...p, argumentInput.trim()]);
    setArgumentInput("");
  };
  const removeArgument = (i: number) =>
    setArgumenty((p) => p.filter((_, idx) => idx !== i));
  const pushCytat = () => {
    if (!cytatInput.trim()) return;
    setCytaty((p) => [...p, cytatInput.trim()]);
    setCytatInput("");
  };
  const removeCytat = (i: number) =>
    setCytaty((p) => p.filter((_, idx) => idx !== i));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave) return;
    if (!user) {
      alert("Musisz być zalogowany.");
      return;
    }
    setSaving(true);
    try {
      // 0) okładka
      let coverUrl: string | undefined;
      if (coverFile) {
        const u = await uploadToImgBB(coverFile);
        coverUrl = u.url;
      }

      // 1) upload obrazków rozdziałów
      const uploadedChapters = await Promise.all(
        rozdzialy.map(async (r) => {
          const mdUrl: string | undefined = r.urls?.md; // <- const, zgodnie z lintem
          let imgs: string[] = [];
          if (r.imageFiles && r.imageFiles.length > 0) {
            const ups = await Promise.all(
              r.imageFiles.map((f) => uploadToImgBB(f))
            );
            imgs = ups.map((u) => u.url);
          }
          return { ...r, urls: { ...r.urls, md: mdUrl }, obrazki: imgs };
        })
      );

      // 2) finalne rozdziały do zapisu
      const outRozdzialy: Rozdzial[] = uploadedChapters.map((r, i) => ({
        id: slug(r.tytul || `rozdzial-${i + 1}`) || `r-${i + 1}-${Date.now()}`,
        tytul: r.tytul || `Rozdział ${i + 1}`,
        czas: r.czas || "~",
        ...(r.urls?.md ? { url: r.urls.md } : {}),
        ...(r.obrazki && r.obrazki.length ? { obrazki: r.obrazki } : {}),
      }));

      // 3) motywy
      const motywy = wybraneMotywy.map((m) => ({
        id: m.id,
        pytanie: m.pytanie,
        fragmenty: m.fragmenty,
      }));
      const motywyIds = wybraneMotywy.map((m) => m.id);

      // 4) zapis
      const docRef = await addDoc(collection(db, "zrodla"), {
        typ: "interpretacja",
        tytul: form.tytul,
        podtytul: form.podtytul,
        lektura: form.lektura,
        autor: form.autor,
        wspolczesnyAutor: form.wspolczesnyAutor,
        dataPublikacji: form.dataPublikacji,
        epoki: form.epokiCSV
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        tags: form.tagsCSV
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        czasCzytania: form.czasCzytania,
        coverUrl,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        motywy,
        motywyIds,
        rozdzialy: outRozdzialy,
        argumenty,
        cytaty,
      });

      alert("✓ Dodano źródło (interpretację)");
      nav(`/interpretacja/${docRef.id}`);
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert("Błąd: " + err.message);
      } else {
        alert("Wystąpił nieznany błąd");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Dodaj interpretację (Źródło)</h1>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* META */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            className="border p-2"
            placeholder="Tytuł"
            value={form.tytul}
            onChange={(e) => setForm({ ...form, tytul: e.target.value })}
            required
          />
          <input
            className="border p-2"
            placeholder="Podtytuł"
            value={form.podtytul}
            onChange={(e) => setForm({ ...form, podtytul: e.target.value })}
          />
          <input
            className="border p-2"
            placeholder="Lektura"
            value={form.lektura}
            onChange={(e) => setForm({ ...form, lektura: e.target.value })}
            required
          />
          <input
            className="border p-2"
            placeholder="Autor klasyki"
            value={form.autor}
            onChange={(e) => setForm({ ...form, autor: e.target.value })}
            required
          />
          <input
            className="border p-2"
            placeholder="Autor współczesny"
            value={form.wspolczesnyAutor}
            onChange={(e) =>
              setForm({ ...form, wspolczesnyAutor: e.target.value })
            }
          />
          <input
            className="border p-2"
            placeholder="Data publikacji (YYYY-MM-DD)"
            value={form.dataPublikacji}
            onChange={(e) =>
              setForm({ ...form, dataPublikacji: e.target.value })
            }
          />
          <input
            className="border p-2"
            placeholder="Epoki (CSV)"
            value={form.epokiCSV}
            onChange={(e) => setForm({ ...form, epokiCSV: e.target.value })}
          />
          <input
            className="border p-2"
            placeholder="Tagi (CSV)"
            value={form.tagsCSV}
            onChange={(e) => setForm({ ...form, tagsCSV: e.target.value })}
          />
          <input
            className="border p-2 md:col-span-2"
            placeholder="Czas czytania"
            value={form.czasCzytania}
            onChange={(e) => setForm({ ...form, czasCzytania: e.target.value })}
          />
        </section>

        {/* OKŁADKA */}
        <section className="border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-2">Okładka (opcjonalnie)</h2>
          <FileUploader
            label="Plik obrazu"
            accept="image/*"
            multiple={false}
            files={coverFile ? [coverFile] : []}
            onFilesChange={(fs) => setCoverFile(fs[0] ?? null)}
          />
          <p className="text-xs text-neutral-500 mt-2">
            Używana w kafelkach listy.
          </p>
        </section>

        {/* MOTYWY */}
        <section className="border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Motywy (z bazy)</h2>
            <span className="text-xs text-neutral-500">
              {wybraneMotywy.length} wybrane
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            {availableMotywy.map((m) => {
              const checked = wybraneMotywy.some((x) => x.id === m.id);
              return (
                <label
                  key={m.id}
                  className={`flex items-start gap-2 p-3 border rounded-lg cursor-pointer ${
                    checked
                      ? "border-amber-400 bg-amber-50"
                      : "border-neutral-200 hover:bg-neutral-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleMotyw(m)}
                    className="mt-1"
                  />
                  <div>
                    <div className="text-sm font-semibold">{m.nazwa}</div>
                    <div className="text-xs text-neutral-600">
                      {m.pytaniePrzewodnie}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>

          {wybraneMotywy.length > 0 && (
            <div className="space-y-4">
              {wybraneMotywy.map((m) => (
                <div key={m.id} className="border rounded p-3">
                  <div className="text-sm font-semibold mb-2">
                    Fragmenty – {m.id}
                  </div>
                  <FragmentEditor
                    onAdd={(txt) => addFragmentToMotyw(m.id, txt)}
                    onRemove={(idx) => removeFragmentFromMotyw(m.id, idx)}
                    items={m.fragmenty}
                  />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ROZDZIAŁY */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold">Rozdziały</h2>
            <button
              type="button"
              onClick={addRozdzial}
              className="text-sm text-amber-600 hover:underline"
            >
              + Dodaj rozdział
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {rozdzialy.map((r, i) => (
              <div key={i} className="border rounded-lg p-3 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <input
                    className="border p-2 rounded"
                    placeholder={`Tytuł rozdziału #${i + 1}`}
                    value={r.tytul}
                    onChange={(e) =>
                      updateRozdzial(i, { tytul: e.target.value })
                    }
                  />
                  <input
                    className="border p-2 rounded"
                    placeholder="Czas (np. ~6 min)"
                    value={r.czas}
                    onChange={(e) =>
                      updateRozdzial(i, { czas: e.target.value })
                    }
                  />
                </div>

                {/* Markdown: plik z podglądem +/lub URL */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <FileUploader
                    label=".md (podgląd w textarea)"
                    accept=".md,text/markdown,text/plain"
                    multiple={false}
                    files={r.file ? [r.file] : []}
                    onFilesChange={(fs) =>
                      updateRozdzial(i, { file: fs[0] ?? null })
                    }
                  />
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      URL do .md (zalecane)
                    </label>
                    <input
                      className="border p-2 rounded w-full"
                      placeholder="https://…/content.md"
                      value={r.urls?.md ?? ""}
                      onChange={(e) =>
                        updateRozdzial(i, {
                          urls: { ...(r.urls || {}), md: e.target.value },
                        })
                      }
                    />
                  </div>
                </div>

                {/* Obrazki: multi z podglądem */}
                <FileUploader
                  label="Obrazki (opcjonalnie)"
                  accept="image/*"
                  multiple
                  files={r.imageFiles || []}
                  onFilesChange={(fs) => updateRozdzial(i, { imageFiles: fs })}
                />

                <div className="flex items-center justify-between">
                  <span className="text-xs text-neutral-500">
                    {r.urls?.md
                      ? `URL .md: ${r.urls.md}`
                      : r.file
                      ? `Plik .md: ${r.file.name}`
                      : "Dodaj .md jako plik lub URL"}
                  </span>
                  {rozdzialy.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeRozdzial(i)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Usuń rozdział
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ARGUMENTY / CYTATY */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border rounded-lg p-4">
            <h2 className="text-sm font-semibold mb-2">
              Argumenty (opcjonalnie)
            </h2>
            <div className="flex gap-2 mb-3">
              <input
                className="border p-2 rounded w-full"
                placeholder="Dodaj argument..."
                value={argumentInput}
                onChange={(e) => setArgumentInput(e.target.value)}
              />
              <button
                type="button"
                onClick={pushArgument}
                className="px-3 py-2 border-2 border-black text-sm hover:bg-amber-50"
              >
                Dodaj
              </button>
            </div>
            <ul className="space-y-2">
              {argumenty.map((a, i) => (
                <li
                  key={i}
                  className="flex items-start justify-between gap-3 text-sm"
                >
                  <span>{a}</span>
                  <button
                    type="button"
                    onClick={() => removeArgument(i)}
                    className="text-xs text-red-600"
                  >
                    Usuń
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="border rounded-lg p-4">
            <h2 className="text-sm font-semibold mb-2">Cytaty</h2>
            <div className="flex gap-2 mb-3">
              <input
                className="border p-2 rounded w-full"
                placeholder="„...”"
                value={cytatInput}
                onChange={(e) => setCytatInput(e.target.value)}
              />
              <button
                type="button"
                onClick={pushCytat}
                className="px-3 py-2 border-2 border-black text-sm hover:bg-neutral-50"
              >
                Dodaj
              </button>
            </div>
            <ul className="space-y-2">
              {cytaty.map((c, i) => (
                <li
                  key={i}
                  className="flex items-start justify-between gap-3 text-sm italic"
                >
                  <span>„{c}”</span>
                  <button
                    type="button"
                    onClick={() => removeCytat(i)}
                    className="text-xs text-red-600"
                  >
                    Usuń
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <button
          disabled={!canSave || saving}
          className="px-4 py-2 bg-amber-600 text-white rounded disabled:opacity-60"
        >
          {saving ? "Zapisywanie…" : "Dodaj"}
        </button>
      </form>
    </div>
  );
}

/** Mały edytor listy „fragmentów” dla motywu */
function FragmentEditor({
  items,
  onAdd,
  onRemove,
}: {
  items: string[];
  onAdd: (txt: string) => void;
  onRemove: (idx: number) => void;
}) {
  const [value, setValue] = useState("");

  return (
    <div>
      <div className="flex gap-2 mb-2">
        <input
          className="border p-2 rounded w-full"
          placeholder="Dodaj fragment/cytat/hasło…"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <button
          type="button"
          onClick={() => {
            onAdd(value);
            setValue("");
          }}
          className="px-3 py-2 border-2 border-black text-sm hover:bg-neutral-50"
        >
          Dodaj
        </button>
      </div>
      <ul className="space-y-1">
        {items.map((t, i) => (
          <li
            key={i}
            className="flex items-start justify-between gap-3 text-xs"
          >
            <span>{t}</span>
            <button
              type="button"
              onClick={() => onRemove(i)}
              className="text-[11px] text-red-600"
            >
              Usuń
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
