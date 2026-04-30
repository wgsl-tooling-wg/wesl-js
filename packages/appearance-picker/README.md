# appearance-picker

A standalone custom element `<appearance-picker>` for tri-state
(system / light / dark) appearance switching.

```html
<script type="module">
  import "appearance-picker";
</script>

<appearance-picker></appearance-picker>
```

## Behavior

- **system** — neither button active; resolves via `prefers-color-scheme`
- **light** — sun active, forced light
- **dark** — moon active, forced dark
- Clicking the active button reverts to system

Side effects on change:

- Sets `data-theme="light|dark"` on `<html>` (removed in system mode)
- Persists preference to `localStorage["appearance"]`
- Dispatches `appearance-change`

## Attributes

| attr         | values                              | default        | reflects |
| ------------ | ----------------------------------- | -------------- | -------- |
| `appearance` | `system` / `light` / `dark`         | `system`       | yes      |
| `storage`    | `localStorage` / `cookie` / `none`  | `localStorage` | no       |

## Events

`appearance-change` — fires on user click, on OS scheme change while in
system mode, and once on connect.

```ts
e.detail; // { preference: "system" | "light" | "dark",
          //   resolved:   "light"  | "dark" }
```

## Styling

Shadow DOM. Customize via CSS custom properties on the host:

| property                          | default        |
| --------------------------------- | -------------- |
| `--appearance-picker-color`       | `currentColor` |
| `--appearance-picker-active-color`| `currentColor` |
| `--appearance-picker-active-bg`   | `transparent`  |
| `--appearance-picker-size`        | `16px`         |
| `--appearance-picker-gap`         | `2px`          |

## Exports

- `appearance-picker` — registers the custom element (side-effect import)
- `appearance-picker/element` — `AppearancePicker` class only, no register
