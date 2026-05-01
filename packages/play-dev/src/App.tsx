import "appearance-picker";
import "appearance-picker/jsx-preact";
import "wgsl-edit";
import "wgsl-edit/jsx-preact";
import "wgsl-play";
import "wgsl-play/jsx-preact";

import type { AppearanceChangeDetail } from "appearance-picker";
import { useEffect, useRef, useState } from "preact/hooks";
import type { WeslProject } from "wesl";
import { EditPlay } from "./components/EditPlay.tsx";
import { Footer } from "./components/Footer.tsx";
import { TopBar } from "./components/TopBar.tsx";
import { type BufferPayload, readSlot, writeSlot } from "./lib/Autosave.ts";
import { encodeFragment } from "./lib/Share.ts";
import { resolveInitialState } from "./lib/State.ts";

function initialTheme(): "light" | "dark" {
  const attr = document.documentElement.dataset.theme;
  if (attr === "light" || attr === "dark") return attr;
  return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

const initialState = resolveInitialState();

export function App() {
  const [theme, setTheme] = useState<"light" | "dark">(() => initialTheme());
  const [title, setTitle] = useState(initialState.payload.title);
  const sessionId = useRef(initialState.sessionId);
  const buffer = useRef<BufferPayload>(initialState.payload);

  useEffect(() => {
    const onAppearanceChange = (e: Event) =>
      setTheme((e as CustomEvent<AppearanceChangeDetail>).detail.resolved);
    document.addEventListener("appearance-change", onAppearanceChange);
    return () =>
      document.removeEventListener("appearance-change", onAppearanceChange);
  }, []);

  /** Merge fields into the current buffer and persist to the session slot. */
  function persist(patch: Partial<BufferPayload>) {
    const current = readSlot(sessionId.current) ?? buffer.current;
    const next = { ...current, ...patch, savedAt: Date.now() };
    buffer.current = next;
    writeSlot(sessionId.current, next);
  }

  function onAutosave(project: WeslProject) {
    persist({ project });
  }

  function onTitleCommit(value: string) {
    setTitle(value);
    persist({ title: value });
  }

  function buildShareUrl(): string | null {
    const { project, title } = readSlot(sessionId.current) ?? buffer.current;
    const fragment = encodeFragment({ project, title });
    if (!fragment) return null;
    return `${location.origin}${location.pathname}${fragment}`;
  }

  return (
    <>
      <TopBar title={title} onTitleCommit={onTitleCommit} />
      <EditPlay
        initial={initialState.payload.project}
        theme={theme}
        onAutosave={onAutosave}
      />
      <Footer buildShareUrl={buildShareUrl} />
    </>
  );
}
