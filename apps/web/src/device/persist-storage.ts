/**
 * Asks the browser to keep this site's storage when space runs low. Without it, Safari may clear
 * a site's data after seven days without a visit.
 */
export async function requestPersistentStorage(): Promise<void> {
  if (!("storage" in navigator) || (await navigator.storage.persisted())) return;
  await navigator.storage.persist();
}
