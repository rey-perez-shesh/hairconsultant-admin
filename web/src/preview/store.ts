/**
 * In-memory document store behind the preview fakes of firebase/firestore and firebase/functions
 * (see next.config.ts). It starts empty, so pages show their empty states; anything you create
 * is kept until the page reloads.
 */
export type Data = Record<string, unknown>;

const collections = new Map<string, Map<string, Data>>();
const listeners = new Set<() => void>();

function collectionMap(path: string): Map<string, Data> {
  let docs = collections.get(path);
  if (!docs) {
    docs = new Map();
    collections.set(path, docs);
  }
  return docs;
}

export function readDoc(collectionPath: string, id: string): Data | undefined {
  return collectionMap(collectionPath).get(id);
}

export function listDocs(collectionPath: string): { id: string; data: Data }[] {
  return [...collectionMap(collectionPath)].map(([id, data]) => ({ id, data }));
}

export type WriteOp =
  | { kind: "set"; collectionPath: string; id: string; data: Data; merge?: boolean }
  | { kind: "update"; collectionPath: string; id: string; data: Data }
  | { kind: "delete"; collectionPath: string; id: string };

/** Applies [ops] together, then notifies live listeners. */
export function commit(ops: WriteOp[]) {
  for (const op of ops) {
    const docs = collectionMap(op.collectionPath);
    if (op.kind === "delete") {
      docs.delete(op.id);
    } else if (op.kind === "update") {
      const current = docs.get(op.id);
      if (!current) throw new Error(`No document to update: ${op.collectionPath}/${op.id}`);
      docs.set(op.id, { ...current, ...op.data });
    } else {
      docs.set(op.id, op.merge ? { ...docs.get(op.id), ...op.data } : { ...op.data });
    }
  }
  listeners.forEach((listener) => listener());
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
