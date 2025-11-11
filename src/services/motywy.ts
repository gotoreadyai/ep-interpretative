// src/services/motywy.ts
import {
  addDoc,
  collection,
  getDocs,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import type { MotywDef } from "../types";

const COL = "motywy";

export async function listMotywy(): Promise<MotywDef[]> {
  try {
    const q = query(collection(db, COL), orderBy("nazwa"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => normalize(d.id, d.data()));
  } catch {
    return [];
  }
}

export async function getMotywById(id: string): Promise<MotywDef | null> {
  try {
    const q = query(collection(db, COL));
    const snap = await getDocs(q);
    const found = snap.docs.find((d) => d.id === id);
    return found ? normalize(found.id, found.data()) : null;
  } catch {
    return null;
  }
}

/** SEED – dodaje przykładowe motywy. */
export async function seedMotywyDefaults() {
  const defaults: Omit<MotywDef, "id">[] = [
    {
      nazwa: "Samotność w świecie sukcesu",
      pytaniePrzewodnie: "Czy sukces daje szczęście, jeśli nie ma komu go współdzielić?",
      tezaPrzykladowa: "Sukces bez więzi pogłębia izolację.",
      epoki: ["romantyzm", "pozytywizm", "współczesność"],
      materialy: {
        wspolczesne: [
          { tytul: "Bo Burnham: Inside", typ: "film", opis: "Samotność w erze social mediów" },
          { tytul: "The Weeknd – Save Your Tears", typ: "piosenka", opis: "Maski emocjonalne i pozory szczęścia" },
        ],
        klasyczne: [
          { tytul: "Lalka", autor: "Bolesław Prus", opis: "Wokulski – sukces vs pustka" },
          { tytul: "Dziady III", autor: "Adam Mickiewicz", opis: "Konrad – samotność wybrańca" },
        ],
      },
      argumentyPrzykladowe: [
        "Uwaga społeczna nie zastępuje relacji (wizerunek ≠ więź)",
        "Kariera wymusza role, które izolują od autentyczności",
        "Konsumpcja koi lęk krótkoterminowo (pustka wraca)",
      ],
      konteksty: [
        "Pozytywizm: materializm i pragmatyzm życiowy",
        "Romantyzm: samotność wybrańca",
        "Współczesność: kultura autoprezentacji",
      ],
      cytaty: ["Mam wszystko i mam gówno", "Pozory sukcesu nie zastępują relacji"],
      ikona: "🏙️",
    },
    {
      nazwa: "Pieniądze i wartość człowieka",
      pytaniePrzewodnie: "Czy pieniądze dają władzę nad losem?",
      tezaPrzykladowa: "W świecie konsumpcji moralność staje się towarem.",
      epoki: ["pozytywizm", "współczesność"],
      materialy: {
        wspolczesne: [
          { tytul: "Squid Game", typ: "serial", opis: "Desperacja finansowa i dehumanizacja" },
          { tytul: "Parasite", typ: "film", opis: "Nierówności klasowe i przetrwanie" },
        ],
        klasyczne: [
          { tytul: "Lalka", autor: "Bolesław Prus", opis: "Kupowanie pozycji społecznej" },
          { tytul: "Zbrodnia i kara", autor: "Fiodor Dostojewski", opis: "Raskolnikow i teoria 'nadzwyczajnych'" },
        ],
      },
      argumentyPrzykladowe: [
        "Pieniądz daje pozór kontroli nad życiem",
        "Bogactwo nie gwarantuje szacunku, tylko posłuszeństwo",
        "Biedni płacą nie tylko pieniędzmi, ale godnością",
      ],
      konteksty: [
        "Kapitalizm XIX w. vs współczesny neoliberalizm",
        "Klasa społeczna jako bariera",
      ],
      cytaty: ["Wrócił przez pieniądze. Ale nie przez drzwi. Przez tylne wejście."],
      ikona: "💰",
    },
  ];

  for (const m of defaults) {
    await addDoc(collection(db, COL), { ...m });
  }
}

function normalize(id: string, data: unknown): MotywDef {
  const d = (data ?? {}) as Record<string, unknown>;

  const wsp = Array.isArray((d.materialy as Record<string, unknown> | undefined)?.wspolczesne)
    ? (d.materialy as Record<string, unknown>).wspolczesne as Array<Record<string, unknown>>
    : [];
  const kla = Array.isArray((d.materialy as Record<string, unknown> | undefined)?.klasyczne)
    ? (d.materialy as Record<string, unknown>).klasyczne as Array<Record<string, unknown>>
    : [];

  return {
    id,
    nazwa: String(d.nazwa ?? ""),
    pytaniePrzewodnie: String(d.pytaniePrzewodnie ?? ""),
    tezaPrzykladowa: String(d.tezaPrzykladowa ?? ""),
    epoki: Array.isArray(d.epoki) ? d.epoki.map((x) => String(x)) : [],
    materialy: {
      wspolczesne: wsp.map((m) => ({
        tytul: String(m.tytul ?? ""),
        typ: String(m.typ ?? ""),
        opis: String(m.opis ?? ""),
      })),
      klasyczne: kla.map((m) => ({
        tytul: String(m.tytul ?? ""),
        autor: String(m.autor ?? ""),
        opis: String(m.opis ?? ""),
      })),
    },
    argumentyPrzykladowe: Array.isArray(d.argumentyPrzykladowe)
      ? d.argumentyPrzykladowe.map((x) => String(x))
      : [],
    konteksty: Array.isArray(d.konteksty) ? d.konteksty.map((x) => String(x)) : [],
    cytaty: Array.isArray(d.cytaty) ? d.cytaty.map((x) => String(x)) : [],
    ikona: typeof d.ikona === "string" ? d.ikona : undefined,
  };
}
