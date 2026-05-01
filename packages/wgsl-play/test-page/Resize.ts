import type { WgslPlay } from "../src/index.ts";
import { expose } from "./Shared.ts";

const blockPlayer = document.querySelector<WgslPlay>("#blockPlayer")!;
const flexPlayer = document.querySelector<WgslPlay>("#flexPlayer")!;
const plainPlayer = document.querySelector<WgslPlay>("#plainPlayer")!;

expose({ blockPlayer, flexPlayer, plainPlayer });
