import { Title } from "./Title.tsx";

interface Props {
  title: string;
  onTitleCommit(value: string): void;
}

export function TopBar({ title, onTitleCommit }: Props) {
  return (
    <header class="topbar">
      <a class="logo" href="/" aria-label="wgsl-play.dev">
        <img src="/logo-small.png" alt="" />
      </a>
      <Title value={title} onCommit={onTitleCommit} />
      <div class="topbar-spacer" />
      <div class="gallery">
        <button type="button" class="gallery-btn" disabled title="Coming soon">
          Gallery <span aria-hidden="true">▾</span>
        </button>
      </div>
      <appearance-picker />
      <button
        type="button"
        class="save-btn"
        disabled
        title="Sign in (coming soon)"
      >
        Save
      </button>
      <div class="account-slot" />
    </header>
  );
}
