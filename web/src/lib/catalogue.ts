"use client";

import { doc, getDoc, writeBatch } from "firebase/firestore";
import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { auditInBatch } from "./admin-api";
import { auth, db, storage } from "./firebase";
import { DEFAULT_GLB_FIT, type ArType, type Haircut } from "./model";

export const MAX_THUMB_BYTES = 3 * 1024 * 1024;
export const MAX_AR_BYTES = 40 * 1024 * 1024;

const THUMB_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

/** Catalog ids follow the app's LENGTH_TEXTURE_suffix convention (e.g. SHORT_WAVY_4). */
export function newHaircutId(length: string, texture: string, name: string): string {
  const slug = name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 32);
  return `${length}_${texture}_${slug || Date.now().toString(36).toUpperCase()}`;
}

export function validateThumbnail(file: File): string | null {
  if (!THUMB_TYPES[file.type]) return "Thumbnail must be a PNG, JPG or WebP image.";
  if (file.size > MAX_THUMB_BYTES) return "Thumbnail must be under 3 MB.";
  return null;
}

export function validateArAsset(file: File, arType: ArType): string | null {
  const name = file.name.toLowerCase();
  if (arType === "DEEPAR" && !name.endsWith(".deepar")) return "DeepAR try-on needs a .deepar effect file.";
  if (arType === "GLB" && !name.endsWith(".glb")) return "3D try-on needs a .glb model file.";
  if (file.size > MAX_AR_BYTES) return "AR files must be under 40 MB.";
  return null;
}

async function removeStorageFile(path: string | null | undefined) {
  if (!path) return;
  await deleteObject(ref(storage, path)).catch(() => undefined);
}

export type HaircutDraft = Omit<Haircut, "updatedBy">;

/**
 * Creates or updates a style: uploads any new thumbnail / AR file under versioned names, writes
 * the document and its audit entry in one batch, then removes the files the new ones replaced.
 */
export async function saveHaircut(
  draft: HaircutDraft,
  options: { isNew: boolean; thumbnail?: File | null; arAsset?: File | null },
): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Not signed in");
  const docRef = doc(db, "haircuts", draft.id);
  if (options.isNew && (await getDoc(docRef)).exists()) {
    throw new Error(`A style with id ${draft.id} already exists — change the name.`);
  }

  const next: Haircut = { ...draft, updatedBy: uid };
  const replacedPaths: (string | null | undefined)[] = [];

  if (options.thumbnail) {
    const ext = THUMB_TYPES[options.thumbnail.type];
    const path = `haircuts/${draft.id}/thumb-${Date.now()}.${ext}`;
    const fileRef = ref(storage, path);
    await uploadBytes(fileRef, options.thumbnail, { contentType: options.thumbnail.type });
    const url = await getDownloadURL(fileRef);
    replacedPaths.push(draft.thumbnailPath);
    // The app displays imageUrl, so an uploaded thumbnail replaces the bundled drawable too.
    Object.assign(next, { thumbnailUrl: url, thumbnailPath: path, imageUrl: url });
  }

  if (options.arAsset && (draft.arType === "DEEPAR" || draft.arType === "GLB")) {
    const version = (draft.arAssetVersion ?? 0) + 1;
    const path =
      draft.arType === "DEEPAR"
        ? `haircuts/${draft.id}/effect-${version}.deepar`
        : `haircuts/${draft.id}/model-${version}.glb`;
    const fileRef = ref(storage, path);
    await uploadBytes(fileRef, options.arAsset, {
      contentType: draft.arType === "GLB" ? "model/gltf-binary" : "application/octet-stream",
    });
    replacedPaths.push(draft.arAssetPath);
    Object.assign(next, {
      arAssetUrl: await getDownloadURL(fileRef),
      arAssetPath: path,
      arAssetKind: draft.arType,
      arAssetVersion: version,
    });
  }

  const batch = writeBatch(db);
  batch.set(docRef, stripUndefined(next));
  auditInBatch(batch, options.isNew ? "haircut.create" : "haircut.update", { haircutId: draft.id, name: draft.name }, {
    thumbnailUploaded: Boolean(options.thumbnail),
    arAssetUploaded: Boolean(options.arAsset),
    isActive: next.isActive,
    arType: next.arType,
  });
  await batch.commit();
  await Promise.all(replacedPaths.filter((p) => p && p !== next.thumbnailPath && p !== next.arAssetPath).map(removeStorageFile));
}

export async function setHaircutActive(haircut: Haircut, isActive: boolean): Promise<void> {
  const uid = auth.currentUser!.uid;
  const batch = writeBatch(db);
  batch.set(doc(db, "haircuts", haircut.id), stripUndefined({ ...haircut, isActive, updatedBy: uid }));
  auditInBatch(batch, isActive ? "haircut.show" : "haircut.hide", { haircutId: haircut.id, name: haircut.name });
  await batch.commit();
}

export async function deleteHaircut(haircut: Haircut): Promise<void> {
  const batch = writeBatch(db);
  batch.delete(doc(db, "haircuts", haircut.id));
  auditInBatch(batch, "haircut.delete", { haircutId: haircut.id, name: haircut.name });
  await batch.commit();
  await Promise.all([removeStorageFile(haircut.thumbnailPath), removeStorageFile(haircut.arAssetPath)]);
}

/** Sort position from the app's original ids (SHORT_WAVY_4 -> 4), keeping today's order. */
function legacySortOrder(id: string): number {
  const suffix = Number(id.split("_").pop());
  return Number.isInteger(suffix) ? suffix : 999;
}

/**
 * One-time upgrade of the documents the old app mirrored from SampleData: adds the fields the
 * dashboard and security rules need. Only fills in what's missing.
 */
export async function upgradeLegacyHaircuts(haircuts: Haircut[]): Promise<number> {
  const uid = auth.currentUser!.uid;
  const legacy = haircuts.filter((h) => typeof h.isActive !== "boolean" || typeof h.sortOrder !== "number" || !h.arType);
  for (let i = 0; i < legacy.length; i += 200) {
    const batch = writeBatch(db);
    legacy.slice(i, i + 200).forEach((h) => {
      batch.set(
        doc(db, "haircuts", h.id),
        stripUndefined({
          ...h,
          description: h.description ?? "",
          imageUrl: h.imageUrl ?? "",
          recommendedFaceShapes: h.recommendedFaceShapes ?? [],
          genderStyle: h.genderStyle ?? "UNISEX",
          treatment: h.treatment ?? "NONE",
          isActive: h.isActive ?? true,
          sortOrder: h.sortOrder ?? legacySortOrder(h.id),
          arType: h.arType ?? "AUTO",
          arAssetVersion: h.arAssetVersion ?? 0,
          glbFit: h.glbFit ?? DEFAULT_GLB_FIT,
          updatedBy: uid,
        }),
      );
    });
    auditInBatch(batch, "haircut.upgradeLegacy", {}, { count: Math.min(200, legacy.length - i) });
    await batch.commit();
  }
  return legacy.length;
}

/**
 * Copies the app's bundled thumbnails (res/drawable/thumb_*.png, picked by the admin) to Storage
 * so the dashboard can show them. imageUrl stays the android.resource:// drawable, which the app
 * still needs for offline display and its 2D try-on overlay.
 */
export async function importBundledThumbnails(
  haircuts: Haircut[],
  files: File[],
  onProgress: (done: number, total: number) => void,
): Promise<{ imported: number; unmatched: string[] }> {
  const uid = auth.currentUser!.uid;
  const byName = new Map(files.map((f) => [f.name.replace(/\.[^.]+$/, ""), f]));
  const targets = haircuts
    .map((h) => ({ h, file: byName.get(h.imageUrl?.split("/drawable/")[1] ?? "") }))
    .filter((t): t is { h: Haircut; file: File } => Boolean(t.file) && !t.h.thumbnailUrl);

  let done = 0;
  for (const { h, file } of targets) {
    const ext = THUMB_TYPES[file.type] ?? "png";
    const path = `haircuts/${h.id}/thumb-${Date.now()}.${ext}`;
    const fileRef = ref(storage, path);
    await uploadBytes(fileRef, file, { contentType: file.type || "image/png" });
    const batch = writeBatch(db);
    batch.set(
      doc(db, "haircuts", h.id),
      stripUndefined({ ...h, thumbnailUrl: await getDownloadURL(fileRef), thumbnailPath: path, updatedBy: uid }),
    );
    auditInBatch(batch, "haircut.importThumbnail", { haircutId: h.id, name: h.name });
    await batch.commit();
    onProgress(++done, targets.length);
  }
  const used = new Set(haircuts.map((h) => h.imageUrl?.split("/drawable/")[1]));
  return { imported: done, unmatched: [...byName.keys()].filter((name) => !used.has(name)) };
}

function stripUndefined<T extends object>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([k, v]) => k !== "id" && v !== undefined)) as T;
}
