export type ProcessusId = "chute" | "effondrement" | "glissement" | "avalanche" | "crue";

export type ImportanceId = "negligeable" | "normale" | "exceptionnelle" | "extreme";

export type MesuresId = "pas" | "immediat" | "plustard";

export interface Photo {
  id: string;
  name: string;
  blob: Blob;
}

export interface Releve {
  id: string;
  createdAt: string;
  updatedAt: string;
  processus: ProcessusId | "";
  commune: string;
  x: string;
  y: string;
  lat: number | null;
  lng: number | null;
  date: string;
  heure: string;
  duree: string;
  description: string;
  causes: string;
  degats: string;
  risques: string;
  importance: ImportanceId | "";
  mesures: MesuresId | "";
  organiseesPar: string;
  discuterAvec: string;
  propositions: string;
  remarques: string;
  rapporteur: string;
  dateRapport: string;
  photos: Photo[];
}

export interface ProcessusOption {
  id: ProcessusId;
  label: string;
  hint: string;
  pdf: "Avlanche" | "Glissement" | "Chute" | "Eau";
  featured: boolean;
}

export const PROCESSUS: ProcessusOption[] = [
  {
    id: "chute",
    label: "Chute de pierre / bloc",
    hint: "Blocs isolés, éboulement rocheux",
    pdf: "Chute",
    featured: true,
  },
  {
    id: "effondrement",
    label: "Effondrement",
    hint: "Falaise ou masse qui s’écroule",
    pdf: "Chute",
    featured: true,
  },
  {
    id: "glissement",
    label: "Glissement de terrain spontané",
    hint: "Mouvement de versant",
    pdf: "Glissement",
    featured: true,
  },
  {
    id: "avalanche",
    label: "Avalanche",
    hint: "Neige ou coulée",
    pdf: "Avlanche",
    featured: true,
  },
  {
    id: "crue",
    label: "Crue, inondation, laves torrentielles",
    hint: "Aussi érosion latérale et charriage",
    pdf: "Eau",
    featured: false,
  },
];

export const IMPORTANCE: { id: ImportanceId; label: string; pdf: string }[] = [
  { id: "negligeable", label: "Négligeable", pdf: "Négligeable" },
  { id: "normale", label: "Normale", pdf: "Normale" },
  { id: "exceptionnelle", label: "Exceptionnelle", pdf: "Exceptionnelle" },
  { id: "extreme", label: "Extrême", pdf: "Extrême" },
];

export const MESURES: { id: MesuresId; label: string; pdf: string }[] = [
  { id: "pas", label: "Mesures pas nécessaires", pdf: "Mesures pas nécessaires" },
  { id: "immediat", label: "Mesures nécessaires immédiatement", pdf: "Mesures nécessaires immédietament" },
  { id: "plustard", label: "Mesures nécessaires plus tard", pdf: "Mesures nécessaires plus tard" },
];

export function processusById(id: ProcessusId | ""): ProcessusOption | undefined {
  return PROCESSUS.find((item) => item.id === id);
}

export function blankReleve(rapporteur = ""): Releve {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const heure = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const stamp = now.toISOString();
  return {
    id: crypto.randomUUID(),
    createdAt: stamp,
    updatedAt: stamp,
    processus: "",
    commune: "",
    x: "",
    y: "",
    lat: null,
    lng: null,
    date,
    heure,
    duree: "",
    description: "",
    causes: "",
    degats: "",
    risques: "",
    importance: "",
    mesures: "",
    organiseesPar: "",
    discuterAvec: "",
    propositions: "",
    remarques: "",
    rapporteur,
    dateRapport: date,
    photos: [],
  };
}
