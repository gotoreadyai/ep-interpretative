// src/types/index.ts

export type Epoka = string;
export type MotywId = string;

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

export type ZrodloMeta = {
  id: string;
  typ: "interpretacja";
  tytul: string;
  podtytul: string;
  lektura: string;
  autor: string;
  wspolczesnyAutor: string;
  dataPublikacji: string;

  rozdzialy: Rozdzial[];
  motywy: MotywWZrodle[];
  motywyIds?: MotywId[];

  epoki: Epoka[];
  tags: string[];
  czasCzytania: string;
  coverUrl?: string;

  argumenty?: string[];
  cytaty?: string[];

  /** milisekundy z serverTimestamp (opcjonalnie, używane tylko do sortowania klientowego) */
  createdAtMs?: number;
};

export type InterpretacjaMeta = ZrodloMeta;

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
