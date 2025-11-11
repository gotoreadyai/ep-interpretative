// src/pages/MotywyBrowser.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listMotywy, seedMotywyDefaults } from "../services/motywy";
import { useAuth } from "../auth/useAuth";
import type { MotywDef } from "../types";

export default function MotywyBrowser() {
  const { user } = useAuth();
  const [items, setItems] = useState<MotywDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    let on = true;
    (async () => {
      try {
        const data = await listMotywy();
        if (on) setItems(data);
      } finally {
        if (on) setLoading(false);
      }
    })();
    return () => {
      on = false;
    };
  }, []);

  const toMessage = (err: unknown) =>
    err instanceof Error ? err.message : String(err);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await seedMotywyDefaults();
      const data = await listMotywy();
      setItems(data);
      alert("✓ Dodano przykładowe motywy");
    } catch (e: unknown) {
      alert("Nie udało się dodać motywów: " + toMessage(e));
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
          <h1 className="text-2xl lg:text-4xl font-bold text-neutral-900 mb-2">
            Motywy Maturalne
          </h1>
          <p className="text-sm lg:text-base text-neutral-500">
            Wybierz temat i zacznij pracę nad notatką
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        {loading && <div className="text-gray-400">Wczytywanie…</div>}

        {!loading && items.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((motyw) => (
              <Link
                key={motyw.id}
                to={`/motyw/${motyw.id}`}
                className="group bg-white rounded-lg border-2 border-neutral-200 hover:border-amber-500 hover:shadow-lg transition-all duration-200 overflow-hidden"
              >
                <div className="bg-neutral-100 group-hover:bg-amber-50 h-40 flex items-center justify-center text-6xl transition-colors duration-200">
                  {motyw.ikona || "📖"}
                </div>

                <div className="p-6">
                  <h2 className="text-lg font-semibold text-neutral-900 mb-2 group-hover:text-amber-600 transition-colors">
                    {motyw.nazwa}
                  </h2>
                  <p className="text-sm text-neutral-600 mb-4 line-clamp-2">
                    {motyw.pytaniePrzewodnie}
                  </p>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {motyw.epoki.slice(0, 3).map((epoka) => (
                      <span
                        key={epoka}
                        className="text-xs px-2.5 py-1 bg-neutral-100 text-neutral-600 rounded"
                      >
                        {epoka}
                      </span>
                    ))}
                  </div>

                  <div className="text-sm font-medium text-amber-600 group-hover:text-amber-700">
                    Rozpocznij →
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {!loading && items.length === 0 && (
          <div className="mt-12 border-2 border-dashed border-gray-300 p-12 text-center space-y-3">
            <p className="text-[13px] text-gray-600">
              Brak motywów w bazie albo brak uprawnień do odczytu.
            </p>
            {user ? (
              <button
                disabled={seeding}
                onClick={handleSeed}
                className="px-4 py-2 bg-amber-600 text-white rounded disabled:opacity-60"
              >
                {seeding ? "Dodawanie…" : "➕ Dodaj przykładowe motywy"}
              </button>
            ) : (
              <p className="text-[12px] text-gray-500">
                Zaloguj się, aby dodać przykładowe motywy.
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
