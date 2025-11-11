// src/types/index.ts

export type Epoka = string;
export type MotywId = string;

/** Główny typ dokumentu (rozszerzalne w przyszłości) */
export type DokumentTyp = "interpretacja";

/** Dziedzina interpretacji (literacka, muzyczna, filmowa, …) */
export type InterpretacjaDziedzina =
  | "literacka"
  | "muzyczna"
  | "filmowa"
  | "teatralna"
  | "inne";

export type Rozdzial = {
  id: string;
  tytul: string;
  czas: string;
  url?: string;
  plik?: string;
  obrazki?: string[];
};

export type MotywWZrodle = {
  id: MotywId;
  pytanie: string;
  fragmenty: string[];
};

/** Główny byt – dokument (np. interpretacja utworu) */
export type DokumentMeta = {
  id: string;

  /** Co to za dokument (tu: „interpretacja”) */
  typDokumentu: DokumentTyp;

  /** Konkretyzacja interpretacji: literacka / muzyczna / filmowa itd. */
  dziedzina?: InterpretacjaDziedzina;

  /** Prezentacja dokumentu */
  tytul: string;
  podtytul: string;

  /** Powiązanie z utworem (lekturą/pozycją klasyczną) */
  lektura: string;
  autor: string;

  /** Opcjonalny „most” do współczesności */
  wspolczesnyAutor: string;

  /** Data publikacji dokumentu (YYYY-MM-DD) */
  dataPublikacji: string;

  /** Zawartość */
  rozdzialy: Rozdzial[];

  /** Powiązania motywów */
  motywy: MotywWZrodle[];
  motywyIds?: MotywId[];

  /** Taksonomie */
  epoki: Epoka[];
  tags: string[];

  /** Prezentacja */
  czasCzytania: string;
  coverUrl?: string;

  /** Dodatki (opcjonalnie) */
  argumenty?: string[];
  cytaty?: string[];

  /** Klientowe sortowanie (opcjonalne) */
  createdAtMs?: number;
};

/** Alias zgodności ze starym nazewnictwem */
export type InterpretacjaMeta = DokumentMeta;

export type MotywDef = {
  id: MotywId;
  nazwa: string;
  pytaniePrzewodnie: string;
  tezaPrzykladowa: string;
  epoki: Epoka[];
  materialy: {
    wspolczesne: { tytul: string; typ: string; opis: string }[];
    klasyczne: { tytul: string; autor: string; opis: string }[];
  };
  argumentyPrzykladowe: string[];
  konteksty?: string[];
  cytaty?: string[];
  ikona?: string;
};
