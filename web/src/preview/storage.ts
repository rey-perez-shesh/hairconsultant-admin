/** Preview-mode stand-in for "firebase/storage": uploads become in-browser object URLs. */
const files = new Map<string, string>();

type StorageRef = { fullPath: string };

export function getStorage() {
  return { type: "storage" };
}

export function connectStorageEmulator() {}

export function ref(_storage: unknown, path: string): StorageRef {
  return { fullPath: path };
}

export async function uploadBytes(fileRef: StorageRef, data: Blob) {
  const previous = files.get(fileRef.fullPath);
  if (previous) URL.revokeObjectURL(previous);
  files.set(fileRef.fullPath, URL.createObjectURL(data));
  return { ref: fileRef };
}

export async function getDownloadURL(fileRef: StorageRef) {
  const url = files.get(fileRef.fullPath);
  if (!url) throw new Error(`No preview file at ${fileRef.fullPath}`);
  return url;
}

export async function deleteObject(fileRef: StorageRef) {
  const url = files.get(fileRef.fullPath);
  if (url) URL.revokeObjectURL(url);
  files.delete(fileRef.fullPath);
}
