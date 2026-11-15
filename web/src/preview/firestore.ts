/**
 * Preview-mode stand-in for "firebase/firestore" (aliased in next.config.ts). Implements only the
 * calls the dashboard makes, against the in-memory store. Types still come from the real SDK.
 */
import { commit, listDocs, readDoc, subscribe, type Data, type WriteOp } from "./store";
import { Timestamp } from "./timestamp";

export { Timestamp };

const LATENCY_MS = 120;
const DOCUMENT_ID = "__name__";

type DocRef = { type: "document"; id: string; path: string; parent: { path: string } };
type Constraint =
  | { kind: "where"; field: string; op: string; value: unknown }
  | { kind: "orderBy"; field: string; dir: "asc" | "desc" }
  | { kind: "limit"; n: number }
  | { kind: "startAfter"; id: string };
type QueryRef = { type: "query" | "collection"; path: string; id: string; constraints: Constraint[] };

const delay = () => new Promise((resolve) => setTimeout(resolve, LATENCY_MS));
let autoId = 0;

export function getFirestore() {
  return { type: "firestore" };
}

export function connectFirestoreEmulator() {}

function joinPath(parent: unknown, segments: string[]): string {
  const base = parent && typeof parent === "object" && "path" in parent ? String(parent.path) : "";
  return [base, ...segments].filter(Boolean).join("/");
}

function docRef(path: string): DocRef {
  const parts = path.split("/");
  return { type: "document", id: parts[parts.length - 1], path, parent: { path: parts.slice(0, -1).join("/") } };
}

export function collection(parent: unknown, ...segments: string[]): QueryRef {
  const path = joinPath(parent, segments);
  return { type: "collection", path, id: path.split("/").pop()!, constraints: [] };
}

export function doc(parent: unknown, ...segments: string[]): DocRef {
  if (segments.length === 0) {
    autoId += 1;
    segments = [`preview${Date.now().toString(36)}${autoId}`];
  }
  return docRef(joinPath(parent, segments));
}

export const documentId = () => DOCUMENT_ID;
export const where = (field: string, op: string, value: unknown): Constraint => ({ kind: "where", field, op, value });
export const orderBy = (field: string, dir: "asc" | "desc" = "asc"): Constraint => ({ kind: "orderBy", field, dir });
export const limit = (n: number): Constraint => ({ kind: "limit", n });
export const startAfter = (snapshot: { id: string }): Constraint => ({ kind: "startAfter", id: snapshot.id });

export function query(base: QueryRef, ...constraints: Constraint[]): QueryRef {
  return { ...base, type: "query", constraints: [...base.constraints, ...constraints] };
}

export const serverTimestamp = () => Timestamp.now();

const comparable = (value: unknown) => (value instanceof Timestamp ? value.toMillis() : value);

function compare(a: unknown, b: unknown): number {
  const x = comparable(a);
  const y = comparable(b);
  if (x === y) return 0;
  if (x === undefined || x === null) return -1;
  if (y === undefined || y === null) return 1;
  return (x as number) < (y as number) ? -1 : 1;
}

function matches(value: unknown, op: string, target: unknown): boolean {
  const c = compare(value, target);
  switch (op) {
    case "==":
      return c === 0;
    case "!=":
      return c !== 0;
    case "<":
      return c < 0;
    case "<=":
      return c <= 0;
    case ">":
      return c > 0;
    case ">=":
      return c >= 0;
    case "in":
      return Array.isArray(target) && target.some((t) => compare(value, t) === 0);
    case "array-contains":
      return Array.isArray(value) && value.some((v) => compare(v, target) === 0);
    default:
      throw new Error(`Preview mode doesn't support where(..., "${op}", ...)`);
  }
}

function docSnapshot(path: string, data: Data | undefined) {
  const ref = docRef(path);
  return {
    id: ref.id,
    ref,
    exists: () => data !== undefined,
    data: () => (data ? { ...data } : undefined),
    get: (field: string) => data?.[field],
  };
}

function run(q: QueryRef) {
  const field = (row: { id: string; data: Data }, name: string) => (name === DOCUMENT_ID ? row.id : row.data[name]);
  let rows = listDocs(q.path);
  const orders = q.constraints.filter((c) => c.kind === "orderBy");
  for (const c of q.constraints) {
    if (c.kind === "where") rows = rows.filter((row) => matches(field(row, c.field), c.op, c.value));
  }
  // Like Firestore, ordering by a field leaves out documents that don't have it.
  for (const o of orders) rows = rows.filter((row) => field(row, o.field) !== undefined);
  rows.sort((a, b) => {
    for (const o of orders) {
      const c = compare(field(a, o.field), field(b, o.field));
      if (c !== 0) return o.dir === "desc" ? -c : c;
    }
    return a.id.localeCompare(b.id);
  });
  for (const c of q.constraints) {
    if (c.kind === "startAfter") rows = rows.slice(rows.findIndex((row) => row.id === c.id) + 1);
    if (c.kind === "limit") rows = rows.slice(0, c.n);
  }
  const docs = rows.map((row) => docSnapshot(`${q.path}/${row.id}`, row.data));
  return { docs, size: docs.length, empty: docs.length === 0, forEach: (fn: (d: (typeof docs)[number]) => void) => docs.forEach(fn) };
}

function readRef(ref: DocRef) {
  return docSnapshot(ref.path, readDoc(ref.parent.path, ref.id));
}

export async function getDoc(ref: DocRef) {
  await delay();
  return readRef(ref);
}

export async function getDocs(q: QueryRef) {
  await delay();
  return run(q);
}

export async function getCountFromServer(q: QueryRef) {
  await delay();
  const count = run(q).size;
  return { data: () => ({ count }) };
}

export function onSnapshot(
  target: DocRef | QueryRef,
  next: (snapshot: never) => void,
  onError?: (error: Error) => void,
): () => void {
  let active = true;
  const emit = () => {
    if (!active) return;
    try {
      const snapshot = target.type === "document" ? readRef(target) : run(target);
      next(snapshot as never);
    } catch (error) {
      onError?.(error as Error);
    }
  };
  const timer = setTimeout(emit, LATENCY_MS);
  const unsubscribe = subscribe(emit);
  return () => {
    active = false;
    clearTimeout(timer);
    unsubscribe();
  };
}

export function writeBatch() {
  const ops: WriteOp[] = [];
  const target = (ref: DocRef) => ({ collectionPath: ref.parent.path, id: ref.id });
  const batch = {
    set(ref: DocRef, data: Data, options?: { merge?: boolean }) {
      ops.push({ kind: "set", ...target(ref), data, merge: options?.merge });
      return batch;
    },
    update(ref: DocRef, data: Data) {
      ops.push({ kind: "update", ...target(ref), data });
      return batch;
    },
    delete(ref: DocRef) {
      ops.push({ kind: "delete", ...target(ref) });
      return batch;
    },
    async commit() {
      await delay();
      commit(ops);
    },
  };
  return batch;
}
