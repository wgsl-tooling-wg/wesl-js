import { useEffect, useRef } from "preact/hooks";
import type { WeslProject } from "wesl";
import type { AutosaveDetail, WgslEdit } from "wgsl-edit/element";

interface Props {
  initial: WeslProject;
  theme: "light" | "dark";
  onAutosave(project: WeslProject): void;
}

export function EditPlay({ initial, theme, onAutosave }: Props) {
  const editorRef = useRef<WgslEdit>(null);
  const onAutosaveRef = useRef(onAutosave);
  onAutosaveRef.current = onAutosave;

  useEffect(() => {
    const el = editorRef.current!;
    el.project = initial;
    const onAutosaveEvent = (e: Event) => {
      const { project } = (e as CustomEvent<AutosaveDetail>).detail;
      onAutosaveRef.current(project);
    };
    el.addEventListener("autosave", onAutosaveEvent);
    return () => el.removeEventListener("autosave", onAutosaveEvent);
  }, []);

  return (
    <div class="editplay-pane">
      <wgsl-edit ref={editorRef} id="editor" theme={theme} lint-from="player" />
      <wgsl-play id="player" from="editor" theme={theme} resizable />
    </div>
  );
}
