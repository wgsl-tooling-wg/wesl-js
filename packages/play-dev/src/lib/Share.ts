import LZString from "lz-string";
import type { WeslProject } from "wesl";

const { compressToEncodedURIComponent, decompressFromEncodedURIComponent } =
  LZString;

export interface SharePayload {
  project: WeslProject;
  title: string;
}

export const fragmentPrefix = "v1=";
export const maxTitleLength = 64;
/** Hard cap on the encoded fragment, including the `v1=` prefix. ~32K stays
 *  within Chrome's address-bar comfort zone; lz-string typically yields
 *  ~3-5x compression so this covers ~100-150KB of shader source. */
export const maxFragmentLength = 32_000;

/** Validate a decoded payload's shape and bounds. */
export function isSharePayload(value: unknown): value is SharePayload {
  const v = value as Partial<SharePayload> | null;
  if (!v) return false;
  if (typeof v.title !== "string" || v.title.length > maxTitleLength) {
    return false;
  }
  return isProject(v.project);
}

/** Encode a payload into a `#v1=<lz-string>` fragment. Returns `null` if the
 *  encoded URL would exceed `maxFragmentLength`. */
export function encodeFragment(payload: SharePayload): string | null {
  const json = JSON.stringify(payload);
  const fragment = `#${fragmentPrefix}${compressToEncodedURIComponent(json)}`;
  if (fragment.length > maxFragmentLength) return null;
  return fragment;
}

/** Decode a `#v1=...` fragment string. Returns `null` if missing/invalid. */
export function decodeFragment(hash: string): SharePayload | null {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!raw.startsWith(fragmentPrefix)) return null;
  const compressed = raw.slice(fragmentPrefix.length);
  const json = decompressFromEncodedURIComponent(compressed);
  if (!json) return null;
  try {
    const parsed = JSON.parse(json);
    return isSharePayload(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function isProject(p: unknown): p is WeslProject {
  if (!p || typeof p !== "object") return false;
  return isStringRecord((p as WeslProject).weslSrc);
}

function isStringRecord(v: unknown): v is Record<string, string> {
  if (!v || typeof v !== "object") return false;
  return Object.values(v).every(x => typeof x === "string");
}
