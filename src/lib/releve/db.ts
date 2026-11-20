import type { Releve } from "@/lib/releve/types";

const DB_NAME = "alea-terrain";
const STORE = "releves";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB"));
  });
}

let dbPromise: Promise<IDBDatabase> | null = null;

function db(): Promise<IDBDatabase> {
  if (!dbPromise) dbPromise = openDb();
  return dbPromise;
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB"));
  });
}

export async function listReleves(): Promise<Releve[]> {
  const database = await db();
  const rows = await requestToPromise(database.transaction(STORE, "readonly").objectStore(STORE).getAll());
  return (rows as Releve[]).sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}

export async function saveReleve(releve: Releve): Promise<void> {
  const database = await db();
  await requestToPromise(database.transaction(STORE, "readwrite").objectStore(STORE).put(releve));
}

export async function deleteReleve(id: string): Promise<void> {
  const database = await db();
  await requestToPromise(database.transaction(STORE, "readwrite").objectStore(STORE).delete(id));
}

const RAPPORTEUR_KEY = "alea-rapporteur";

export function rememberedRapporteur(): string {
  try {
    return localStorage.getItem(RAPPORTEUR_KEY) ?? "";
  } catch {
    return "";
  }
}

export function rememberRapporteur(name: string): void {
  try {
    if (name.trim()) localStorage.setItem(RAPPORTEUR_KEY, name.trim());
  } catch {
    /* private mode */
  }
}
