// src/services/interpretacje.ts
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  type DocumentData,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import type {
  InterpretacjaMeta,
  MotywId,
  Rozdzial,
  DokumentMeta,
  InterpretacjaDziedzina,
} from "../types";

const COL = "zrodla";

/** Pomocniczo wyciąga createdAt w ms bez 'any'. */
function getCreatedAtMs(meta: unknown): number {
  const createdAt = (meta as { createdAt?: { toMillis?: () => number } })
    .createdAt;
  return createdAt?.toMillis?.() ?? 0;
}

/** Sort: preferuj createdAt, potem dataPublikacji (YYYY-MM-DD), potem tytuł. */
function sortDocs(a: InterpretacjaMeta, b: InterpretacjaMeta) {
  const ca = getCreatedAtMs(a);
  const cb = getCreatedAtMs(b);
  if (cb !== ca) return cb - ca;

  const da = a.dataPublikacji || "";
  const dbb = b.dataPublikacji || "";
  if (dbb !== da) return dbb.localeCompare(da);

  return a.tytul.localeCompare(b.tytul);
}

/** Lista dokumentów typu „interpretacja” (sort klientowy). */
export async function listInterpretacje(): Promise<InterpretacjaMeta[]> {
  // Nowe pole
  const qNew = query(
    collection(db, COL),
    where("typDokumentu", "==", "interpretacja")
  );
  const snapNew = await getDocs(qNew);
  let items = snapNew.docs.map((d) => normalizeMeta(d.id, d.data()));

  // Fallback dla starszych rekordów (pole 'typ')
  if (items.length === 0) {
    const qOld = query(
      collection(db, COL),
      where("typ", "==", "interpretacja")
    );
    const snapOld = await getDocs(qOld);
    items = snapOld.docs.map((d) => normalizeMeta(d.id, d.data()));
  }

  return items.sort(sortDocs);
}

export async function getInterpretacja(
  id: string
): Promise<InterpretacjaMeta | null> {
  const d = await getDoc(doc(db, COL, id));
  return d.exists() ? normalizeMeta(d.id, d.data()) : null;
}

/** Interpretacje powiązane z motywem (sort klientowy). */
export async function listInterpretacjeByMotyw(
  motywId: MotywId
): Promise<InterpretacjaMeta[]> {
  // Najpierw nowe pole:
  const qNew = query(
    collection(db, COL),
    where("typDokumentu", "==", "interpretacja"),
    where("motywyIds", "array-contains", motywId)
  );
  const snapNew = await getDocs(qNew);
  let items = snapNew.docs.map((d) => normalizeMeta(d.id, d.data()));

  // Fallback na starsze rekordy:
  if (items.length === 0) {
    const qOld = query(
      collection(db, COL),
      where("typ", "==", "interpretacja"),
      where("motywyIds", "array-contains", motywId)
    );
    const snapOld = await getDocs(qOld);
    items = snapOld.docs.map((d) => normalizeMeta(d.id, d.data()));
  }

  return items.sort(sortDocs);
}

/** Ładowanie treści rozdziałów (Markdown po URL). */
export async function getChaptersMarkdown(rozdzialy: Rozdzial[]) {
  const out: { id: string; title: string; time: string; content: string }[] = [];

  for (const r of rozdzialy) {
    const src = r.url ?? r.plik; // preferuj url (z bazy), plik to fallback
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

/** Normalizacja z obsługą 'typDokumentu', starego 'typ' i 'dziedzina'. */
function normalizeMeta(id: string, data: DocumentData): InterpretacjaMeta {
  const typDokumentu: DokumentMeta["typDokumentu"] =
    (data.typDokumentu as DokumentMeta["typDokumentu"]) ??
    (typeof data.typ === "string"
      ? (data.typ as DokumentMeta["typDokumentu"])
      : "interpretacja");

  const dziedzina: InterpretacjaDziedzina | undefined =
    typeof data.dziedzina === "string"
      ? (data.dziedzina as InterpretacjaDziedzina)
      : undefined;

  const coverUrl =
    typeof data.coverUrl === "string" && data.coverUrl.length > 0
      ? data.coverUrl
      : undefined;

  const rozdzialy: Rozdzial[] = Array.isArray(data.rozdzialy)
    ? (data.rozdzialy as Rozdzial[])
    : [];

  const motywy: DokumentMeta["motywy"] = Array.isArray(data.motywy)
    ? (data.motywy as DokumentMeta["motywy"])
    : [];

  const motywyIds: MotywId[] = Array.isArray(data.motywyIds)
    ? (data.motywyIds as MotywId[])
    : motywy.map((m) => m.id);

  const epoki: string[] = Array.isArray(data.epoki)
    ? (data.epoki as string[])
    : [];
  const tags: string[] = Array.isArray(data.tags) ? (data.tags as string[]) : [];

  const argumenty: string[] = Array.isArray(data.argumenty)
    ? (data.argumenty as string[])
    : [];
  const cytaty: string[] = Array.isArray(data.cytaty)
    ? (data.cytaty as string[])
    : [];

  return {
    id,
    typDokumentu,
    dziedzina,
    tytul: String(data.tytul ?? ""),
    podtytul: String(data.podtytul ?? ""),
    lektura: String(data.lektura ?? ""),
    autor: String(data.autor ?? ""),
    wspolczesnyAutor: String(data.wspolczesnyAutor ?? ""),
    dataPublikacji: String(data.dataPublikacji ?? ""),
    rozdzialy,
    motywy,
    motywyIds,
    epoki,
    tags,
    czasCzytania: String(data.czasCzytania ?? "~"),
    coverUrl,
    argumenty,
    cytaty,
  };
}
