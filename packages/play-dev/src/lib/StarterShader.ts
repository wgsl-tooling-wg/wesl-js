/// <reference types="wesl-plugin/suffixes" />
import type { WeslProject } from "wesl";
import project from "../../shaders/main.wesl?link";

export const starterProject: WeslProject = {
  weslSrc: project.weslSrc,
  rootModuleName: project.rootModuleName,
};
