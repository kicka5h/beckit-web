import { getAuth } from "firebase-admin/auth";

/** A signed-in person allowed to sync. */
export interface Writer {
  readonly uid: string;
  readonly email: string;
}

/** Checks a Firebase ID token; undefined when it is invalid, expired or not allowed in. */
export type VerifyToken = (token: string) => Promise<Writer | undefined>;

/** Parses a comma-separated allowlist of emails, ignoring case and spaces. */
export function toAllowedEmails(list: string): ReadonlySet<string> {
  return new Set(
    list
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter((email) => email !== ""),
  );
}

/**
 * Creates a token check against Firebase Auth that also requires a verified email on the
 * allowlist. Until sharing arrives, only the people listed may sync at all.
 */
export function createFirebaseVerifier(allowedEmails: ReadonlySet<string>): VerifyToken {
  return async (token) => {
    try {
      const { uid, email, email_verified: isVerified } = await getAuth().verifyIdToken(token);
      const normalized = email?.toLowerCase();
      if (!normalized || !isVerified || !allowedEmails.has(normalized)) return undefined;
      return { uid, email: normalized };
    } catch {
      // Expired, revoked or forged tokens are all the same answer: not allowed in.
      return undefined;
    }
  };
}
