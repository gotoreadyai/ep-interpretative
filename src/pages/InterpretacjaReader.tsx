// src/pages/InterpretacjaReader.tsx
import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getChaptersMarkdown, getInterpretacja } from "../services/interpretacje";
import ReactMarkdown from "react-markdown";
import type { InterpretacjaMeta } from "../types";

type LoadedChapter = { id: string; title: string; time: string; content: string };

export default function InterpretacjaReader() {
  const { interpretacjaId } = useParams<{ interpretacjaId: string }>();
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [meta, setMeta] = useState<InterpretacjaMeta | null>(null);
  const [chapters, setChapters] = useState<LoadedChapter[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const total = chapters?.length ?? 0;
  const isLast = useMemo(() => total > 0 && currentIndex === total - 1, [total, currentIndex]);

  useEffect(() => {
    let on = true;
    (async () => {
      if (!interpretacjaId) return;
      setLoading(true);
      setErr(null);
      setChapters(null);
      try {
        const m = await getInterpretacja(interpretacjaId);
        if (!on) return;
        if (!m) {
          setErr("Nie znaleziono interpretacji.");
          setLoading(false);
          return;
        }
        setMeta(m);
        const loaded = await getChaptersMarkdown(m.rozdzialy as any);
        if (!on) return;
        setChapters(loaded);
      } catch (e) {
        if (on) setErr("Nie udało się wczytać treści rozdziałów.");
      } finally {
        if (on) setLoading(false);
      }
    })();
    return () => {
      on = false;
    };
  }, [interpretacjaId]);

  const handleNext = () => (isLast ? navigate(-1) : setCurrentIndex((i) => Math.min(i + 1, Math.max(0, total - 1))));
  const handlePrev = () => setCurrentIndex((i) => Math.max(0, i - 1));

  // Bieżący rozdział (bezpiecznie)
  const chapter = total > 0 ? chapters?.[currentIndex] : null;
  const metaChapter = meta?.rozdzialy?.[currentIndex];

  // Progres
  const progressPct = total > 0 ? ((currentIndex + 1) / total) * 100 : 0;

  if (!interpretacjaId) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-sm text-neutral-500 mb-4">{err ?? "Nie znaleziono interpretacji."}</p>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="border-2 border-black px-6 py-3 text-[11px] uppercase"
          >
            ← Wróć
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* HEADER */}
      <header className="sticky top-0 z-10 bg-white border-b border-neutral-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 lg:py-6">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="text-neutral-600 hover:text-neutral-900 mb-3 inline-flex items-center text-sm font-medium"
          >
            ← Powrót
          </button>
          {meta ? (
            <>
              <h1 className="text-2xl lg:text-3xl font-bold text-neutral-900 mb-1">{meta.tytul}</h1>
              <p className="text-xs lg:text-sm text-neutral-500">
                {meta.lektura} · {meta.autor}
              </p>
            </>
          ) : (
            <div className="h-8 w-1/2 bg-neutral-100 animate-pulse rounded" />
          )}
        </div>
      </header>

      {/* PROGRESS */}
      <div className="bg-neutral-50 border-b border-neutral-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center gap-3">
            <span className="text-xs text-neutral-500 font-medium">
              Rozdział {total > 0 ? currentIndex + 1 : 0} / {total}
            </span>
            <div className="flex-1 h-1.5 bg-neutral-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* TREŚĆ */}
      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        {loading && <div className="animate-pulse text-neutral-400">Wczytywanie...</div>}
        {err && !loading && <div className="text-red-600">{err}</div>}

        {!loading && !err && (
          <>
            {total === 0 && (
              <div className="text-neutral-500">Brak rozdziałów w tej interpretacji.</div>
            )}

            {chapter && (
              <div className="prose prose-neutral lg:prose-lg max-w-none">
                <h2 className="text-2xl lg:text-3xl font-bold text-neutral-900 mb-4 pb-4 border-b border-neutral-200">
                  {chapter.title}
                </h2>

                {/* GALERIA OBRAZKÓW ROZDZIAŁU */}
                {(metaChapter?.obrazki?.length ?? 0) > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                    {metaChapter!.obrazki!.map((u, i) => (
                      <img
                        key={i}
                        src={u}
                        alt=""
                        className="w-full h-56 md:h-64 object-cover rounded-lg border"
                        loading="lazy"
                      />
                    ))}
                  </div>
                )}

                {/* TREŚĆ MARKDOWN */}
                <div className="prose max-w-none">
                  <ReactMarkdown
                    components={{
                      img: ({ node, ...props }) => (
                        // @ts-ignore
                        <img
                          {...props}
                          className="max-w-full h-auto rounded border mx-auto my-4"
                          loading="lazy"
                        />
                      ),
                      a: ({ node, ...props }) => (
                        // @ts-ignore
                        <a {...props} target="_blank" rel="noreferrer" />
                      ),
                    }}
                  >
                    {chapter.content}
                  </ReactMarkdown>
                </div>
              </div>
            )}
          </>
        )}
      </article>

      {/* FOOTER / NAWIGACJA */}
      <div className="border-t border-neutral-200 bg-neutral-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={handlePrev}
              disabled={currentIndex === 0 || total === 0}
              className="px-4 py-2 text-sm font-medium border border-neutral-300 rounded-lg hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              ← Poprzedni
            </button>

            <span className="text-xs text-neutral-500">
              {meta?.rozdzialy?.[currentIndex]?.czas ?? ""}
            </span>

            <button
              type="button"
              onClick={handleNext}
              disabled={total === 0}
              className="px-4 py-2 text-sm font-semibold bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-40"
            >
              {isLast ? "Zakończ →" : "Następny →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
