import {
  allocateSlot,
  type BufferPayload,
  getOrCreateSessionId,
  getSessionId,
  readLast,
  readSlot,
  setSessionId,
  sweepOldSlots,
  writeSlot,
} from "./Autosave.ts";
import { randomTitle } from "./RandomTitle.ts";
import { decodeFragment } from "./Share.ts";
import { starterProject } from "./StarterShader.ts";

export type StateSource = "url" | "tab" | "last" | "starter";

/** Editor buffer to load on startup, with provenance for telemetry/UX. */
export interface InitialState {
  /** Autosave slot id owned by this tab. */
  sessionId: string;

  /** Project source plus title and savedAt timestamp. */
  payload: BufferPayload;

  /** Which resolution path produced this state. */
  source: StateSource;
}

/**
 * Determine the initial editor buffer.
 * Priority: shared URL fragment > tab's existing slot > most-recent slot > starter shader.
 */
export function resolveInitialState(): InitialState {
  sweepOldSlots();

  const fromUrl = decodeFragment(location.hash);
  if (fromUrl) {
    const payload: BufferPayload = { ...fromUrl, savedAt: Date.now() };
    const sessionId = allocateSlot(payload);
    setSessionId(sessionId);
    history.replaceState(null, "", location.pathname + location.search);
    return { sessionId, payload, source: "url" };
  }

  const existing = getSessionId();
  if (existing) {
    const payload = readSlot(existing);
    if (payload) return { sessionId: existing, payload, source: "tab" };
  }

  const last = readLast();
  if (last) {
    const sessionId = allocateSlot(last);
    setSessionId(sessionId);
    return { sessionId, payload: last, source: "last" };
  }

  const payload: BufferPayload = {
    project: starterProject,
    title: randomTitle(),
    savedAt: Date.now(),
  };
  const sessionId = getOrCreateSessionId();
  writeSlot(sessionId, payload);
  return { sessionId, payload, source: "starter" };
}
