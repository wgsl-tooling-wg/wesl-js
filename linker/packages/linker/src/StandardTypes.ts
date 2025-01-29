export const stdFns = `bitcast all any select arrayLength 
  abs acos acosh asin asinh atan atanh atan2 ceil clamp cos cosh 
  countLeadingZeros countOneBits countTrailingZeros cross 
  degrees determinant distance dot dot4UI8Packed dot4I8Packed 
  exp exp2 extractBits faceForward firstLeadingBit firstTrailingBit 
  floor fma fract frexp inserBits inverseSqrt ldexp length log log2
  max min mix modf normalize pow quantizeToF16 radians reflect refract
  reverseBits round saturate sign sin sinh smoothstep sqrt step tan tanh
  transpose trunc
  dpdx dpdxCoarse dpdxFine dpdy dpdyCoarse dpdyFine fwidth 
  fwdithCoarse fwidthFine
  textureDimensions textureGather textureGatherCompare textureLoad
  textureNumLayers textureNumLevels textureNumSamples
  textureSample textureSampleBias textureSampleCompare textureSampleCompareLevel
  textureSampleGrad textureSampleLevel textureSampleBaseClampToEdge
  textureStore
  atomicLoad atomicStore atomicAdd atomicSub atomicMax atomicMin
  atomicOr atomicXor atomicExchange atomicCompareExchangeWeak
  pack4x8snorm pack4x8unorm pack4xI8 pack4xU8 pack4xI8Clamp pack4xU8Clamp
  pack2x16snorm pack2x16unorm pack2x16float
  unpack4x8snorm unpack4x8unorm unpack4xI8 unpack4xU8 
  unpack2x16snorm unpack2x16unorm unpack2x16float
  storageBarrier textureBarrier workgroupBarrier workgroupUniformLoad
  `.split(/\s+/);

export const sampledTextureTypes = `
  texture_1d texture_2d texture_2d_array texture_3d 
  texture_cube texture_cube_array
`;

export const multisampledTextureTypes = `
  texture_multisampled_2d texture_depth_multisampled_2d
`;

export const textureStorageTypes = `
  texture_storage_1d texture_storage_2d texture_storage_2d_array 
  texture_storage_3d
`;

/** https://www.w3.org/TR/WGSL/#keyword-summary followed by https://www.w3.org/TR/WGSL/#reserved-words */
export const keywords_and_reserved_words = [
  "alias",
  "break",
  "case",
  "const",
  "const_assert",
  "continue",
  "continuing",
  "default",
  "diagnostic",
  "discard",
  "else",
  "enable",
  "false",
  "fn",
  "for",
  "if",
  "let",
  "loop",
  "override",
  "requires",
  "return",
  "struct",
  "switch",
  "true",
  "var",
  "while",
  "NULL",
  "Self",
  "abstract",
  "active",
  "alignas",
  "alignof",
  "as",
  "asm",
  "asm_fragment",
  "async",
  "attribute",
  "auto",
  "await",
  "become",
  "binding_array",
  "cast",
  "catch",
  "class",
  "co_await",
  "co_return",
  "co_yield",
  "coherent",
  "column_major",
  "common",
  "compile",
  "compile_fragment",
  "concept",
  "const_cast",
  "consteval",
  "constexpr",
  "constinit",
  "crate",
  "debugger",
  "decltype",
  "delete",
  "demote",
  "demote_to_helper",
  "do",
  "dynamic_cast",
  "enum",
  "explicit",
  "export",
  "extends",
  "extern",
  "external",
  "fallthrough",
  "filter",
  "final",
  "finally",
  "friend",
  "from",
  "fxgroup",
  "get",
  "goto",
  "groupshared",
  "highp",
  "impl",
  "implements",
  "import",
  "inline",
  "instanceof",
  "interface",
  "layout",
  "lowp",
  "macro",
  "macro_rules",
  "match",
  "mediump",
  "meta",
  "mod",
  "module",
  "move",
  "mut",
  "mutable",
  "namespace",
  "new",
  "nil",
  "noexcept",
  "noinline",
  "nointerpolation",
  "non_coherent",
  "noncoherent",
  "noperspective",
  "null",
  "nullptr",
  "of",
  "operator",
  "package",
  "packoffset",
  "partition",
  "pass",
  "patch",
  "pixelfragment",
  "precise",
  "precision",
  "premerge",
  "priv",
  "protected",
  "pub",
  "public",
  "readonly",
  "ref",
  "regardless",
  "register",
  "reinterpret_cast",
  "require",
  "resource",
  "restrict",
  "self",
  "set",
  "shared",
  "sizeof",
  "smooth",
  "snorm",
  "static",
  "static_assert",
  "static_cast",
  "std",
  "subroutine",
  "super",
  "target",
  "template",
  "this",
  "thread_local",
  "throw",
  "trait",
  "try",
  "type",
  "typedef",
  "typeid",
  "typename",
  "typeof",
  "union",
  "unless",
  "unorm",
  "unsafe",
  "unsized",
  "use",
  "using",
  "varying",
  "virtual",
  "volatile",
  "wgsl",
  "where",
  "with",
  "writeonly",
  "yield",
];

export const stdTypes = `array atomic bool f16 f32 i32 
  mat2x2 mat2x3 mat2x4 mat3x2 mat3x3 mat3x4 mat4x2 mat4x3 mat4x4
  mat2x2f mat2x3f mat2x4f mat3x2f mat3x3f mat3x4f
  mat4x2f mat4x3f mat4x4f
  mat2x2h mat2x3h mat2x4h mat3x2h mat3x3h mat3x4h
  mat4x2h mat4x3h mat4x4h
  u32 vec2 vec3 vec4 ptr
  vec2i vec3i vec4i vec2u vec3u vec4u
  vec2f vec3f vec4f vec2h vec3h vec4h
  ${sampledTextureTypes}
  ${multisampledTextureTypes}
  texture_external
  ${textureStorageTypes}
  texture_depth_2d texture_depth_2d_array texture_depth_cube
  texture_depth_cube_array
  sampler sampler_comparison
  rgba8unorm rgba8snorm rgba8uint rgba8sint
  rgba16uint rgba16sint rgba16float 
  r32uint r32sint r32float rg32uint rg32sint rg32float
  rgba32uint rgba32sint rgba32float
  bgra8unorm 
  function uniform
  `.split(/\s+/); // LATER handle 'function' in template parser?

/* Note the texel formats like rgba8unorm are here because they appear in type position
 in <templates> for texture_storage_* types. 
 (We could parse texture_storage types specially, but user code is unlikely to alias 
  the texture format names with e.g. a 'struct rbga8unorm .)
*/

/** return true if the name is for a built in type (not a user struct) */
export function stdType(name: string): boolean {
  return stdTypes.includes(name);
}

/** return true if the name is for a built in fn (not a user function) */
export function stdFn(name: string): boolean {
  return stdFns.includes(name) || stdType(name);
}
