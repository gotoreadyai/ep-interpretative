// src/pages/MotywPage.tsx
import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getMotywById } from "../services/motywy";
import { listInterpretacjeByMotyw } from "../services/interpretacje";
import type { MotywDef, MotywId, InterpretacjaMeta } from "../types";

const STORAGE_KEY = (id: MotywId) => `motyw_${id}`;

type MaterialItem = {
  tytul: string;
  opis: string;
  badge?: string; // np. dziedzina (literacka/filmowa/…)
  autor?: string;
};

type MaterialGroup = {
  label: string; // „Współczesność” | „Klasyka”
  items: MaterialItem[];
};

function isWspolczesnosc(epoki: string[]): boolean {
  return epoki.some((e) => e.toLowerCase() === "współczesność" || e.toLowerCase() === "wspolczesnosc");
}

export default function MotywPage() {
  const { motywId } = useParams<{ motywId: MotywId }>();
  const navigate = useNavigate();

  const [motyw, setMotyw] = useState<MotywDef | null>(null);
  const [interpretacje, setInterpretacje] = useState<InterpretacjaMeta[]>([]);
  const [loading, setLoading] = useState(true);

  const [odpowiedz, setOdpowiedz] = useState("");
  const [wybraneArg, setWybraneArg] = useState<string[]>([]);

  useEffect(() => {
    let on = true;
    (async () => {
      if (!motywId) return;
      setLoading(true);
      try {
        const [m, interps] = await Promise.all([
          getMotywById(motywId),
          listInterpretacjeByMotyw(motywId),
        ]);
        if (!on) return;
        setMotyw(m);
        setInterpretacje(interps);

        // localStorage restore
        try {
          const saved = localStorage.getItem(STORAGE_KEY(motywId));
          if (saved) {
            const parsed = JSON.parse(saved) as { odpowiedz?: string; argumenty?: string[] };
            setOdpowiedz(parsed.odpowiedz || "");
            setWybraneArg(parsed.argumenty || []);
          }
        } catch (e) {
          console.debug("[MotywPage] Restore from localStorage failed:", e);
        }
      } finally {
        if (on) setLoading(false);
      }
    })();
    return () => {
      on = false;
    };
  }, [motywId]);

  useEffect(() => {
    if (!motywId) return;
    try {
      localStorage.setItem(
        STORAGE_KEY(motywId),
        JSON.stringify({ odpowiedz, argumenty: wybraneArg })
      );
    } catch (e) {
      console.debug("[MotywPage] Save to localStorage failed:", e);
    }
  }, [odpowiedz, wybraneArg, motywId]);

  const toggleArg = (arg: string) => {
    setWybraneArg((prev) =>
      prev.includes(arg) ? prev.filter((a) => a !== arg) : [...prev, arg]
    );
  };

  const exportMarkdown = async () => {
    const md = `# ${motyw?.nazwa}

**Pytanie:** ${motyw?.pytaniePrzewodnie}
**Teza:** ${motyw?.tezaPrzykladowa}

## Twoja odpowiedź
${odpowiedz || "(brak)"}

## Argumenty
${
  wybraneArg.length > 0
    ? wybraneArg.map((a, i) => `${i + 1}. ${a}`).join("\n")
    : "(brak)"
}

---
*Notatka: ${new Date().toLocaleDateString("pl-PL")}*
`;
    try {
      await navigator.clipboard.writeText(md);
      alert("✓ Skopiowano do schowka!");
    } catch {
      const blob = new Blob([md], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${motywId}-notatka.md`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const slowa = useMemo(
    () => odpowiedz.trim().split(/\s+/).filter(Boolean).length,
    [odpowiedz]
  );

  /**
   * MATERIAŁY: Budowane WYŁĄCZNIE z dokumentów powiązanych z motywem.
   * Reguła:
   *  - jeśli dokument ma w epokach „Współczesność” → grupa „Współczesność”
   *  - w przeciwnym razie → grupa „Klasyka”
   * Wyświetlamy:
   *  - tytuł dokumentu
   *  - opis = lektura + autor (lub podtytuł jeśli chcesz)
   *  - badge = dziedzina (jeśli jest w modelu danych)
   */
  const materialGroups: MaterialGroup[] = useMemo(() => {
    if (!interpretacje.length) return [];

    const wsp: MaterialItem[] = [];
    const kla: MaterialItem[] = [];

    for (const doc of interpretacje) {
      const groupIsWsp = isWspolczesnosc(Array.isArray(doc.epoki) ? doc.epoki : []);
      const item: MaterialItem = {
        tytul: doc.tytul,
        opis:
          doc.podtytul && doc.podtytul.trim().length > 0
            ? doc.podtytul
            : `${doc.lektura} – ${doc.autor}`,
        badge: (doc as Partial<InterpretacjaMeta> & { dziedzina?: string }).dziedzina,
        autor: groupIsWsp ? (doc.wspolczesnyAutor || doc.autor) : doc.autor,
      };
      if (groupIsWsp) wsp.push(item);
      else kla.push(item);
    }

    const out: MaterialGroup[] = [];
    if (wsp.length) out.push({ label: "Współczesność", items: wsp });
    if (kla.length) out.push({ label: "Klasyka", items: kla });
    return out;
  }, [interpretacje]);

  if (!motywId) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-neutral-500 mb-4">Nie znaleziono motywu</p>
          <button
            type="button"
            onClick={() => navigate("/")}
            className="px-4 py-2 bg-neutral-900 text-white rounded hover:bg-neutral-800 transition-colors"
          >
            ← Powrót
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="min-h-screen bg-white p-8">Wczytywanie…</div>;
  }

  if (!motyw) {
    return (
      <div className="min-h-screen bg-white p-8">
        <p className="text-neutral-600">Nie znaleziono motywu.</p>
        <button
          type="button"
          onClick={() => navigate("/")}
          className="mt-4 px-4 py-2 border-2 border-black text-sm"
        >
          ← Powrót
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 lg:py-6">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="text-neutral-600 hover:text-neutral-900 mb-3 inline-flex items-center text-sm font-medium"
          >
            ← Wszystkie motywy
          </button>
          <h1 className="text-2xl lg:text-4xl font-bold text-neutral-900 mb-2">
            {motyw.nazwa}
          </h1>
          <div className="flex flex-wrap gap-2">
            {motyw.epoki.map((epoka) => (
              <span
                key={epoka}
                className="text-xs px-2 py-1 bg-neutral-100 text-neutral-600 rounded"
              >
                {epoka}
              </span>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* LEFT */}
          <div className="lg:col-span-2 space-y-6">
            <section className="bg-white rounded-lg border border-neutral-200 p-6 lg:p-8">
              <h2 className="text-xs uppercase tracking-wide text-neutral-400 font-semibold mb-3">
                Pytanie przewodnie
              </h2>
              <p className="text-lg lg:text-xl font-medium text-neutral-900 mb-4 leading-relaxed">
                {motyw.pytaniePrzewodnie}
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded p-4">
                <p className="text-sm text-neutral-700">
                  <strong className="text-neutral-900">Teza przykładowa:</strong>{" "}
                  {motyw.tezaPrzykladowa}
                </p>
              </div>
            </section>

            {/* ——— MATERIAŁY: z dokumentów powiązanych ——— */}
            {materialGroups.length > 0 && (
              <section className="bg-white rounded-lg border border-neutral-200 p-6 lg:p-8">
                <h2 className="text-base lg:text-lg font-semibold text-neutral-900 mb-6">
                  Materiały do wykorzystania
                </h2>

                <div className="space-y-8">
                  {materialGroups.map((group, gi) => (
                    <div key={gi}>
                      <h3 className="text-xs uppercase tracking-wide text-neutral-400 font-semibold mb-3">
                        {group.label}
                      </h3>
                      <div className="space-y-3">
                        {group.items.map((m, i) => (
                          <div
                            key={i}
                            className="bg-neutral-50 rounded-lg border border-neutral-200 p-4"
                          >
                            <div className="flex items-center gap-2 mb-2">
                              {m.badge && (
                                <span className="text-xs px-2 py-0.5 bg-white border border-neutral-300 rounded text-neutral-600 uppercase font-medium">
                                  {m.badge}
                                </span>
                              )}
                              <span className="text-sm font-semibold text-neutral-900">
                                {m.tytul}
                              </span>
                              {m.autor && (
                                <span className="text-xs text-neutral-500">– {m.autor}</span>
                              )}
                            </div>
                            <p className="text-sm text-neutral-600">{m.opis}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ——— ODP ——— */}
            <section className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg border-2 border-amber-300 p-6 lg:p-8">
              <h2 className="text-base lg:text-lg font-semibold text-neutral-900 mb-4">
                ✍️ Twoja odpowiedź
              </h2>
              <p className="text-sm text-neutral-600 mb-4 leading-relaxed">
                Napisz swoją odpowiedź na pytanie przewodnie (minimum 100 słów).
              </p>

              <textarea
                value={odpowiedz}
                onChange={(e) => setOdpowiedz(e.target.value)}
                className="w-full rounded-lg border-2 border-neutral-300 focus:border-amber-500 focus:ring-0 p-4 text-sm leading-relaxed min-h-[300px] bg-white"
                placeholder="Zacznij pisać swoją odpowiedź..."
              />

              <div className="mt-4 mb-6">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-neutral-600 font-medium">{slowa} / 100 słów</span>
                  <span
                    className={`font-semibold ${slowa >= 100 ? "text-green-600" : "text-neutral-400"}`}
                  >
                    {slowa >= 100 ? "✓ Gotowe" : `Jeszcze ${Math.max(0, 100 - slowa)}`}
                  </span>
                </div>
                <div className="h-2 bg-neutral-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${slowa >= 100 ? "bg-green-500" : "bg-amber-400"}`}
                    style={{ width: `${Math.min((slowa / 100) * 100, 100)}%` }}
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={exportMarkdown}
                disabled={slowa < 100}
                className="w-full bg-amber-600 hover:bg-amber-700 disabled:bg-neutral-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
              >
                📥 Eksportuj notatkę
              </button>
            </section>

            {/* ——— POWIĄZANE DOKUMENTY (pełna lista) ——— */}
            {interpretacje.length > 0 && (
              <section className="bg-white rounded-lg border border-neutral-200 p-6 lg:p-8">
                <h2 className="text-base lg:text-lg font-semibold text-neutral-900 mb-3">
                  📖 Chcesz przeczytać więcej?
                </h2>
                <p className="text-sm text-neutral-600 mb-6">
                  Te dokumenty poruszają motyw <strong>{motyw.nazwa}</strong>:
                </p>
                <div className="space-y-3">
                  {interpretacje.map((interp) => (
                    <Link
                      key={interp.id}
                      to={`/interpretacja/${interp.id}`}
                      className="block bg-neutral-50 hover:bg-amber-50 border border-neutral-200 hover:border-amber-300 rounded-lg p-4 transition-all duration-200"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-sm font-semibold text-neutral-900">
                          {interp.tytul}
                        </h3>
                        {"dziedzina" in interp && (interp as { dziedzina?: string }).dziedzina && (
                          <span
                            className="text-[10px] uppercase tracking-wide px-2 py-1 rounded border border-neutral-300 text-neutral-600 bg-white"
                            title="Dziedzina interpretacji"
                          >
                            {(interp as { dziedzina?: string }).dziedzina}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-neutral-500 mt-1">
                        Utwór: <strong>{interp.lektura}</strong> – {interp.autor}
                      </p>
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-[11px] text-neutral-500">
                          ⏱️ {interp.czasCzytania} · {interp.rozdzialy.length} rozdz.
                        </span>
                        <span className="text-xs font-medium text-amber-600">Czytaj →</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* RIGHT */}
          <div className="space-y-6">
            <aside className="bg-white rounded-lg border border-neutral-200 p-6 sticky top-24">
              <h3 className="text-sm font-semibold text-neutral-900 mb-3">Argumenty (opcjonalnie)</h3>
              <p className="text-xs text-neutral-500 mb-4">Kliknij, aby dodać do notatki:</p>
              <div className="space-y-2">
                {motyw.argumentyPrzykladowe.map((arg, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggleArg(arg)}
                    className={`w-full text-left text-xs p-3 rounded-lg border-2 transition-all duration-200 ${
                      wybraneArg.includes(arg)
                        ? "border-amber-500 bg-amber-50 text-neutral-900"
                        : "border-neutral-200 hover:border-neutral-300 text-neutral-600"
                    }`}
                  >
                    {wybraneArg.includes(arg) && <span className="text-amber-600 mr-1">✓</span>}
                    {arg}
                  </button>
                ))}
              </div>

              {wybraneArg.length > 0 && (
                <div className="mt-4 pt-4 border-t border-neutral-200">
                  <p className="text-xs text-neutral-400 uppercase font-semibold mb-2">
                    Wybrane ({wybraneArg.length})
                  </p>
                  <div className="space-y-1">
                    {wybraneArg.map((arg, i) => (
                      <div key={i} className="text-xs text-neutral-600 leading-relaxed">
                        {i + 1}. {arg.substring(0, 50)}...
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </aside>

            {motyw.cytaty && motyw.cytaty.length > 0 && (
              <aside className="bg-neutral-50 rounded-lg border border-neutral-200 p-6">
                <h3 className="text-xs uppercase tracking-wide text-neutral-400 font-semibold mb-3">
                  Cytaty
                </h3>
                <div className="space-y-2 text-xs text-neutral-600 italic">
                  {motyw.cytaty.map((c, i) => (
                    <p key={i}>„{c}”</p>
                  ))}
                </div>
              </aside>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
