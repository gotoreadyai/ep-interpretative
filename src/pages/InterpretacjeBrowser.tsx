// src/pages/InterpretacjeBrowser.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listInterpretacje } from "../services/interpretacje";
import type { InterpretacjaMeta } from "../types";

export default function InterpretacjeBrowser() {
  const navigate = useNavigate();
  const [items, setItems] = useState<InterpretacjaMeta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let on = true;
    (async () => {
      try {
        const data = await listInterpretacje();
        if (on) setItems(data);
      } finally {
        if (on) setLoading(false);
      }
    })();
    return () => { on = false; };
  }, []);

  return (
    <div className="min-h-screen bg-white text-black font-sans antialiased">
      <header className="sticky top-0 z-30 bg-white border-b border-black">
        <div className="max-w-[1920px] mx-auto px-4 lg:px-8 py-4 lg:py-6">
          <h1 className="text-[20px] lg:text-[32px] font-normal leading-[1.2] tracking-tight mb-1 lg:mb-2">
            Interpretacje Lektur
          </h1>
          <p className="text-[10px] lg:text-[13px] text-gray-400 leading-[1.4] tracking-wide uppercase">
            Współczesność → Most → Klasyka
          </p>
        </div>
      </header>

      <div className="max-w-[1200px] mx-auto px-4 lg:px-8 py-8 lg:py-12">
        {loading && <div className="text-gray-400">Wczytywanie…</div>}

        {!loading && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {items.map((interp) => (
                <button
                  key={interp.id}
                  type="button"
                  onClick={() => navigate(`/interpretacja/${interp.id}`)}
                  className="border-2 border-black p-6 text-left hover:bg-amber-50 hover:border-amber-500 transition-all group"
                >
                  <div className="w-full h-48 bg-gray-200 border border-gray-400 mb-4 flex items-center justify-center overflow-hidden">
                    {interp.coverUrl ? (
                      // Okładka z bazy
                      <img
                        src={interp.coverUrl}
                        alt={interp.tytul}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <span className="text-[48px]">📖</span>
                    )}
                  </div>

                  <div className="mb-3">
                    <h3 className="text-[18px] font-medium mb-1">{interp.tytul}</h3>
                    <p className="text-[12px] text-gray-600">{interp.podtytul}</p>
                  </div>

                  <div className="text-[11px] text-gray-400 mb-3">
                    {interp.lektura} · {interp.autor}
                  </div>

                  <div className="flex items-center gap-4 text-[11px] text-gray-500 mb-4">
                    <span>📖 {interp.rozdzialy.length} rozdz.</span>
                    <span>⏱️ {interp.czasCzytania}</span>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-300">
                    <span className="text-[11px] uppercase tracking-wide text-amber-500 font-medium">
                      Zacznij czytać →
                    </span>
                  </div>
                </button>
              ))}
            </div>

            {items.length === 0 && (
              <div className="mt-12 border-2 border-dashed border-gray-300 p-12 text-center">
                <p className="text-[13px] text-gray-400 mb-2">Brak interpretacji</p>
                <p className="text-[11px] text-gray-400">Dodaj pierwszą w zakładce „/dodaj”.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
