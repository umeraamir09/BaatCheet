const VERIFIER_STORAGE_KEY = "__convexAuthOAuthVerifier";

function verifierStorageKey(): string {
  const ns = import.meta.env.VITE_CONVEX_URL.replace(/[^a-zA-Z0-9]/g, "");
  return `${VERIFIER_STORAGE_KEY}_${ns}`;
}

export function getStoredVerifier(): string | undefined {
  return localStorage.getItem(verifierStorageKey()) ?? undefined;
}

export function setStoredVerifier(verifier: string | undefined): void {
  const key = verifierStorageKey();
  if (verifier) {
    localStorage.setItem(key, verifier);
  } else {
    localStorage.removeItem(key);
  }
}
