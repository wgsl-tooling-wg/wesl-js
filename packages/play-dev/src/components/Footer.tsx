import { useState } from "preact/hooks";

const editorVersion = "2026.04";

type Status = "idle" | "copied" | "too-large";

interface Props {
  buildShareUrl(): string | null;
}

export function Footer({ buildShareUrl }: Props) {
  const [status, setStatus] = useState<Status>("idle");

  async function copyLink() {
    const url = buildShareUrl();
    if (!url) {
      setStatus("too-large");
      setTimeout(() => setStatus("idle"), 2500);
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setStatus("copied");
      setTimeout(() => setStatus("idle"), 1500);
    } catch (e) {
      console.warn("clipboard write failed:", e);
    }
  }

  return (
    <footer class="footer">
      <span>Editor: {editorVersion}</span>
      <span>·</span>
      <span>v{__WGSL_PLAY_VERSION__}</span>
      <span>·</span>
      <button type="button" class="copy-link" onClick={copyLink}>
        {label(status)}
      </button>
    </footer>
  );
}

function label(status: Status): string {
  if (status === "copied") return "Copied";
  if (status === "too-large") return "Too large to share";
  return "Copy link";
}
