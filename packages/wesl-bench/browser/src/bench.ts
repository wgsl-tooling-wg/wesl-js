/// <reference types="wesl-plugin/suffixes" />

import { _linkSync } from "wesl";
import linkParams from "../../fixtures/bevy-wgsl/src/shaders/bevy/pbr/environment_map.wesl?link";

const result = _linkSync(linkParams);
document.getElementById("result")!.textContent =
  `Linked ${result.dest.text.length} chars`;
