import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownRight,
  Camera,
  ChevronLeft,
  ChevronRight,
  FileDown,
  ImagePlus,
  LocateFixed,
  Mountain,
  Plus,
  Snowflake,
  Trash2,
  UnfoldVertical,
  Waves,
  type LucideIcon,
} from "lucide-react";
import { Mark } from "@/components/survey/logo";
import { FieldMap } from "@/components/survey/field-map";
import { communeFromLv95 } from "@/lib/releve/commune";
import { groupDigits, inSwitzerland, lv95ToWgs, parseCoord, wgsToLv95 } from "@/lib/releve/coords";
import { deleteReleve, listReleves, rememberRapporteur, rememberedRapporteur, saveReleve } from "@/lib/releve/db";
import { renderTopoPng } from "@/lib/releve/map-snapshot";
import { buildRelevePdf, savePdfFile } from "@/lib/releve/pdf";
import { fileToPhoto } from "@/lib/releve/photos";
import {
  IMPORTANCE,
  MESURES,
  PROCESSUS,
  blankReleve,
  processusById,
  type MesuresId,
  type Photo,
  type ProcessusId,
  type Releve,
} from "@/lib/releve/types";

const STEPS = [
  { title: "Aléa", kicker: "Processus principal" },
  { title: "Lieu", kicker: "Commune et MN95" },
  { title: "Moment", kicker: "Date de l'événement" },
  { title: "Processus", kicker: "Description succincte" },
  { title: "Causes et dégâts", kicker: "Ce qui s'est passé" },
  { title: "Risques", kicker: "Suite possible" },
  { title: "Mesures", kicker: "Première appréciation" },
  { title: "Clôture", kicker: "Rapporteur, photos, PDF" },
];

const ICONS: Record<ProcessusId, LucideIcon> = {
  chute: Mountain,
  effondrement: UnfoldVertical,
  glissement: ArrowDownRight,
  avalanche: Snowflake,
  crue: Waves,
};

const inputClass =
  "w-full rounded-lg border border-line bg-surface px-3 py-3 text-base text-ink outline-none focus-visible:border-pine";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-semibold text-ink">{label}</span>
      {hint ? <span className="mt-1 block text-sm leading-snug text-muted">{hint}</span> : null}
      <div className="mt-2">{children}</div>
    </label>
  );
}

function choiceClass(active: boolean) {
  return active
    ? "border-pine bg-pine text-bg"
    : "border-line bg-surface text-ink hover:border-pine";
}

export function SurveyApp() {
  const [records, setRecords] = useState<Releve[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Releve | null>(null);

  useEffect(() => {
    listReleves()
      .then(setRecords)
      .catch(() => setLoadError("La mémoire de l'appareil n'est pas accessible."));
  }, []);

  useEffect(() => {
    if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  async function openNew() {
    const draft = blankReleve(rememberedRapporteur());
    await saveReleve(draft);
    setRecords((current) => [draft, ...(current ?? [])]);
    setEditing(draft);
  }

  if (loadError) {
    return (
      <Shell>
        <p className="text-base text-ink">{loadError}</p>
      </Shell>
    );
  }

  if (!records) {
    return (
      <Shell>
        <p className="text-base text-muted">Ouverture des relevés…</p>
      </Shell>
    );
  }

  if (editing) {
    return (
      <Wizard
        initial={editing}
        onClose={(latest) => {
          setRecords((current) => replaceRecord(current ?? [], latest));
          setEditing(null);
        }}
        onSaved={(latest) => setRecords((current) => replaceRecord(current ?? [], latest))}
        onDelete={async (id) => {
          await deleteReleve(id);
          setRecords((current) => (current ?? []).filter((item) => item.id !== id));
          setEditing(null);
        }}
      />
    );
  }

  return <Home records={records} onNew={openNew} onOpen={setEditing} onDelete={async (id) => {
    await deleteReleve(id);
    setRecords((current) => (current ?? []).filter((item) => item.id !== id));
  }} />;
}

function replaceRecord(records: Releve[], next: Releve): Releve[] {
  const rest = records.filter((item) => item.id !== next.id);
  return [next, ...rest].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg text-ink">
      <header className="bg-pine pt-safe text-bg">
        <div className="mx-auto flex max-w-xl items-center gap-3 px-4 py-4">
          <Mark className="h-10 w-10 text-bg" />
          <div>
            <p className="font-display text-2xl leading-none">Aléa</p>
            <p className="mt-1 text-sm text-bg/80">Relevés de dangers naturels</p>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-xl px-4 py-6">{children}</main>
    </div>
  );
}

function Home({
  records,
  onNew,
  onOpen,
  onDelete,
}: {
  records: Releve[];
  onNew: () => void;
  onOpen: (releve: Releve) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <Shell>
      <button
        type="button"
        onClick={onNew}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber px-4 py-4 text-base font-semibold text-bg"
      >
        <Plus className="h-5 w-5" aria-hidden="true" />
        Nouveau relevé
      </button>
      <InstallHint />
      <p className="mt-3 text-sm leading-relaxed text-muted">
        Chute de pierre, effondrement, glissement spontané ou avalanche. Le dossier reste sur cet appareil.
      </p>

      {records.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-line bg-surface px-4 py-8 text-center">
          <p className="font-display text-xl text-ink">Aucun relevé</p>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Placez le point sur la carte nationale, joignez les photos, puis exportez le rapport StorMe encore modifiable.
          </p>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {records.map((releve) => (
            <li key={releve.id}>
              <RecordCard releve={releve} onOpen={() => onOpen(releve)} onDelete={() => onDelete(releve.id)} />
            </li>
          ))}
        </ul>
      )}
    </Shell>
  );
}

function RecordCard({
  releve,
  onOpen,
  onDelete,
}: {
  releve: Releve;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const [confirm, setConfirm] = useState(false);
  const option = processusById(releve.processus);
  const Icon = option ? ICONS[option.id] : Mountain;
  return (
    <article className="rounded-xl border border-line bg-surface">
      <button type="button" onClick={onOpen} className="flex w-full items-start gap-3 px-4 py-4 text-left">
        <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-pine text-bg">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <span className="min-w-0">
          <span className="block font-semibold text-ink">{option?.label ?? "Relevé commencé"}</span>
          <span className="mt-1 block text-sm text-muted">
            {[releve.commune || "Commune à préciser", formatListDate(releve.date)].join(" · ")}
          </span>
          <span className="mt-1 block text-sm text-ink">
            {releve.x && releve.y
              ? `X ${groupDigits(releve.x)}  ·  Y ${groupDigits(releve.y)}`
              : "Position pas encore posée"}
            {releve.photos.length > 0 ? `  ·  ${releve.photos.length} photo${releve.photos.length > 1 ? "s" : ""}` : ""}
          </span>
        </span>
      </button>
      <div className="flex justify-end border-t border-line px-3 py-2">
        {confirm ? (
          <div className="flex items-center gap-2">
            <button type="button" className="px-3 py-2 text-sm text-muted" onClick={() => setConfirm(false)}>
              Annuler
            </button>
            <button type="button" className="rounded-lg bg-ink px-3 py-2 text-sm font-semibold text-bg" onClick={onDelete}>
              Supprimer
            </button>
          </div>
        ) : (
          <button type="button" className="inline-flex items-center gap-1 px-3 py-2 text-sm text-muted" onClick={() => setConfirm(true)}>
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Supprimer
          </button>
        )}
      </div>
    </article>
  );
}

function formatListDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return "date à préciser";
  return `${match[3]}.${match[2]}.${match[1]}`;
}

function InstallHint() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [hidden, setHidden] = useState(false);
  const standalone = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(display-mode: standalone)").matches;
  }, []);

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (hidden || standalone) return null;

  return (
    <div className="mb-4 rounded-xl border border-line bg-surface px-4 py-3">
      <p className="text-sm font-semibold text-ink">Installer sur l'écran d'accueil</p>
      <p className="mt-1 text-sm leading-relaxed text-muted">
        Dans le menu du navigateur : « Ajouter à l'écran d'accueil » ou « Installer ». L'icône est le triangle de danger naturel.
      </p>
      <div className="mt-3 flex gap-2">
        {installEvent ? (
          <button
            type="button"
            className="rounded-lg bg-pine px-3 py-2 text-sm font-semibold text-bg"
            onClick={async () => {
              await installEvent.prompt();
              setInstallEvent(null);
              setHidden(true);
            }}
          >
            Installer
          </button>
        ) : null}
        <button type="button" className="px-3 py-2 text-sm text-muted" onClick={() => setHidden(true)}>
          Plus tard
        </button>
      </div>
    </div>
  );
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
}

function Wizard({
  initial,
  onClose,
  onSaved,
  onDelete,
}: {
  initial: Releve;
  onClose: (latest: Releve) => void;
  onSaved: (latest: Releve) => void;
  onDelete: (id: string) => void;
}) {
  const [draft, setDraft] = useState(initial);
  const [step, setStep] = useState(0);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [gpsBusy, setGpsBusy] = useState(false);
  const [communeBusy, setCommuneBusy] = useState(false);
  const [communeNote, setCommuneNote] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [exportState, setExportState] = useState<"idle" | "map" | "pdf" | "done" | "error">("idle");
  const [exportError, setExportError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const latest = useRef(draft);
  latest.current = draft;

  const onSavedRef = useRef(onSaved);
  onSavedRef.current = onSaved;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = { ...latest.current, updatedAt: new Date().toISOString() };
      rememberRapporteur(next.rapporteur);
      saveReleve(next)
        .then(() => onSavedRef.current(next))
        .catch(() => {});
    }, 400);
    return () => window.clearTimeout(timer);
  }, [draft]);

  function patch(partial: Partial<Releve>) {
    setDraft((current) => ({ ...current, ...partial }));
  }

  function setPosition(lat: number, lng: number) {
    const { e, n } = wgsToLv95(lat, lng);
    setGpsError(null);
    setDraft((current) => ({
      ...current,
      lat,
      lng,
      x: String(Math.round(e)),
      y: String(Math.round(n)),
    }));
  }

  function setManualCoord(axis: "x" | "y", raw: string) {
    setDraft((current) => {
      const next = { ...current, [axis]: raw.replace(/[^\d]/g, "") };
      const e = parseCoord(next.x);
      const n = parseCoord(next.y);
      if (e != null && n != null && e > 2_400_000 && n > 1_000_000) {
        const wgs = lv95ToWgs(e, n);
        next.lat = wgs.lat;
        next.lng = wgs.lng;
      }
      return next;
    });
  }

  async function locate() {
    if (!navigator.geolocation) {
      setGpsError("Cet appareil ne fournit pas la position.");
      return;
    }
    setGpsBusy(true);
    setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setPosition(position.coords.latitude, position.coords.longitude);
        setGpsBusy(false);
      },
      () => {
        setGpsBusy(false);
        setGpsError("Position refusée ou indisponible. Placez le point sur la carte, ou saisissez X / Y.");
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }

  async function identifyCommune() {
    const e = parseCoord(draft.x);
    const n = parseCoord(draft.y);
    if (e == null || n == null) {
      setCommuneNote("Posez d'abord la position.");
      return;
    }
    setCommuneBusy(true);
    setCommuneNote(null);
    try {
      const name = await communeFromLv95(e, n);
      if (!name) setCommuneNote("Commune introuvable. Saisissez-la à la main.");
      else patch({ commune: name });
    } catch {
      setCommuneNote("Réseau indisponible. Saisissez la commune.");
    } finally {
      setCommuneBusy(false);
    }
  }

  async function addFiles(files: FileList | null) {
    if (!files?.length) return;
    setPhotoError(null);
    const room = 12 - draft.photos.length;
    if (room <= 0) {
      setPhotoError("Douze photos au maximum par relevé.");
      return;
    }
    const next: Photo[] = [];
    for (const file of Array.from(files).slice(0, room)) {
      try {
        next.push(await fileToPhoto(file));
      } catch {
        setPhotoError("Une photo n'a pas pu être lue. Utilisez un JPG ou un PNG.");
      }
    }
    if (next.length) patch({ photos: [...draft.photos, ...next] });
  }

  const missing = missingBits(draft);
  const east = parseCoord(draft.x);
  const north = parseCoord(draft.y);
  const outside = east != null && north != null && !inSwitzerland(east, north);

  async function exportPdf() {
    if (missing.length) return;
    setExportState("map");
    setExportError(null);
    try {
      const map = draft.lat != null && draft.lng != null ? await renderTopoPng(draft.lat, draft.lng) : null;
      setExportState("pdf");
      const { bytes, filename } = await buildRelevePdf(draft, map);
      savePdfFile(bytes, filename);
      const saved = { ...draft, updatedAt: new Date().toISOString() };
      await saveReleve(saved);
      onSaved(saved);
      setExportState("done");
    } catch (error) {
      setExportState("error");
      setExportError(error instanceof Error ? error.message : "L'export a échoué.");
    }
  }

  const meta = STEPS[step] ?? STEPS[0];

  return (
    <div className="min-h-screen bg-bg text-ink">
      <header className="sticky top-0 z-20 bg-pine pt-safe text-bg">
        <div className="mx-auto flex max-w-xl items-center gap-3 px-3 py-3">
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-lg text-bg"
            onClick={() => onClose({ ...latest.current, updatedAt: new Date().toISOString() })}
            aria-label="Retour à la liste"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase tracking-wide text-bg/70">
              {step + 1} / {STEPS.length} · {meta.kicker}
            </p>
            <h1 className="truncate font-display text-2xl leading-tight">{meta.title}</h1>
          </div>
        </div>
        <div className="mx-auto flex max-w-xl gap-1 px-4 pb-3">
          {STEPS.map((item, index) => (
            <button
              key={item.title}
              type="button"
              aria-label={item.title}
              onClick={() => setStep(index)}
              className={`h-1.5 flex-1 rounded-full ${index <= step ? "bg-amber" : "bg-bg/30"}`}
            />
          ))}
        </div>
      </header>

      <main className="mx-auto max-w-xl space-y-5 px-4 py-5 pb-28">
        {step === 0 ? <StepProcess value={draft.processus} onChange={(processus) => patch({ processus })} /> : null}
        {step === 1 ? (
          <StepPlace
            draft={draft}
            outside={outside}
            gpsBusy={gpsBusy}
            gpsError={gpsError}
            communeBusy={communeBusy}
            communeNote={communeNote}
            onLocate={locate}
            onCommune={identifyCommune}
            onPick={setPosition}
            onCoord={setManualCoord}
            onCommuneText={(commune) => patch({ commune })}
          />
        ) : null}
        {step === 2 ? (
          <div className="space-y-5">
            <Field label="Date" hint="Jour de l'événement, pas forcément celui du relevé.">
              <input className={inputClass} type="date" value={draft.date} onChange={(event) => patch({ date: event.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Heure">
                <input className={inputClass} type="time" value={draft.heure} onChange={(event) => patch({ heure: event.target.value })} />
              </Field>
              <Field label="Durée" hint="Ex. 20 min, 3 h">
                <input className={inputClass} value={draft.duree} onChange={(event) => patch({ duree: event.target.value })} />
              </Field>
            </div>
          </div>
        ) : null}
        {step === 3 ? (
          <Field label="Description succincte du processus" hint="Type, volumes estimés, surfaces, intensité, événement isolé ou fréquent.">
            <textarea className={`${inputClass} min-h-48`} value={draft.description} onChange={(event) => patch({ description: event.target.value })} />
          </Field>
        ) : null}
        {step === 4 ? (
          <div className="space-y-5">
            <Field label="Causes principales" hint="Météorologique, purement naturel, ouvrages, infrastructures insuffisantes…">
              <textarea className={`${inputClass} min-h-36`} value={draft.causes} onChange={(event) => patch({ causes: event.target.value })} />
            </Field>
            <Field label="Description des dégâts" hint="Personnes, biens, infrastructures.">
              <textarea className={`${inputClass} min-h-36`} value={draft.degats} onChange={(event) => patch({ degats: event.target.value })} />
            </Field>
          </div>
        ) : null}
        {step === 5 ? (
          <div className="space-y-5">
            <Field label="Évaluation des risques restants" hint="Un événement similaire peut-il se reproduire ? Une situation dangereuse a-t-elle été créée ?">
              <textarea className={`${inputClass} min-h-40`} value={draft.risques} onChange={(event) => patch({ risques: event.target.value })} />
            </Field>
            <fieldset>
              <legend className="text-sm font-semibold text-ink">Importance de l'événement</legend>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {IMPORTANCE.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={draft.importance === item.id}
                    className={`rounded-xl border px-3 py-3 text-left text-sm font-semibold ${choiceClass(draft.importance === item.id)}`}
                    onClick={() => patch({ importance: draft.importance === item.id ? "" : item.id })}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>
        ) : null}
        {step === 6 ? (
          <div className="space-y-5">
            <fieldset>
              <legend className="text-sm font-semibold text-ink">Mesures</legend>
              <div className="mt-2 space-y-2">
                {MESURES.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={draft.mesures === item.id}
                    className={`w-full rounded-xl border px-3 py-3 text-left text-sm font-semibold ${choiceClass(draft.mesures === item.id)}`}
                    onClick={() => patch({ mesures: draft.mesures === item.id ? "" : (item.id as MesuresId) })}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </fieldset>
            <Field label="Mesures déjà organisées par">
              <input className={inputClass} value={draft.organiseesPar} onChange={(event) => patch({ organiseesPar: event.target.value })} />
            </Field>
            <Field label="Mesures à discuter avec">
              <input className={inputClass} value={draft.discuterAvec} onChange={(event) => patch({ discuterAvec: event.target.value })} />
            </Field>
            <Field label="Propositions de mesures" hint="Assainissement, sécurisation, organisation.">
              <textarea className={`${inputClass} min-h-32`} value={draft.propositions} onChange={(event) => patch({ propositions: event.target.value })} />
            </Field>
            <Field label="Remarques / divers">
              <textarea className={`${inputClass} min-h-28`} value={draft.remarques} onChange={(event) => patch({ remarques: event.target.value })} />
            </Field>
          </div>
        ) : null}
        {step === 7 ? (
          <StepClose
            draft={draft}
            missing={missing}
            photoError={photoError}
            exportState={exportState}
            exportError={exportError}
            confirmDelete={confirmDelete}
            onPatch={patch}
            onAddFiles={addFiles}
            onRemovePhoto={(id) => patch({ photos: draft.photos.filter((photo) => photo.id !== id) })}
            onExport={exportPdf}
            onAskDelete={() => setConfirmDelete(true)}
            onCancelDelete={() => setConfirmDelete(false)}
            onDelete={() => onDelete(draft.id)}
          />
        ) : null}
      </main>

      <footer className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface pb-safe">
        <div className="mx-auto flex max-w-xl gap-2 px-4 py-3">
          <button
            type="button"
            className="inline-flex h-12 flex-1 items-center justify-center gap-1 rounded-xl border border-line text-sm font-semibold text-ink disabled:opacity-40"
            disabled={step === 0}
            onClick={() => setStep((value) => Math.max(0, value - 1))}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            Précédent
          </button>
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              className="inline-flex h-12 flex-1 items-center justify-center gap-1 rounded-xl bg-pine text-sm font-semibold text-bg"
              onClick={() => setStep((value) => Math.min(STEPS.length - 1, value + 1))}
            >
              Suivant
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : (
            <button
              type="button"
              className="inline-flex h-12 flex-1 items-center justify-center gap-1 rounded-xl bg-amber text-sm font-semibold text-bg disabled:opacity-40"
              disabled={missing.length > 0 || exportState === "map" || exportState === "pdf"}
              onClick={exportPdf}
            >
              <FileDown className="h-4 w-4" aria-hidden="true" />
              Exporter le PDF
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}

function missingBits(releve: Releve): string[] {
  const missing: string[] = [];
  if (!releve.processus) missing.push("l'aléa");
  if (!releve.date) missing.push("la date");
  if (!releve.x || !releve.y) missing.push("la position MN95");
  if (!releve.rapporteur.trim()) missing.push("le nom du rapporteur");
  return missing;
}

function StepProcess({ value, onChange }: { value: ProcessusId | ""; onChange: (id: ProcessusId) => void }) {
  const featured = PROCESSUS.filter((item) => item.featured);
  const extra = PROCESSUS.filter((item) => !item.featured);
  return (
    <div className="space-y-3">
      <p className="text-sm leading-relaxed text-muted">Un seul processus principal. Il coche la case correspondante du formulaire fribourgeois.</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {featured.map((item) => {
          const Icon = ICONS[item.id];
          const active = value === item.id;
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(item.id)}
              className={`rounded-xl border px-3 py-4 text-left ${choiceClass(active)}`}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              <span className="mt-3 block text-base font-semibold leading-snug">{item.label}</span>
              <span className={`mt-1 block text-sm ${active ? "text-bg/80" : "text-muted"}`}>{item.hint}</span>
            </button>
          );
        })}
      </div>
      {extra.map((item) => {
        const Icon = ICONS[item.id];
        const active = value === item.id;
        return (
          <button
            key={item.id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(item.id)}
            className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left ${choiceClass(active)}`}
          >
            <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span>
              <span className="block text-sm font-semibold">{item.label}</span>
              <span className={`block text-sm ${active ? "text-bg/80" : "text-muted"}`}>{item.hint}</span>
            </span>
          </button>
        );
      })}
      <p className="text-sm leading-relaxed text-muted">
        Effondrement et chute de pierre cochent tous deux « Chute / éboulement rocheux ». Le type exact est écrit dans la description.
      </p>
    </div>
  );
}

function StepPlace({
  draft,
  outside,
  gpsBusy,
  gpsError,
  communeBusy,
  communeNote,
  onLocate,
  onCommune,
  onPick,
  onCoord,
  onCommuneText,
}: {
  draft: Releve;
  outside: boolean;
  gpsBusy: boolean;
  gpsError: string | null;
  communeBusy: boolean;
  communeNote: string | null;
  onLocate: () => void;
  onCommune: () => void;
  onPick: (lat: number, lng: number) => void;
  onCoord: (axis: "x" | "y", value: string) => void;
  onCommuneText: (value: string) => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed text-muted">
        Touchez la carte nationale pour placer l'aléa. X est la coordonnée vers l'est (E), Y vers le nord (N), en MN95.
      </p>
      <FieldMap lat={draft.lat} lng={draft.lng} onPick={onPick} />
      <button
        type="button"
        onClick={onLocate}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-pine text-sm font-semibold text-pine"
      >
        <LocateFixed className="h-4 w-4" aria-hidden="true" />
        {gpsBusy ? "Recherche de la position…" : "Utiliser ma position"}
      </button>
      {gpsError ? <p className="text-sm text-ink">{gpsError}</p> : null}
      <div className="grid grid-cols-2 gap-3">
        <Field label="X · est (E)">
          <input
            className={inputClass}
            inputMode="numeric"
            value={draft.x}
            onChange={(event) => onCoord("x", event.target.value)}
          />
        </Field>
        <Field label="Y · nord (N)">
          <input
            className={inputClass}
            inputMode="numeric"
            value={draft.y}
            onChange={(event) => onCoord("y", event.target.value)}
          />
        </Field>
      </div>
      {draft.x && draft.y ? (
        <p className="text-sm text-ink">
          {groupDigits(draft.x)} / {groupDigits(draft.y)}
          {outside ? " — hors de l'emprise habituelle de la Suisse." : ""}
        </p>
      ) : null}
      <Field label="Commune">
        <input className={inputClass} value={draft.commune} onChange={(event) => onCommuneText(event.target.value)} />
      </Field>
      <button
        type="button"
        onClick={onCommune}
        className="text-sm font-semibold text-pine"
      >
        {communeBusy ? "Recherche de la commune…" : "Remplir la commune depuis la position"}
      </button>
      {communeNote ? <p className="text-sm text-muted">{communeNote}</p> : null}
    </div>
  );
}

function StepClose({
  draft,
  missing,
  photoError,
  exportState,
  exportError,
  confirmDelete,
  onPatch,
  onAddFiles,
  onRemovePhoto,
  onExport,
  onAskDelete,
  onCancelDelete,
  onDelete,
}: {
  draft: Releve;
  missing: string[];
  photoError: string | null;
  exportState: "idle" | "map" | "pdf" | "done" | "error";
  exportError: string | null;
  confirmDelete: boolean;
  onPatch: (partial: Partial<Releve>) => void;
  onAddFiles: (files: FileList | null) => void;
  onRemovePhoto: (id: string) => void;
  onExport: () => void;
  onAskDelete: () => void;
  onCancelDelete: () => void;
  onDelete: () => void;
}) {
  const urls = usePhotoUrls(draft.photos);
  const option = processusById(draft.processus);
  return (
    <div className="space-y-5">
      <Field label="Nom et fonction du rapporteur">
        <input className={inputClass} autoComplete="name" value={draft.rapporteur} onChange={(event) => onPatch({ rapporteur: event.target.value })} />
      </Field>
      <Field label="Date du rapport">
        <input className={inputClass} type="date" value={draft.dateRapport} onChange={(event) => onPatch({ dateRapport: event.target.value })} />
      </Field>

      <div>
        <p className="text-sm font-semibold text-ink">Photos du processus</p>
        <p className="mt-1 text-sm leading-relaxed text-muted">Elles sont ajoutées en annexe du PDF. Le point 10 du formulaire reste vide.</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <label className="flex h-12 items-center justify-center gap-2 rounded-xl bg-pine text-sm font-semibold text-bg">
            <Camera className="h-4 w-4" aria-hidden="true" />
            Prendre
            <input className="sr-only" type="file" accept="image/*" capture="environment" onChange={(event) => { onAddFiles(event.target.files); event.target.value = ""; }} />
          </label>
          <label className="flex h-12 items-center justify-center gap-2 rounded-xl border border-line text-sm font-semibold text-ink">
            <ImagePlus className="h-4 w-4" aria-hidden="true" />
            Galerie
            <input className="sr-only" type="file" accept="image/*" multiple onChange={(event) => { onAddFiles(event.target.files); event.target.value = ""; }} />
          </label>
        </div>
        {photoError ? <p className="mt-2 text-sm text-ink">{photoError}</p> : null}
        {draft.photos.length > 0 ? (
          <ul className="mt-3 grid grid-cols-3 gap-2">
            {draft.photos.map((photo) => (
              <li key={photo.id} className="relative">
                {urls[photo.id] ? (
                  <img src={urls[photo.id]} alt={photo.name} className="aspect-square w-full rounded-lg object-cover" />
                ) : (
                  <div className="aspect-square w-full rounded-lg bg-line" />
                )}
                <button
                  type="button"
                  aria-label={`Retirer ${photo.name}`}
                  className="absolute right-1 top-1 rounded-md bg-ink/80 px-2 py-1 text-xs text-bg"
                  onClick={() => onRemovePhoto(photo.id)}
                >
                  Retirer
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="rounded-xl border border-line bg-surface px-4 py-4 text-sm leading-relaxed text-ink">
        <p className="font-semibold">{option?.label ?? "Aléa non choisi"}</p>
        <p className="mt-1 text-muted">
          {draft.commune || "Commune non saisie"}
          {draft.x && draft.y ? ` · X ${groupDigits(draft.x)} / Y ${groupDigits(draft.y)}` : ""}
        </p>
        <p className="mt-3">
          Le PDF reprend le formulaire de l'État de Fribourg. Le n° StorMe et le point 10 restent vides, et tous les champs restent modifiables.
          La carte topo et les photos suivent en annexe. Les cases « envoi .shp / .jpg » ne sont pas cochées.
        </p>
        {missing.length > 0 ? (
          <p className="mt-3 font-semibold">Avant l'export, il manque {missing.join(", ")}.</p>
        ) : (
          <p className="mt-3 text-muted">Prêt à exporter.</p>
        )}
        {exportState === "map" ? <p className="mt-2">Préparation de la carte nationale…</p> : null}
        {exportState === "pdf" ? <p className="mt-2">Écriture du rapport…</p> : null}
        {exportState === "done" ? <p className="mt-2">Rapport téléchargé. Vous pouvez encore modifier les champs dans le PDF.</p> : null}
        {exportError ? <p className="mt-2">{exportError}</p> : null}
        <button
          type="button"
          onClick={onExport}
          disabled={missing.length > 0 || exportState === "map" || exportState === "pdf"}
          className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-amber text-sm font-semibold text-bg disabled:opacity-40"
        >
          <FileDown className="h-4 w-4" aria-hidden="true" />
          Exporter le PDF
        </button>
      </div>

      <div className="flex justify-end">
        {confirmDelete ? (
          <div className="flex gap-2">
            <button type="button" className="px-3 py-2 text-sm text-muted" onClick={onCancelDelete}>Annuler</button>
            <button type="button" className="rounded-lg bg-ink px-3 py-2 text-sm font-semibold text-bg" onClick={onDelete}>
              Supprimer ce relevé
            </button>
          </div>
        ) : (
          <button type="button" className="inline-flex items-center gap-1 px-2 py-2 text-sm text-muted" onClick={onAskDelete}>
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Supprimer
          </button>
        )}
      </div>
    </div>
  );
}

function usePhotoUrls(photos: Photo[]) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  useEffect(() => {
    const next: Record<string, string> = {};
    for (const photo of photos) next[photo.id] = URL.createObjectURL(photo.blob);
    setUrls(next);
    return () => {
      for (const url of Object.values(next)) URL.revokeObjectURL(url);
    };
  }, [photos]);
  return urls;
}
