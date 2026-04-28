/// <reference types="wesl-plugin/suffixes" />
import type { WgslPlay } from "../src/index.ts";
import { expose } from "./Shared.ts";
import mouseConfig from "./shaders/mouse.wesl?link";

const uniformsPlayer = document.querySelector<WgslPlay>("#uniformsPlayer")!;
uniformsPlayer.setUniform("brightness", 0.6);

const mousePlayer = document.querySelector<WgslPlay>("#mousePlayer")!;
mousePlayer.project = mouseConfig;

expose({ uniformsPlayer, mousePlayer, mouseConfig });
