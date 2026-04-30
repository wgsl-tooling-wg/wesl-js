import "../src/index.ts";
import type { AppearanceChangeDetail } from "../src/AppearancePicker.ts";

const log = document.getElementById("event-log")!;
const picker = document.querySelector("appearance-picker")!;

picker.addEventListener("appearance-change", e => {
  const { preference, resolved } = (e as CustomEvent<AppearanceChangeDetail>)
    .detail;
  log.textContent = `preference=${preference}, resolved=${resolved}`;
});
