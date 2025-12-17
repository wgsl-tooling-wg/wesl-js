/** Configuration for wgsl-play. */
export interface WgslPlayConfig {
  /** Root path for internal imports (package::, super::). Default: "/shaders" */
  shaderRoot: string;
}

const defaultConfig: WgslPlayConfig = {
  shaderRoot: "/shaders",
};

let globalConfig: WgslPlayConfig = { ...defaultConfig };

/** Set global defaults for all wgsl-play instances. */
export function defaults(config: Partial<WgslPlayConfig>): void {
  globalConfig = { ...globalConfig, ...config };
}

/** Get resolved config, merging element overrides with global defaults. */
export function getConfig(overrides?: Partial<WgslPlayConfig>): WgslPlayConfig {
  return { ...globalConfig, ...overrides };
}

/** Reset config to defaults (useful for testing). */
export function resetConfig(): void {
  globalConfig = { ...defaultConfig };
}
