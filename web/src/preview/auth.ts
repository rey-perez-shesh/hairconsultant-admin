/**
 * Preview-mode stand-in for "firebase/auth". You start signed in as an admin; signing out shows
 * the login page, where any email and password signs you back in.
 */
const PREVIEW_ADMIN = { uid: "preview-admin", email: "admin@preview.local" };
const SIGNED_OUT_KEY = "hc-preview-signed-out";

type PreviewUser = ReturnType<typeof makeUser>;

function makeUser(email: string) {
  return {
    uid: email === PREVIEW_ADMIN.email ? PREVIEW_ADMIN.uid : `preview-${email}`,
    email,
    emailVerified: true,
    displayName: "Preview Admin",
    getIdToken: async () => "preview-token",
    getIdTokenResult: async () => ({ claims: { admin: true } }),
    reload: async () => {},
  };
}

function startsSignedOut() {
  try {
    return sessionStorage.getItem(SIGNED_OUT_KEY) === "1";
  } catch {
    return false;
  }
}

function rememberSignedOut(signedOut: boolean) {
  try {
    if (signedOut) sessionStorage.setItem(SIGNED_OUT_KEY, "1");
    else sessionStorage.removeItem(SIGNED_OUT_KEY);
  } catch {
    // Storage unavailable: the session just starts signed in next time.
  }
}

const listeners = new Set<(user: PreviewUser | null) => void>();
const auth = {
  currentUser: typeof window !== "undefined" && !startsSignedOut() ? makeUser(PREVIEW_ADMIN.email) : null,
};

function setUser(user: PreviewUser | null) {
  auth.currentUser = user;
  rememberSignedOut(user === null);
  listeners.forEach((listener) => listener(user));
}

export function getAuth() {
  return auth;
}

export function connectAuthEmulator() {}

export function onIdTokenChanged(_auth: unknown, listener: (user: PreviewUser | null) => void) {
  listeners.add(listener);
  setTimeout(() => listeners.has(listener) && listener(auth.currentUser), 0);
  return () => {
    listeners.delete(listener);
  };
}

export const onAuthStateChanged = onIdTokenChanged;

export async function signInWithEmailAndPassword(_auth: unknown, email: string, password: string) {
  await new Promise((resolve) => setTimeout(resolve, 300));
  if (!email || !password) throw new Error("Enter any email and password (preview mode).");
  setUser(makeUser(email));
  return { user: auth.currentUser };
}

export async function signOut() {
  setUser(null);
}

export async function sendEmailVerification() {}

export async function sendPasswordResetEmail() {}
