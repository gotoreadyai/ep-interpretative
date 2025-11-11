// src/services/interpretacje.ts
import {
    collection,
    doc,
    getDoc,
    getDocs,
    orderBy,
    query,
    where,
    type DocumentData,
  } from "firebase/firestore";
  import { db } from "../lib/firebase";
  import type { InterpretacjaMeta, MotywId, Rozdzial } from "../types";
  
  const COL = "zrodla"; // jedyna kolekcja na źródła (interpretacje itp.)
  
  export async function listInterpretacje(): Promise<InterpretacjaMeta[]> {
    const q = query(
      collection(db, COL),
      where("typ", "==", "interpretacja"),
      // UWAGA: tu może zostać dataPublikacji (string), ale lepiej mieć timestamp w przyszłości
      orderBy("dataPublikacji", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => normalizeMeta(d.id, d.data()));
  }
  
  export async function getInterpretacja(id: string): Promise<InterpretacjaMeta | null> {
    const d = await getDoc(doc(db, COL, id));
    return d.exists() ? normalizeMeta(d.id, d.data()) : null;
  }
  
  /**
   * Interpretacje powiązane z motywem.
   * WERSJA bez wymagania indeksu: rezygnujemy z orderBy po dataPublikacji,
   * ewentualnie sortujemy klientowo po polu createdAt (timestamp) jeśli istnieje.
   */
  export async function listInterpretacjeByMotyw(motywId: MotywId): Promise<InterpretacjaMeta[]> {
    // najpierw pobierz bez sortowania (array-contains + brak orderBy nie wymaga indeksu złożonego)
    const q = query(
      collection(db, COL),
      where("typ", "==", "interpretacja"),
      where("motywyIds", "array-contains", motywId)
    );
    const snap = await getDocs(q);
    const items = snap.docs.map((d) => normalizeMeta(d.id, d.data()));
  
    // opcjonalne sortowanie klientowe: preferuj createdAt (Timestamp) -> dataPublikacji (string) -> tytuł
    return items.sort((a, b) => {
      // @ts-ignore – createdAt może być Timestamp (z addDoc)
      const ca = (a as any).createdAt?.toMillis?.() ?? 0;
      // @ts-ignore
      const cb = (b as any).createdAt?.toMillis?.() ?? 0;
      if (cb !== ca) return cb - ca;
  
      // fallback po dataPublikacji (string YYYY-MM-DD)
      const da = a.dataPublikacji || "";
      const dbb = b.dataPublikacji || "";
      if (dbb !== da) return dbb.localeCompare(da);
  
      return a.tytul.localeCompare(b.tytul);
    });
  }
  
  /**
   * Ładowanie treści rozdziałów (Markdown po URL).
   */
  export async function getChaptersMarkdown(rozdzialy: Rozdzial[]) {
    const out: { id: string; title: string; time: string; content: string }[] = [];
  
    for (const r of rozdzialy) {
      const src = r.url ?? r.plik; // preferuj url (z bazy), plik tylko fallback
      let md = "_(brak treści)_";
      try {
        if (src) {
          const res = await fetch(src);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          md = await res.text();
        }
      } catch {
        md = "_(nie udało się wczytać treści rozdziału)_";
      }
      out.push({ id: r.id, title: r.tytul, time: r.czas, content: md });
    }
  
    return out;
  }
  
  function normalizeMeta(id: string, data: DocumentData): InterpretacjaMeta {
    return {
      id,
      typ: data.typ ?? "interpretacja",
      tytul: data.tytul,
      podtytul: data.podtytul ?? "",
      lektura: data.lektura,
      autor: data.autor,
      wspolczesnyAutor: data.wspolczesnyAutor ?? "",
      dataPublikacji: data.dataPublikacji,
      rozdzialy: (data.rozdzialy ?? []) as Rozdzial[],
      motywy: (data.motywy ?? []) as any[],
      motywyIds:
        data.motywyIds ?? (data.motywy ? data.motywy.map((m: any) => m.id) : []),
      epoki: data.epoki ?? [],
      tags: data.tags ?? [],
      czasCzytania: data.czasCzytania ?? "~",
      coverUrl: data.coverUrl,
      argumenty: data.argumenty ?? [],
      cytaty: data.cytaty ?? [],
    };
  }
  