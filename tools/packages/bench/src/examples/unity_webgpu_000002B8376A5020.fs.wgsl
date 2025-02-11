/** From https://github.com/Unity-Technologies/unity_web_research
MIT License

Copyright (c) 2022 Unity Technologies

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
of the Software, and to permit persons to whom the Software is furnished to do
so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

diagnostic(off, derivative_uniformity);

alias Arr = array<vec4<f32>, 2u>;

struct UnityPerDraw {
  /* @offset(0) */
  unity_ObjectToWorld : mat4x4<f32>,
  /* @offset(64) */
  unity_WorldToObject : mat4x4<f32>,
  /* @offset(128) */
  unity_LODFade : vec4<f32>,
  /* @offset(144) */
  unity_WorldTransformParams : vec4<f32>,
  /* @offset(160) */
  unity_RenderingLayer : vec4<f32>,
  /* @offset(176) */
  unity_LightData : vec4<f32>,
  /* @offset(192) */
  unity_LightIndices : Arr,
  /* @offset(224) */
  unity_ProbesOcclusion : vec4<f32>,
  /* @offset(240) */
  unity_SpecCube0_HDR : vec4<f32>,
  /* @offset(256) */
  unity_SpecCube1_HDR : vec4<f32>,
  /* @offset(272) */
  unity_SpecCube0_BoxMax : vec4<f32>,
  /* @offset(288) */
  unity_SpecCube0_BoxMin : vec4<f32>,
  /* @offset(304) */
  unity_SpecCube0_ProbePosition : vec4<f32>,
  /* @offset(320) */
  unity_SpecCube1_BoxMax : vec4<f32>,
  /* @offset(336) */
  unity_SpecCube1_BoxMin : vec4<f32>,
  /* @offset(352) */
  unity_SpecCube1_ProbePosition : vec4<f32>,
  /* @offset(368) */
  unity_LightmapST : vec4<f32>,
  /* @offset(384) */
  unity_DynamicLightmapST : vec4<f32>,
  /* @offset(400) */
  unity_SHAr : vec4<f32>,
  /* @offset(416) */
  unity_SHAg : vec4<f32>,
  /* @offset(432) */
  unity_SHAb : vec4<f32>,
  /* @offset(448) */
  unity_SHBr : vec4<f32>,
  /* @offset(464) */
  unity_SHBg : vec4<f32>,
  /* @offset(480) */
  unity_SHBb : vec4<f32>,
  /* @offset(496) */
  unity_SHC : vec4<f32>,
  /* @offset(512) */
  unity_RendererBounds_Min : vec4<f32>,
  /* @offset(528) */
  unity_RendererBounds_Max : vec4<f32>,
  /* @offset(544) */
  unity_MatrixPreviousM : mat4x4<f32>,
  /* @offset(608) */
  unity_MatrixPreviousMI : mat4x4<f32>,
  /* @offset(672) */
  unity_MotionVectorsParams : vec4<f32>,
  /* @offset(688) */
  unity_SpriteColor : vec4<f32>,
  /* @offset(704) */
  unity_SpriteProps : vec4<f32>,
}

struct PGlobals {
  /* @offset(0) */
  x_GlobalMipBias : vec2<f32>,
  /* @offset(8) */
  x_AlphaToMaskAvailable : f32,
  /* @offset(16) */
  x_MainLightPosition : vec4<f32>,
  /* @offset(32) */
  x_MainLightColor : vec4<f32>,
  /* @offset(48) */
  x_AdditionalLightsCount : vec4<f32>,
  /* @offset(64) */
  x_WorldSpaceCameraPos : vec3<f32>,
  /* @offset(80) */
  x_ProjectionParams : vec4<f32>,
  /* @offset(96) */
  x_ScreenParams : vec4<f32>,
  /* @offset(112) */
  unity_OrthoParams : vec4<f32>,
  /* @offset(128) */
  unity_FogParams : vec4<f32>,
  /* @offset(144) */
  unity_FogColor : vec4<f32>,
  /* @offset(160) */
  unity_MatrixV : mat4x4<f32>,
}

struct UnityPerMaterial {
  /* @offset(0) */
  Texture2D_B222E8F_TexelSize : vec4<f32>,
  /* @offset(16) */
  Color_C30C7CA3 : vec4<f32>,
  /* @offset(32) */
  Texture2D_D9BFD5F1_TexelSize : vec4<f32>,
}

alias Arr_1 = array<mat4x4<f32>, 5u>;

alias Arr_2 = array<vec4<f32>, 32u>;

alias Arr_3 = array<mat4x4<f32>, 32u>;

alias Arr_4 = array<vec4<f32>, 32u>;

alias Arr_5 = array<mat4x4<f32>, 32u>;

struct LightShadows {
  /* @offset(0) */
  x_MainLightWorldToShadow : Arr_1,
  /* @offset(320) */
  x_CascadeShadowSplitSpheres0 : vec4<f32>,
  /* @offset(336) */
  x_CascadeShadowSplitSpheres1 : vec4<f32>,
  /* @offset(352) */
  x_CascadeShadowSplitSpheres2 : vec4<f32>,
  /* @offset(368) */
  x_CascadeShadowSplitSpheres3 : vec4<f32>,
  /* @offset(384) */
  x_CascadeShadowSplitSphereRadii : vec4<f32>,
  /* @offset(400) */
  x_MainLightShadowOffset0 : vec4<f32>,
  /* @offset(416) */
  x_MainLightShadowOffset1 : vec4<f32>,
  /* @offset(432) */
  x_MainLightShadowParams : vec4<f32>,
  /* @offset(448) */
  x_MainLightShadowmapSize : vec4<f32>,
  /* @offset(464) */
  x_AdditionalShadowOffset0 : vec4<f32>,
  /* @offset(480) */
  x_AdditionalShadowOffset1 : vec4<f32>,
  /* @offset(496) */
  x_AdditionalShadowFadeParams : vec4<f32>,
  /* @offset(512) */
  x_AdditionalShadowmapSize : vec4<f32>,
  /* @offset(528) */
  x_AdditionalShadowParams : Arr_4,
  /* @offset(1040) */
  x_AdditionalLightsWorldToShadow : Arr_5,
}

alias Arr_6 = array<vec4<f32>, 32u>;

struct strided_arr {
  @size(16)
  el : f32,
}

alias Arr_7 = array<strided_arr, 32u>;

alias Arr_8 = array<strided_arr, 32u>;

struct LightCookies {
  /* @offset(0) */
  x_MainLightWorldToLight : mat4x4<f32>,
  /* @offset(64) */
  x_AdditionalLightsCookieEnableBits : f32,
  /* @offset(68) */
  x_MainLightCookieTextureFormat : f32,
  /* @offset(72) */
  x_AdditionalLightsCookieAtlasTextureFormat : f32,
  /* @offset(80) */
  x_AdditionalLightsWorldToLights : Arr_5,
  /* @offset(2128) */
  x_AdditionalLightsCookieAtlasUVRects : Arr_4,
  /* @offset(2640) */
  x_AdditionalLightsLightTypes : Arr_8,
}

alias Arr_9 = array<vec4<f32>, 32u>;

alias Arr_10 = array<vec4<f32>, 32u>;

alias Arr_11 = array<vec4<f32>, 32u>;

alias Arr_12 = array<vec4<f32>, 32u>;

struct AdditionalLights {
  /* @offset(0) */
  x_AdditionalLightsPosition : Arr_4,
  /* @offset(512) */
  x_AdditionalLightsColor : Arr_4,
  /* @offset(1024) */
  x_AdditionalLightsAttenuation : Arr_4,
  /* @offset(1536) */
  x_AdditionalLightsSpotDir : Arr_4,
  /* @offset(2048) */
  x_AdditionalLightsOcclusionProbes : Arr_4,
  /* @offset(2560) */
  x_AdditionalLightsLayerMasks : Arr_8,
}

var<private> u_xlat0 : vec4<f32>;

var<private> vs_INTERP9 : vec3<f32>;

var<private> u_xlatb26 : vec2<bool>;

var<private> vs_INTERP4 : vec4<f32>;

@group(1) @binding(2) var<uniform> x_83 : UnityPerDraw;

var<private> u_xlat26 : vec3<f32>;

var<private> u_xlat1 : vec3<f32>;

var<private> u_xlat2 : vec4<f32>;

var<private> u_xlat3 : vec4<f32>;

var<private> u_xlatb0 : bool;

@group(1) @binding(0) var<uniform> x_149 : PGlobals;

var<private> u_xlat4 : vec3<f32>;

var<private> vs_INTERP8 : vec3<f32>;

var<private> u_xlat79 : f32;

var<private> u_xlat5 : vec4<f32>;

var<private> u_xlat6 : vec4<f32>;

@group(0) @binding(5) var Texture2D_B222E8F : texture_2d<f32>;

@group(0) @binding(11) var samplerTexture2D_B222E8F : sampler;

var<private> vs_INTERP5 : vec4<f32>;

var<private> u_xlat7 : vec3<f32>;

@group(1) @binding(5) var<uniform> x_267 : UnityPerMaterial;

var<private> u_xlat8 : vec4<f32>;

@group(0) @binding(6) var Texture2D_D9BFD5F1 : texture_2d<f32>;

@group(0) @binding(12) var samplerTexture2D_D9BFD5F1 : sampler;

var<private> u_xlat9 : vec4<f32>;

var<private> u_xlat34 : vec3<f32>;

var<private> vs_INTERP6 : vec4<f32>;

@group(1) @binding(3) var<uniform> x_372 : LightShadows;

var<private> u_xlat10 : vec4<f32>;

var<private> u_xlatb2 : vec4<bool>;

var<private> u_xlatu0 : u32;

var<private> u_xlati0 : i32;

var<private> u_xlatb79 : bool;

@group(0) @binding(1) var x_MainLightShadowmapTexture : texture_depth_2d;

@group(0) @binding(9) var sampler_LinearClampCompare : sampler_comparison;

var<private> u_xlatb80 : bool;

var<private> u_xlat55 : vec2<f32>;

var<private> u_xlat62 : vec2<f32>;

var<private> u_xlat11 : vec4<f32>;

var<private> u_xlat12 : vec4<f32>;

var<private> u_xlat13 : vec4<f32>;

var<private> u_xlat14 : vec4<f32>;

var<private> u_xlat15 : vec4<f32>;

var<private> u_xlat16 : vec4<f32>;

var<private> u_xlat80 : f32;

var<private> u_xlat29 : f32;

var<private> u_xlat35 : vec3<f32>;

var<private> u_xlat17 : vec4<f32>;

var<private> u_xlat18 : vec4<f32>;

var<private> u_xlat36 : vec2<f32>;

var<private> u_xlat68 : vec2<f32>;

var<private> u_xlat63 : vec2<f32>;

var<private> u_xlat19 : vec4<f32>;

var<private> u_xlat20 : vec4<f32>;

var<private> u_xlat21 : vec4<f32>;

var<private> u_xlat82 : f32;

var<private> u_xlatb3 : vec4<bool>;

var<private> u_xlatb29 : bool;

var<private> u_xlat27 : vec3<f32>;

var<private> u_xlatu5 : vec3<u32>;

var<private> u_xlatu55 : u32;

var<private> u_xlatu81 : u32;

var<private> u_xlati55 : i32;

var<private> u_xlat81 : f32;

var<private> u_xlatb55 : bool;

var<private> u_xlat52 : vec2<f32>;

var<private> u_xlat78 : f32;

var<private> u_xlat83 : f32;

var<private> u_xlatb84 : bool;

var<private> u_xlat60 : vec2<f32>;

var<private> u_xlat84 : f32;

var<private> u_xlat85 : f32;

var<private> u_xlat28 : vec3<f32>;

var<private> u_xlat54 : f32;

var<private> u_xlatb28 : vec2<bool>;

@group(1) @binding(4) var<uniform> x_3517 : LightCookies;

@group(0) @binding(3) var x_MainLightCookieTexture : texture_2d<f32>;

@group(0) @binding(10) var sampler_MainLightCookieTexture : sampler;

@group(0) @binding(0) var unity_SpecCube0 : texture_cube<f32>;

@group(0) @binding(7) var samplerunity_SpecCube0 : sampler;

var<private> u_xlatu84 : u32;

var<private> u_xlati85 : i32;

var<private> u_xlati84 : i32;

@group(1) @binding(1) var<uniform> x_4007 : AdditionalLights;

var<private> u_xlat86 : f32;

var<private> u_xlat87 : f32;

var<private> u_xlati87 : i32;

var<private> u_xlatb88 : bool;

var<private> u_xlatb11 : vec4<bool>;

var<private> u_xlat89 : f32;

var<private> u_xlat37 : vec3<f32>;

var<private> u_xlat88 : f32;

var<private> u_xlatb87 : bool;

@group(0) @binding(2) var x_AdditionalLightsShadowmapTexture : texture_depth_2d;

var<private> u_xlat64 : vec2<f32>;

var<private> u_xlat66 : vec2<f32>;

var<private> u_xlat39 : vec3<f32>;

var<private> u_xlat22 : vec4<f32>;

var<private> u_xlat40 : vec2<f32>;

var<private> u_xlat72 : vec2<f32>;

var<private> u_xlat67 : vec2<f32>;

var<private> u_xlat23 : vec4<f32>;

var<private> u_xlat24 : vec4<f32>;

var<private> u_xlat25 : vec4<f32>;

var<private> u_xlati88 : i32;

var<private> u_xlati11 : i32;

var<private> u_xlati37 : i32;

var<private> u_xlatb37 : vec3<bool>;

@group(0) @binding(4) var x_AdditionalLightsCookieAtlasTexture : texture_2d<f32>;

@group(0) @binding(8) var sampler_LinearClamp : sampler;

var<private> SV_Target0 : vec4<f32>;

var<private> gl_FragCoord : vec4<f32>;

var<private> u_xlatu2 : u32;

fn int_bitfieldInsert_i1_i1_i1_i1_(base : ptr<function, i32>, insert : ptr<function, i32>, offset_1 : ptr<function, i32>, bits : ptr<function, i32>) -> i32 {
  var mask : u32;
  let x_19 : i32 = *(bits);
  let x_23 : i32 = *(offset_1);
  mask = (~((4294967295u << bitcast<u32>(x_19))) << bitcast<u32>(x_23));
  let x_26 : i32 = *(base);
  let x_28 : u32 = mask;
  let x_31 : i32 = *(insert);
  let x_33 : i32 = *(offset_1);
  let x_36 : u32 = mask;
  return bitcast<i32>(((bitcast<u32>(x_26) & ~(x_28)) | ((bitcast<u32>(x_31) << bitcast<u32>(x_33)) & x_36)));
}

fn main_1() {
  var x_189 : vec3<f32>;
  var txVec0 : vec3<f32>;
  var txVec1 : vec3<f32>;
  var txVec2 : vec3<f32>;
  var txVec3 : vec3<f32>;
  var txVec4 : vec3<f32>;
  var txVec5 : vec3<f32>;
  var txVec6 : vec3<f32>;
  var txVec7 : vec3<f32>;
  var txVec8 : vec3<f32>;
  var txVec9 : vec3<f32>;
  var txVec10 : vec3<f32>;
  var txVec11 : vec3<f32>;
  var txVec12 : vec3<f32>;
  var txVec13 : vec3<f32>;
  var txVec14 : vec3<f32>;
  var txVec15 : vec3<f32>;
  var txVec16 : vec3<f32>;
  var txVec17 : vec3<f32>;
  var txVec18 : vec3<f32>;
  var txVec19 : vec3<f32>;
  var txVec20 : vec3<f32>;
  var txVec21 : vec3<f32>;
  var txVec22 : vec3<f32>;
  var txVec23 : vec3<f32>;
  var txVec24 : vec3<f32>;
  var txVec25 : vec3<f32>;
  var txVec26 : vec3<f32>;
  var txVec27 : vec3<f32>;
  var txVec28 : vec3<f32>;
  var txVec29 : vec3<f32>;
  var x_1876 : f32;
  var param : i32;
  var param_1 : i32;
  var param_2 : i32;
  var param_3 : i32;
  var x_2001 : f32;
  var x_2055 : f32;
  var txVec30 : vec3<f32>;
  var txVec31 : vec3<f32>;
  var txVec32 : vec3<f32>;
  var txVec33 : vec3<f32>;
  var txVec34 : vec3<f32>;
  var txVec35 : vec3<f32>;
  var txVec36 : vec3<f32>;
  var txVec37 : vec3<f32>;
  var txVec38 : vec3<f32>;
  var txVec39 : vec3<f32>;
  var txVec40 : vec3<f32>;
  var txVec41 : vec3<f32>;
  var txVec42 : vec3<f32>;
  var txVec43 : vec3<f32>;
  var txVec44 : vec3<f32>;
  var txVec45 : vec3<f32>;
  var txVec46 : vec3<f32>;
  var txVec47 : vec3<f32>;
  var txVec48 : vec3<f32>;
  var txVec49 : vec3<f32>;
  var txVec50 : vec3<f32>;
  var txVec51 : vec3<f32>;
  var txVec52 : vec3<f32>;
  var txVec53 : vec3<f32>;
  var txVec54 : vec3<f32>;
  var txVec55 : vec3<f32>;
  var txVec56 : vec3<f32>;
  var txVec57 : vec3<f32>;
  var txVec58 : vec3<f32>;
  var txVec59 : vec3<f32>;
  var x_3463 : f32;
  var x_3599 : f32;
  var x_3610 : vec3<f32>;
  var u_xlatu_loop_1 : u32;
  var indexable : array<vec4<u32>, 4u>;
  var x_4145 : f32;
  var x_4156 : f32;
  var txVec60 : vec3<f32>;
  var txVec61 : vec3<f32>;
  var txVec62 : vec3<f32>;
  var txVec63 : vec3<f32>;
  var txVec64 : vec3<f32>;
  var txVec65 : vec3<f32>;
  var txVec66 : vec3<f32>;
  var txVec67 : vec3<f32>;
  var txVec68 : vec3<f32>;
  var txVec69 : vec3<f32>;
  var txVec70 : vec3<f32>;
  var txVec71 : vec3<f32>;
  var txVec72 : vec3<f32>;
  var txVec73 : vec3<f32>;
  var txVec74 : vec3<f32>;
  var txVec75 : vec3<f32>;
  var txVec76 : vec3<f32>;
  var txVec77 : vec3<f32>;
  var txVec78 : vec3<f32>;
  var txVec79 : vec3<f32>;
  var txVec80 : vec3<f32>;
  var txVec81 : vec3<f32>;
  var txVec82 : vec3<f32>;
  var txVec83 : vec3<f32>;
  var txVec84 : vec3<f32>;
  var txVec85 : vec3<f32>;
  var txVec86 : vec3<f32>;
  var txVec87 : vec3<f32>;
  var txVec88 : vec3<f32>;
  var txVec89 : vec3<f32>;
  var x_5771 : f32;
  var x_5784 : f32;
  var x_5842 : f32;
  var x_5853 : vec3<f32>;
  var u_xlat_precise_vec4 : vec4<f32>;
  var u_xlat_precise_ivec4 : vec4<i32>;
  var u_xlat_precise_bvec4 : vec4<bool>;
  var u_xlat_precise_uvec4 : vec4<u32>;
  let x_49 : vec3<f32> = vs_INTERP9;
  let x_50 : vec3<f32> = vs_INTERP9;
  u_xlat0.x = dot(x_49, x_50);
  let x_56 : f32 = u_xlat0.x;
  u_xlat0.x = sqrt(x_56);
  let x_61 : f32 = u_xlat0.x;
  u_xlat0.x = (1.0f / x_61);
  let x_74 : f32 = vs_INTERP4.w;
  u_xlatb26.x = (0.0f < x_74);
  let x_87 : f32 = x_83.unity_WorldTransformParams.w;
  u_xlatb26.y = (x_87 >= 0.0f);
  let x_94 : bool = u_xlatb26.x;
  u_xlat26.x = select(-1.0f, 1.0f, x_94);
  let x_99 : bool = u_xlatb26.y;
  u_xlat26.y = select(-1.0f, 1.0f, x_99);
  let x_103 : f32 = u_xlat26.y;
  let x_105 : f32 = u_xlat26.x;
  u_xlat26.x = (x_103 * x_105);
  let x_109 : vec4<f32> = vs_INTERP4;
  let x_111 : vec3<f32> = vs_INTERP9;
  u_xlat1 = (vec3<f32>(x_109.y, x_109.z, x_109.x) * vec3<f32>(x_111.z, x_111.x, x_111.y));
  let x_114 : vec3<f32> = vs_INTERP9;
  let x_116 : vec4<f32> = vs_INTERP4;
  let x_119 : vec3<f32> = u_xlat1;
  u_xlat1 = ((vec3<f32>(x_114.y, x_114.z, x_114.x) * vec3<f32>(x_116.z, x_116.x, x_116.y)) + -(x_119));
  let x_122 : vec3<f32> = u_xlat26;
  let x_124 : vec3<f32> = u_xlat1;
  u_xlat26 = (vec3<f32>(x_122.x, x_122.x, x_122.x) * x_124);
  let x_126 : vec4<f32> = u_xlat0;
  let x_128 : vec3<f32> = vs_INTERP9;
  u_xlat1 = (vec3<f32>(x_126.x, x_126.x, x_126.x) * x_128);
  let x_131 : vec4<f32> = u_xlat0;
  let x_133 : vec4<f32> = vs_INTERP4;
  let x_135 : vec3<f32> = (vec3<f32>(x_131.x, x_131.x, x_131.x) * vec3<f32>(x_133.x, x_133.y, x_133.z));
  let x_136 : vec4<f32> = u_xlat2;
  u_xlat2 = vec4<f32>(x_135.x, x_135.y, x_135.z, x_136.w);
  let x_139 : vec3<f32> = u_xlat26;
  let x_140 : vec4<f32> = u_xlat0;
  let x_142 : vec3<f32> = (x_139 * vec3<f32>(x_140.x, x_140.x, x_140.x));
  let x_143 : vec4<f32> = u_xlat3;
  u_xlat3 = vec4<f32>(x_142.x, x_142.y, x_142.z, x_143.w);
  let x_152 : f32 = x_149.unity_OrthoParams.w;
  u_xlatb0 = (x_152 == 0.0f);
  let x_156 : vec3<f32> = vs_INTERP8;
  let x_161 : vec3<f32> = x_149.x_WorldSpaceCameraPos;
  u_xlat4 = (-(x_156) + x_161);
  let x_164 : vec3<f32> = u_xlat4;
  let x_165 : vec3<f32> = u_xlat4;
  u_xlat79 = dot(x_164, x_165);
  let x_167 : f32 = u_xlat79;
  u_xlat79 = inverseSqrt(x_167);
  let x_169 : f32 = u_xlat79;
  let x_171 : vec3<f32> = u_xlat4;
  u_xlat4 = (vec3<f32>(x_169, x_169, x_169) * x_171);
  let x_177 : f32 = x_149.unity_MatrixV[0i].z;
  u_xlat5.x = x_177;
  let x_181 : f32 = x_149.unity_MatrixV[1i].z;
  u_xlat5.y = x_181;
  let x_185 : f32 = x_149.unity_MatrixV[2i].z;
  u_xlat5.z = x_185;
  let x_187 : bool = u_xlatb0;
  if (x_187) {
    let x_192 : vec3<f32> = u_xlat4;
    x_189 = x_192;
  } else {
    let x_194 : vec4<f32> = u_xlat5;
    x_189 = vec3<f32>(x_194.x, x_194.y, x_194.z);
  }
  let x_196 : vec3<f32> = x_189;
  u_xlat4 = x_196;
  let x_197 : vec3<f32> = u_xlat4;
  let x_201 : vec4<f32> = x_83.unity_WorldToObject[1i];
  let x_203 : vec3<f32> = (vec3<f32>(x_197.y, x_197.y, x_197.y) * vec3<f32>(x_201.x, x_201.y, x_201.z));
  let x_204 : vec4<f32> = u_xlat5;
  u_xlat5 = vec4<f32>(x_203.x, x_203.y, x_203.z, x_204.w);
  let x_207 : vec4<f32> = x_83.unity_WorldToObject[0i];
  let x_209 : vec3<f32> = u_xlat4;
  let x_212 : vec4<f32> = u_xlat5;
  let x_214 : vec3<f32> = ((vec3<f32>(x_207.x, x_207.y, x_207.z) * vec3<f32>(x_209.x, x_209.x, x_209.x)) + vec3<f32>(x_212.x, x_212.y, x_212.z));
  let x_215 : vec4<f32> = u_xlat5;
  u_xlat5 = vec4<f32>(x_214.x, x_214.y, x_214.z, x_215.w);
  let x_218 : vec4<f32> = x_83.unity_WorldToObject[2i];
  let x_220 : vec3<f32> = u_xlat4;
  let x_223 : vec4<f32> = u_xlat5;
  let x_225 : vec3<f32> = ((vec3<f32>(x_218.x, x_218.y, x_218.z) * vec3<f32>(x_220.z, x_220.z, x_220.z)) + vec3<f32>(x_223.x, x_223.y, x_223.z));
  let x_226 : vec4<f32> = u_xlat5;
  u_xlat5 = vec4<f32>(x_225.x, x_225.y, x_225.z, x_226.w);
  let x_228 : vec4<f32> = u_xlat5;
  let x_230 : vec4<f32> = u_xlat5;
  u_xlat0.x = dot(vec3<f32>(x_228.x, x_228.y, x_228.z), vec3<f32>(x_230.x, x_230.y, x_230.z));
  let x_235 : f32 = u_xlat0.x;
  u_xlat0.x = inverseSqrt(x_235);
  let x_238 : vec4<f32> = u_xlat0;
  let x_240 : vec4<f32> = u_xlat5;
  let x_242 : vec3<f32> = (vec3<f32>(x_238.x, x_238.x, x_238.x) * vec3<f32>(x_240.x, x_240.y, x_240.z));
  let x_243 : vec4<f32> = u_xlat5;
  u_xlat5 = vec4<f32>(x_242.x, x_242.y, x_242.z, x_243.w);
  let x_257 : vec4<f32> = vs_INTERP5;
  let x_260 : f32 = x_149.x_GlobalMipBias.x;
  let x_261 : vec4<f32> = textureSampleBias(Texture2D_B222E8F, samplerTexture2D_B222E8F, vec2<f32>(x_257.x, x_257.y), x_260);
  u_xlat6 = x_261;
  let x_263 : vec4<f32> = u_xlat6;
  let x_269 : vec4<f32> = x_267.Color_C30C7CA3;
  u_xlat7 = (vec3<f32>(x_263.x, x_263.y, x_263.z) * vec3<f32>(x_269.x, x_269.y, x_269.z));
  let x_278 : vec4<f32> = vs_INTERP5;
  let x_281 : f32 = x_149.x_GlobalMipBias.x;
  let x_282 : vec4<f32> = textureSampleBias(Texture2D_D9BFD5F1, samplerTexture2D_D9BFD5F1, vec2<f32>(x_278.x, x_278.y), x_281);
  u_xlat8 = vec4<f32>(x_282.w, x_282.x, x_282.y, x_282.z);
  let x_285 : vec4<f32> = u_xlat8;
  u_xlat9 = ((vec4<f32>(x_285.y, x_285.z, x_285.w, x_285.x) * vec4<f32>(2.0f, 2.0f, 2.0f, 2.0f)) + vec4<f32>(-1.0f, -1.0f, -1.0f, -1.0f));
  let x_292 : vec4<f32> = u_xlat9;
  let x_293 : vec4<f32> = u_xlat9;
  u_xlat0.x = dot(x_292, x_293);
  let x_297 : f32 = u_xlat0.x;
  u_xlat0.x = inverseSqrt(x_297);
  let x_301 : vec4<f32> = u_xlat0;
  let x_303 : vec4<f32> = u_xlat9;
  u_xlat34 = (vec3<f32>(x_301.x, x_301.x, x_301.x) * vec3<f32>(x_303.x, x_303.y, x_303.z));
  let x_308 : f32 = vs_INTERP6.y;
  u_xlat0.x = (x_308 * 200.0f);
  let x_313 : f32 = u_xlat0.x;
  u_xlat0.x = min(x_313, 1.0f);
  let x_316 : vec4<f32> = u_xlat0;
  let x_318 : vec4<f32> = u_xlat6;
  let x_320 : vec3<f32> = (vec3<f32>(x_316.x, x_316.x, x_316.x) * vec3<f32>(x_318.x, x_318.y, x_318.z));
  let x_321 : vec4<f32> = u_xlat6;
  u_xlat6 = vec4<f32>(x_320.x, x_320.y, x_320.z, x_321.w);
  let x_323 : vec4<f32> = u_xlat3;
  let x_325 : vec3<f32> = u_xlat34;
  let x_327 : vec3<f32> = (vec3<f32>(x_323.x, x_323.y, x_323.z) * vec3<f32>(x_325.y, x_325.y, x_325.y));
  let x_328 : vec4<f32> = u_xlat3;
  u_xlat3 = vec4<f32>(x_327.x, x_327.y, x_327.z, x_328.w);
  let x_330 : vec3<f32> = u_xlat34;
  let x_332 : vec4<f32> = u_xlat2;
  let x_335 : vec4<f32> = u_xlat3;
  let x_337 : vec3<f32> = ((vec3<f32>(x_330.x, x_330.x, x_330.x) * vec3<f32>(x_332.x, x_332.y, x_332.z)) + vec3<f32>(x_335.x, x_335.y, x_335.z));
  let x_338 : vec4<f32> = u_xlat2;
  u_xlat2 = vec4<f32>(x_337.x, x_337.y, x_337.z, x_338.w);
  let x_340 : vec3<f32> = u_xlat34;
  let x_342 : vec3<f32> = u_xlat1;
  let x_344 : vec4<f32> = u_xlat2;
  u_xlat1 = ((vec3<f32>(x_340.z, x_340.z, x_340.z) * x_342) + vec3<f32>(x_344.x, x_344.y, x_344.z));
  let x_347 : vec3<f32> = u_xlat1;
  let x_348 : vec3<f32> = u_xlat1;
  u_xlat0.x = dot(x_347, x_348);
  let x_352 : f32 = u_xlat0.x;
  u_xlat0.x = max(x_352, 1.17549435e-38f);
  let x_357 : f32 = u_xlat0.x;
  u_xlat0.x = inverseSqrt(x_357);
  let x_360 : vec4<f32> = u_xlat0;
  let x_362 : vec3<f32> = u_xlat1;
  u_xlat1 = (vec3<f32>(x_360.x, x_360.x, x_360.x) * x_362);
  let x_364 : vec3<f32> = vs_INTERP8;
  let x_374 : vec4<f32> = x_372.x_CascadeShadowSplitSpheres0;
  let x_377 : vec3<f32> = (x_364 + -(vec3<f32>(x_374.x, x_374.y, x_374.z)));
  let x_378 : vec4<f32> = u_xlat2;
  u_xlat2 = vec4<f32>(x_377.x, x_377.y, x_377.z, x_378.w);
  let x_380 : vec3<f32> = vs_INTERP8;
  let x_382 : vec4<f32> = x_372.x_CascadeShadowSplitSpheres1;
  let x_385 : vec3<f32> = (x_380 + -(vec3<f32>(x_382.x, x_382.y, x_382.z)));
  let x_386 : vec4<f32> = u_xlat3;
  u_xlat3 = vec4<f32>(x_385.x, x_385.y, x_385.z, x_386.w);
  let x_388 : vec3<f32> = vs_INTERP8;
  let x_390 : vec4<f32> = x_372.x_CascadeShadowSplitSpheres2;
  let x_393 : vec3<f32> = (x_388 + -(vec3<f32>(x_390.x, x_390.y, x_390.z)));
  let x_394 : vec4<f32> = u_xlat9;
  u_xlat9 = vec4<f32>(x_393.x, x_393.y, x_393.z, x_394.w);
  let x_397 : vec3<f32> = vs_INTERP8;
  let x_400 : vec4<f32> = x_372.x_CascadeShadowSplitSpheres3;
  let x_403 : vec3<f32> = (x_397 + -(vec3<f32>(x_400.x, x_400.y, x_400.z)));
  let x_404 : vec4<f32> = u_xlat10;
  u_xlat10 = vec4<f32>(x_403.x, x_403.y, x_403.z, x_404.w);
  let x_406 : vec4<f32> = u_xlat2;
  let x_408 : vec4<f32> = u_xlat2;
  u_xlat2.x = dot(vec3<f32>(x_406.x, x_406.y, x_406.z), vec3<f32>(x_408.x, x_408.y, x_408.z));
  let x_412 : vec4<f32> = u_xlat3;
  let x_414 : vec4<f32> = u_xlat3;
  u_xlat2.y = dot(vec3<f32>(x_412.x, x_412.y, x_412.z), vec3<f32>(x_414.x, x_414.y, x_414.z));
  let x_418 : vec4<f32> = u_xlat9;
  let x_420 : vec4<f32> = u_xlat9;
  u_xlat2.z = dot(vec3<f32>(x_418.x, x_418.y, x_418.z), vec3<f32>(x_420.x, x_420.y, x_420.z));
  let x_424 : vec4<f32> = u_xlat10;
  let x_426 : vec4<f32> = u_xlat10;
  u_xlat2.w = dot(vec3<f32>(x_424.x, x_424.y, x_424.z), vec3<f32>(x_426.x, x_426.y, x_426.z));
  let x_433 : vec4<f32> = u_xlat2;
  let x_435 : vec4<f32> = x_372.x_CascadeShadowSplitSphereRadii;
  u_xlatb2 = (x_433 < x_435);
  let x_438 : bool = u_xlatb2.x;
  u_xlat3.x = select(0.0f, 1.0f, x_438);
  let x_442 : bool = u_xlatb2.y;
  u_xlat3.y = select(0.0f, 1.0f, x_442);
  let x_446 : bool = u_xlatb2.z;
  u_xlat3.z = select(0.0f, 1.0f, x_446);
  let x_450 : bool = u_xlatb2.w;
  u_xlat3.w = select(0.0f, 1.0f, x_450);
  let x_454 : bool = u_xlatb2.x;
  u_xlat2.x = select(-0.0f, -1.0f, x_454);
  let x_459 : bool = u_xlatb2.y;
  u_xlat2.y = select(-0.0f, -1.0f, x_459);
  let x_463 : bool = u_xlatb2.z;
  u_xlat2.z = select(-0.0f, -1.0f, x_463);
  let x_466 : vec4<f32> = u_xlat2;
  let x_468 : vec4<f32> = u_xlat3;
  let x_470 : vec3<f32> = (vec3<f32>(x_466.x, x_466.y, x_466.z) + vec3<f32>(x_468.y, x_468.z, x_468.w));
  let x_471 : vec4<f32> = u_xlat2;
  u_xlat2 = vec4<f32>(x_470.x, x_470.y, x_470.z, x_471.w);
  let x_473 : vec4<f32> = u_xlat2;
  let x_476 : vec3<f32> = max(vec3<f32>(x_473.x, x_473.y, x_473.z), vec3<f32>(0.0f, 0.0f, 0.0f));
  let x_477 : vec4<f32> = u_xlat3;
  u_xlat3 = vec4<f32>(x_477.x, x_476.x, x_476.y, x_476.z);
  let x_479 : vec4<f32> = u_xlat3;
  u_xlat0.x = dot(x_479, vec4<f32>(4.0f, 3.0f, 2.0f, 1.0f));
  let x_486 : f32 = u_xlat0.x;
  u_xlat0.x = (-(x_486) + 4.0f);
  let x_493 : f32 = u_xlat0.x;
  u_xlatu0 = u32(x_493);
  let x_497 : u32 = u_xlatu0;
  u_xlati0 = (bitcast<i32>(x_497) << bitcast<u32>(2i));
  let x_500 : vec3<f32> = vs_INTERP8;
  let x_502 : i32 = u_xlati0;
  let x_505 : i32 = u_xlati0;
  let x_509 : vec4<f32> = x_372.x_MainLightWorldToShadow[((x_502 + 1i) / 4i)][((x_505 + 1i) % 4i)];
  let x_511 : vec3<f32> = (vec3<f32>(x_500.y, x_500.y, x_500.y) * vec3<f32>(x_509.x, x_509.y, x_509.z));
  let x_512 : vec4<f32> = u_xlat2;
  u_xlat2 = vec4<f32>(x_511.x, x_511.y, x_511.z, x_512.w);
  let x_514 : i32 = u_xlati0;
  let x_516 : i32 = u_xlati0;
  let x_519 : vec4<f32> = x_372.x_MainLightWorldToShadow[(x_514 / 4i)][(x_516 % 4i)];
  let x_521 : vec3<f32> = vs_INTERP8;
  let x_524 : vec4<f32> = u_xlat2;
  let x_526 : vec3<f32> = ((vec3<f32>(x_519.x, x_519.y, x_519.z) * vec3<f32>(x_521.x, x_521.x, x_521.x)) + vec3<f32>(x_524.x, x_524.y, x_524.z));
  let x_527 : vec4<f32> = u_xlat2;
  u_xlat2 = vec4<f32>(x_526.x, x_526.y, x_526.z, x_527.w);
  let x_529 : i32 = u_xlati0;
  let x_532 : i32 = u_xlati0;
  let x_536 : vec4<f32> = x_372.x_MainLightWorldToShadow[((x_529 + 2i) / 4i)][((x_532 + 2i) % 4i)];
  let x_538 : vec3<f32> = vs_INTERP8;
  let x_541 : vec4<f32> = u_xlat2;
  let x_543 : vec3<f32> = ((vec3<f32>(x_536.x, x_536.y, x_536.z) * vec3<f32>(x_538.z, x_538.z, x_538.z)) + vec3<f32>(x_541.x, x_541.y, x_541.z));
  let x_544 : vec4<f32> = u_xlat2;
  u_xlat2 = vec4<f32>(x_543.x, x_543.y, x_543.z, x_544.w);
  let x_546 : vec4<f32> = u_xlat2;
  let x_548 : i32 = u_xlati0;
  let x_551 : i32 = u_xlati0;
  let x_555 : vec4<f32> = x_372.x_MainLightWorldToShadow[((x_548 + 3i) / 4i)][((x_551 + 3i) % 4i)];
  let x_557 : vec3<f32> = (vec3<f32>(x_546.x, x_546.y, x_546.z) + vec3<f32>(x_555.x, x_555.y, x_555.z));
  let x_558 : vec4<f32> = u_xlat2;
  u_xlat2 = vec4<f32>(x_557.x, x_557.y, x_557.z, x_558.w);
  let x_561 : f32 = x_372.x_MainLightShadowParams.y;
  u_xlatb0 = (0.0f < x_561);
  let x_563 : bool = u_xlatb0;
  if (x_563) {
    let x_568 : f32 = x_372.x_MainLightShadowParams.y;
    u_xlatb79 = (x_568 == 1.0f);
    let x_570 : bool = u_xlatb79;
    if (x_570) {
      let x_573 : vec4<f32> = u_xlat2;
      let x_577 : vec4<f32> = x_372.x_MainLightShadowOffset0;
      u_xlat3 = (vec4<f32>(x_573.x, x_573.y, x_573.x, x_573.y) + x_577);
      let x_580 : vec4<f32> = u_xlat3;
      let x_581 : vec2<f32> = vec2<f32>(x_580.x, x_580.y);
      let x_583 : f32 = u_xlat2.z;
      txVec0 = vec3<f32>(x_581.x, x_581.y, x_583);
      let x_595 : vec3<f32> = txVec0;
      let x_597 : f32 = textureSampleCompareLevel(x_MainLightShadowmapTexture, sampler_LinearClampCompare, x_595.xy, x_595.z);
      u_xlat9.x = x_597;
      let x_600 : vec4<f32> = u_xlat3;
      let x_601 : vec2<f32> = vec2<f32>(x_600.z, x_600.w);
      let x_603 : f32 = u_xlat2.z;
      txVec1 = vec3<f32>(x_601.x, x_601.y, x_603);
      let x_610 : vec3<f32> = txVec1;
      let x_612 : f32 = textureSampleCompareLevel(x_MainLightShadowmapTexture, sampler_LinearClampCompare, x_610.xy, x_610.z);
      u_xlat9.y = x_612;
      let x_614 : vec4<f32> = u_xlat2;
      let x_618 : vec4<f32> = x_372.x_MainLightShadowOffset1;
      u_xlat3 = (vec4<f32>(x_614.x, x_614.y, x_614.x, x_614.y) + x_618);
      let x_621 : vec4<f32> = u_xlat3;
      let x_622 : vec2<f32> = vec2<f32>(x_621.x, x_621.y);
      let x_624 : f32 = u_xlat2.z;
      txVec2 = vec3<f32>(x_622.x, x_622.y, x_624);
      let x_631 : vec3<f32> = txVec2;
      let x_633 : f32 = textureSampleCompareLevel(x_MainLightShadowmapTexture, sampler_LinearClampCompare, x_631.xy, x_631.z);
      u_xlat9.z = x_633;
      let x_636 : vec4<f32> = u_xlat3;
      let x_637 : vec2<f32> = vec2<f32>(x_636.z, x_636.w);
      let x_639 : f32 = u_xlat2.z;
      txVec3 = vec3<f32>(x_637.x, x_637.y, x_639);
      let x_646 : vec3<f32> = txVec3;
      let x_648 : f32 = textureSampleCompareLevel(x_MainLightShadowmapTexture, sampler_LinearClampCompare, x_646.xy, x_646.z);
      u_xlat9.w = x_648;
      let x_650 : vec4<f32> = u_xlat9;
      u_xlat79 = dot(x_650, vec4<f32>(0.25f, 0.25f, 0.25f, 0.25f));
    } else {
      let x_657 : f32 = x_372.x_MainLightShadowParams.y;
      u_xlatb80 = (x_657 == 2.0f);
      let x_659 : bool = u_xlatb80;
      if (x_659) {
        let x_662 : vec4<f32> = u_xlat2;
        let x_666 : vec4<f32> = x_372.x_MainLightShadowmapSize;
        let x_671 : vec2<f32> = ((vec2<f32>(x_662.x, x_662.y) * vec2<f32>(x_666.z, x_666.w)) + vec2<f32>(0.5f, 0.5f));
        let x_672 : vec4<f32> = u_xlat3;
        u_xlat3 = vec4<f32>(x_671.x, x_671.y, x_672.z, x_672.w);
        let x_674 : vec4<f32> = u_xlat3;
        let x_676 : vec2<f32> = floor(vec2<f32>(x_674.x, x_674.y));
        let x_677 : vec4<f32> = u_xlat3;
        u_xlat3 = vec4<f32>(x_676.x, x_676.y, x_677.z, x_677.w);
        let x_681 : vec4<f32> = u_xlat2;
        let x_684 : vec4<f32> = x_372.x_MainLightShadowmapSize;
        let x_687 : vec4<f32> = u_xlat3;
        u_xlat55 = ((vec2<f32>(x_681.x, x_681.y) * vec2<f32>(x_684.z, x_684.w)) + -(vec2<f32>(x_687.x, x_687.y)));
        let x_691 : vec2<f32> = u_xlat55;
        u_xlat9 = (vec4<f32>(x_691.x, x_691.x, x_691.y, x_691.y) + vec4<f32>(0.5f, 1.0f, 0.5f, 1.0f));
        let x_695 : vec4<f32> = u_xlat9;
        let x_697 : vec4<f32> = u_xlat9;
        u_xlat10 = (vec4<f32>(x_695.x, x_695.x, x_695.z, x_695.z) * vec4<f32>(x_697.x, x_697.x, x_697.z, x_697.z));
        let x_700 : vec4<f32> = u_xlat10;
        let x_704 : vec2<f32> = (vec2<f32>(x_700.y, x_700.w) * vec2<f32>(0.07999999821186065674f, 0.07999999821186065674f));
        let x_705 : vec4<f32> = u_xlat9;
        u_xlat9 = vec4<f32>(x_704.x, x_705.y, x_704.y, x_705.w);
        let x_707 : vec4<f32> = u_xlat10;
        let x_710 : vec2<f32> = u_xlat55;
        let x_712 : vec2<f32> = ((vec2<f32>(x_707.x, x_707.z) * vec2<f32>(0.5f, 0.5f)) + -(x_710));
        let x_713 : vec4<f32> = u_xlat10;
        u_xlat10 = vec4<f32>(x_712.x, x_712.y, x_713.z, x_713.w);
        let x_716 : vec2<f32> = u_xlat55;
        u_xlat62 = (-(x_716) + vec2<f32>(1.0f, 1.0f));
        let x_721 : vec2<f32> = u_xlat55;
        let x_723 : vec2<f32> = min(x_721, vec2<f32>(0.0f, 0.0f));
        let x_724 : vec4<f32> = u_xlat11;
        u_xlat11 = vec4<f32>(x_723.x, x_723.y, x_724.z, x_724.w);
        let x_726 : vec4<f32> = u_xlat11;
        let x_729 : vec4<f32> = u_xlat11;
        let x_732 : vec2<f32> = u_xlat62;
        let x_733 : vec2<f32> = ((-(vec2<f32>(x_726.x, x_726.y)) * vec2<f32>(x_729.x, x_729.y)) + x_732);
        let x_734 : vec4<f32> = u_xlat11;
        u_xlat11 = vec4<f32>(x_733.x, x_733.y, x_734.z, x_734.w);
        let x_736 : vec2<f32> = u_xlat55;
        u_xlat55 = max(x_736, vec2<f32>(0.0f, 0.0f));
        let x_738 : vec2<f32> = u_xlat55;
        let x_740 : vec2<f32> = u_xlat55;
        let x_742 : vec4<f32> = u_xlat9;
        u_xlat55 = ((-(x_738) * x_740) + vec2<f32>(x_742.y, x_742.w));
        let x_745 : vec4<f32> = u_xlat11;
        let x_747 : vec2<f32> = (vec2<f32>(x_745.x, x_745.y) + vec2<f32>(1.0f, 1.0f));
        let x_748 : vec4<f32> = u_xlat11;
        u_xlat11 = vec4<f32>(x_747.x, x_747.y, x_748.z, x_748.w);
        let x_750 : vec2<f32> = u_xlat55;
        u_xlat55 = (x_750 + vec2<f32>(1.0f, 1.0f));
        let x_753 : vec4<f32> = u_xlat10;
        let x_757 : vec2<f32> = (vec2<f32>(x_753.x, x_753.y) * vec2<f32>(0.15999999642372131348f, 0.15999999642372131348f));
        let x_758 : vec4<f32> = u_xlat12;
        u_xlat12 = vec4<f32>(x_757.x, x_757.y, x_758.z, x_758.w);
        let x_760 : vec2<f32> = u_xlat62;
        let x_761 : vec2<f32> = (x_760 * vec2<f32>(0.15999999642372131348f, 0.15999999642372131348f));
        let x_762 : vec4<f32> = u_xlat10;
        u_xlat10 = vec4<f32>(x_761.x, x_761.y, x_762.z, x_762.w);
        let x_764 : vec4<f32> = u_xlat11;
        let x_766 : vec2<f32> = (vec2<f32>(x_764.x, x_764.y) * vec2<f32>(0.15999999642372131348f, 0.15999999642372131348f));
        let x_767 : vec4<f32> = u_xlat11;
        u_xlat11 = vec4<f32>(x_766.x, x_766.y, x_767.z, x_767.w);
        let x_770 : vec2<f32> = u_xlat55;
        let x_771 : vec2<f32> = (x_770 * vec2<f32>(0.15999999642372131348f, 0.15999999642372131348f));
        let x_772 : vec4<f32> = u_xlat13;
        u_xlat13 = vec4<f32>(x_771.x, x_771.y, x_772.z, x_772.w);
        let x_774 : vec4<f32> = u_xlat9;
        u_xlat55 = (vec2<f32>(x_774.y, x_774.w) * vec2<f32>(0.15999999642372131348f, 0.15999999642372131348f));
        let x_778 : f32 = u_xlat11.x;
        u_xlat12.z = x_778;
        let x_781 : f32 = u_xlat55.x;
        u_xlat12.w = x_781;
        let x_784 : f32 = u_xlat13.x;
        u_xlat10.z = x_784;
        let x_787 : f32 = u_xlat9.x;
        u_xlat10.w = x_787;
        let x_790 : vec4<f32> = u_xlat10;
        let x_792 : vec4<f32> = u_xlat12;
        u_xlat14 = (vec4<f32>(x_790.z, x_790.w, x_790.x, x_790.z) + vec4<f32>(x_792.z, x_792.w, x_792.x, x_792.z));
        let x_796 : f32 = u_xlat12.y;
        u_xlat11.z = x_796;
        let x_799 : f32 = u_xlat55.y;
        u_xlat11.w = x_799;
        let x_802 : f32 = u_xlat10.y;
        u_xlat13.z = x_802;
        let x_805 : f32 = u_xlat9.z;
        u_xlat13.w = x_805;
        let x_807 : vec4<f32> = u_xlat11;
        let x_809 : vec4<f32> = u_xlat13;
        let x_811 : vec3<f32> = (vec3<f32>(x_807.z, x_807.y, x_807.w) + vec3<f32>(x_809.z, x_809.y, x_809.w));
        let x_812 : vec4<f32> = u_xlat9;
        u_xlat9 = vec4<f32>(x_811.x, x_811.y, x_811.z, x_812.w);
        let x_814 : vec4<f32> = u_xlat10;
        let x_816 : vec4<f32> = u_xlat14;
        let x_818 : vec3<f32> = (vec3<f32>(x_814.x, x_814.z, x_814.w) / vec3<f32>(x_816.z, x_816.w, x_816.y));
        let x_819 : vec4<f32> = u_xlat10;
        u_xlat10 = vec4<f32>(x_818.x, x_818.y, x_818.z, x_819.w);
        let x_821 : vec4<f32> = u_xlat10;
        let x_827 : vec3<f32> = (vec3<f32>(x_821.x, x_821.y, x_821.z) + vec3<f32>(-2.5f, -0.5f, 1.5f));
        let x_828 : vec4<f32> = u_xlat10;
        u_xlat10 = vec4<f32>(x_827.x, x_827.y, x_827.z, x_828.w);
        let x_830 : vec4<f32> = u_xlat13;
        let x_832 : vec4<f32> = u_xlat9;
        let x_834 : vec3<f32> = (vec3<f32>(x_830.z, x_830.y, x_830.w) / vec3<f32>(x_832.x, x_832.y, x_832.z));
        let x_835 : vec4<f32> = u_xlat11;
        u_xlat11 = vec4<f32>(x_834.x, x_834.y, x_834.z, x_835.w);
        let x_837 : vec4<f32> = u_xlat11;
        let x_839 : vec3<f32> = (vec3<f32>(x_837.x, x_837.y, x_837.z) + vec3<f32>(-2.5f, -0.5f, 1.5f));
        let x_840 : vec4<f32> = u_xlat11;
        u_xlat11 = vec4<f32>(x_839.x, x_839.y, x_839.z, x_840.w);
        let x_842 : vec4<f32> = u_xlat10;
        let x_845 : vec4<f32> = x_372.x_MainLightShadowmapSize;
        let x_847 : vec3<f32> = (vec3<f32>(x_842.y, x_842.x, x_842.z) * vec3<f32>(x_845.x, x_845.x, x_845.x));
        let x_848 : vec4<f32> = u_xlat10;
        u_xlat10 = vec4<f32>(x_847.x, x_847.y, x_847.z, x_848.w);
        let x_850 : vec4<f32> = u_xlat11;
        let x_853 : vec4<f32> = x_372.x_MainLightShadowmapSize;
        let x_855 : vec3<f32> = (vec3<f32>(x_850.x, x_850.y, x_850.z) * vec3<f32>(x_853.y, x_853.y, x_853.y));
        let x_856 : vec4<f32> = u_xlat11;
        u_xlat11 = vec4<f32>(x_855.x, x_855.y, x_855.z, x_856.w);
        let x_859 : f32 = u_xlat11.x;
        u_xlat10.w = x_859;
        let x_861 : vec4<f32> = u_xlat3;
        let x_864 : vec4<f32> = x_372.x_MainLightShadowmapSize;
        let x_867 : vec4<f32> = u_xlat10;
        u_xlat12 = ((vec4<f32>(x_861.x, x_861.y, x_861.x, x_861.y) * vec4<f32>(x_864.x, x_864.y, x_864.x, x_864.y)) + vec4<f32>(x_867.y, x_867.w, x_867.x, x_867.w));
        let x_870 : vec4<f32> = u_xlat3;
        let x_873 : vec4<f32> = x_372.x_MainLightShadowmapSize;
        let x_876 : vec4<f32> = u_xlat10;
        u_xlat55 = ((vec2<f32>(x_870.x, x_870.y) * vec2<f32>(x_873.x, x_873.y)) + vec2<f32>(x_876.z, x_876.w));
        let x_880 : f32 = u_xlat10.y;
        u_xlat11.w = x_880;
        let x_882 : vec4<f32> = u_xlat11;
        let x_883 : vec2<f32> = vec2<f32>(x_882.y, x_882.z);
        let x_884 : vec4<f32> = u_xlat10;
        u_xlat10 = vec4<f32>(x_884.x, x_883.x, x_884.z, x_883.y);
        let x_886 : vec4<f32> = u_xlat3;
        let x_889 : vec4<f32> = x_372.x_MainLightShadowmapSize;
        let x_892 : vec4<f32> = u_xlat10;
        u_xlat13 = ((vec4<f32>(x_886.x, x_886.y, x_886.x, x_886.y) * vec4<f32>(x_889.x, x_889.y, x_889.x, x_889.y)) + vec4<f32>(x_892.x, x_892.y, x_892.z, x_892.y));
        let x_895 : vec4<f32> = u_xlat3;
        let x_898 : vec4<f32> = x_372.x_MainLightShadowmapSize;
        let x_901 : vec4<f32> = u_xlat11;
        u_xlat11 = ((vec4<f32>(x_895.x, x_895.y, x_895.x, x_895.y) * vec4<f32>(x_898.x, x_898.y, x_898.x, x_898.y)) + vec4<f32>(x_901.w, x_901.y, x_901.w, x_901.z));
        let x_904 : vec4<f32> = u_xlat3;
        let x_907 : vec4<f32> = x_372.x_MainLightShadowmapSize;
        let x_910 : vec4<f32> = u_xlat10;
        u_xlat10 = ((vec4<f32>(x_904.x, x_904.y, x_904.x, x_904.y) * vec4<f32>(x_907.x, x_907.y, x_907.x, x_907.y)) + vec4<f32>(x_910.x, x_910.w, x_910.z, x_910.w));
        let x_914 : vec4<f32> = u_xlat9;
        let x_916 : vec4<f32> = u_xlat14;
        u_xlat15 = (vec4<f32>(x_914.x, x_914.x, x_914.x, x_914.y) * vec4<f32>(x_916.z, x_916.w, x_916.y, x_916.z));
        let x_920 : vec4<f32> = u_xlat9;
        let x_922 : vec4<f32> = u_xlat14;
        u_xlat16 = (vec4<f32>(x_920.y, x_920.y, x_920.z, x_920.z) * x_922);
        let x_926 : f32 = u_xlat9.z;
        let x_928 : f32 = u_xlat14.y;
        u_xlat80 = (x_926 * x_928);
        let x_931 : vec4<f32> = u_xlat12;
        let x_932 : vec2<f32> = vec2<f32>(x_931.x, x_931.y);
        let x_934 : f32 = u_xlat2.z;
        txVec4 = vec3<f32>(x_932.x, x_932.y, x_934);
        let x_941 : vec3<f32> = txVec4;
        let x_943 : f32 = textureSampleCompareLevel(x_MainLightShadowmapTexture, sampler_LinearClampCompare, x_941.xy, x_941.z);
        u_xlat3.x = x_943;
        let x_946 : vec4<f32> = u_xlat12;
        let x_947 : vec2<f32> = vec2<f32>(x_946.z, x_946.w);
        let x_949 : f32 = u_xlat2.z;
        txVec5 = vec3<f32>(x_947.x, x_947.y, x_949);
        let x_957 : vec3<f32> = txVec5;
        let x_959 : f32 = textureSampleCompareLevel(x_MainLightShadowmapTexture, sampler_LinearClampCompare, x_957.xy, x_957.z);
        u_xlat29 = x_959;
        let x_960 : f32 = u_xlat29;
        let x_962 : f32 = u_xlat15.y;
        u_xlat29 = (x_960 * x_962);
        let x_965 : f32 = u_xlat15.x;
        let x_967 : f32 = u_xlat3.x;
        let x_969 : f32 = u_xlat29;
        u_xlat3.x = ((x_965 * x_967) + x_969);
        let x_973 : vec2<f32> = u_xlat55;
        let x_975 : f32 = u_xlat2.z;
        txVec6 = vec3<f32>(x_973.x, x_973.y, x_975);
        let x_982 : vec3<f32> = txVec6;
        let x_984 : f32 = textureSampleCompareLevel(x_MainLightShadowmapTexture, sampler_LinearClampCompare, x_982.xy, x_982.z);
        u_xlat29 = x_984;
        let x_986 : f32 = u_xlat15.z;
        let x_987 : f32 = u_xlat29;
        let x_990 : f32 = u_xlat3.x;
        u_xlat3.x = ((x_986 * x_987) + x_990);
        let x_994 : vec4<f32> = u_xlat11;
        let x_995 : vec2<f32> = vec2<f32>(x_994.x, x_994.y);
        let x_997 : f32 = u_xlat2.z;
        txVec7 = vec3<f32>(x_995.x, x_995.y, x_997);
        let x_1004 : vec3<f32> = txVec7;
        let x_1006 : f32 = textureSampleCompareLevel(x_MainLightShadowmapTexture, sampler_LinearClampCompare, x_1004.xy, x_1004.z);
        u_xlat29 = x_1006;
        let x_1008 : f32 = u_xlat15.w;
        let x_1009 : f32 = u_xlat29;
        let x_1012 : f32 = u_xlat3.x;
        u_xlat3.x = ((x_1008 * x_1009) + x_1012);
        let x_1016 : vec4<f32> = u_xlat13;
        let x_1017 : vec2<f32> = vec2<f32>(x_1016.x, x_1016.y);
        let x_1019 : f32 = u_xlat2.z;
        txVec8 = vec3<f32>(x_1017.x, x_1017.y, x_1019);
        let x_1026 : vec3<f32> = txVec8;
        let x_1028 : f32 = textureSampleCompareLevel(x_MainLightShadowmapTexture, sampler_LinearClampCompare, x_1026.xy, x_1026.z);
        u_xlat29 = x_1028;
        let x_1030 : f32 = u_xlat16.x;
        let x_1031 : f32 = u_xlat29;
        let x_1034 : f32 = u_xlat3.x;
        u_xlat3.x = ((x_1030 * x_1031) + x_1034);
        let x_1038 : vec4<f32> = u_xlat13;
        let x_1039 : vec2<f32> = vec2<f32>(x_1038.z, x_1038.w);
        let x_1041 : f32 = u_xlat2.z;
        txVec9 = vec3<f32>(x_1039.x, x_1039.y, x_1041);
        let x_1048 : vec3<f32> = txVec9;
        let x_1050 : f32 = textureSampleCompareLevel(x_MainLightShadowmapTexture, sampler_LinearClampCompare, x_1048.xy, x_1048.z);
        u_xlat29 = x_1050;
        let x_1052 : f32 = u_xlat16.y;
        let x_1053 : f32 = u_xlat29;
        let x_1056 : f32 = u_xlat3.x;
        u_xlat3.x = ((x_1052 * x_1053) + x_1056);
        let x_1060 : vec4<f32> = u_xlat11;
        let x_1061 : vec2<f32> = vec2<f32>(x_1060.z, x_1060.w);
        let x_1063 : f32 = u_xlat2.z;
        txVec10 = vec3<f32>(x_1061.x, x_1061.y, x_1063);
        let x_1070 : vec3<f32> = txVec10;
        let x_1072 : f32 = textureSampleCompareLevel(x_MainLightShadowmapTexture, sampler_LinearClampCompare, x_1070.xy, x_1070.z);
        u_xlat29 = x_1072;
        let x_1074 : f32 = u_xlat16.z;
        let x_1075 : f32 = u_xlat29;
        let x_1078 : f32 = u_xlat3.x;
        u_xlat3.x = ((x_1074 * x_1075) + x_1078);
        let x_1082 : vec4<f32> = u_xlat10;
        let x_1083 : vec2<f32> = vec2<f32>(x_1082.x, x_1082.y);
        let x_1085 : f32 = u_xlat2.z;
        txVec11 = vec3<f32>(x_1083.x, x_1083.y, x_1085);
        let x_1092 : vec3<f32> = txVec11;
        let x_1094 : f32 = textureSampleCompareLevel(x_MainLightShadowmapTexture, sampler_LinearClampCompare, x_1092.xy, x_1092.z);
        u_xlat29 = x_1094;
        let x_1096 : f32 = u_xlat16.w;
        let x_1097 : f32 = u_xlat29;
        let x_1100 : f32 = u_xlat3.x;
        u_xlat3.x = ((x_1096 * x_1097) + x_1100);
        let x_1104 : vec4<f32> = u_xlat10;
        let x_1105 : vec2<f32> = vec2<f32>(x_1104.z, x_1104.w);
        let x_1107 : f32 = u_xlat2.z;
        txVec12 = vec3<f32>(x_1105.x, x_1105.y, x_1107);
        let x_1114 : vec3<f32> = txVec12;
        let x_1116 : f32 = textureSampleCompareLevel(x_MainLightShadowmapTexture, sampler_LinearClampCompare, x_1114.xy, x_1114.z);
        u_xlat29 = x_1116;
        let x_1117 : f32 = u_xlat80;
        let x_1118 : f32 = u_xlat29;
        let x_1121 : f32 = u_xlat3.x;
        u_xlat79 = ((x_1117 * x_1118) + x_1121);
      } else {
        let x_1124 : vec4<f32> = u_xlat2;
        let x_1127 : vec4<f32> = x_372.x_MainLightShadowmapSize;
        let x_1130 : vec2<f32> = ((vec2<f32>(x_1124.x, x_1124.y) * vec2<f32>(x_1127.z, x_1127.w)) + vec2<f32>(0.5f, 0.5f));
        let x_1131 : vec4<f32> = u_xlat3;
        u_xlat3 = vec4<f32>(x_1130.x, x_1130.y, x_1131.z, x_1131.w);
        let x_1133 : vec4<f32> = u_xlat3;
        let x_1135 : vec2<f32> = floor(vec2<f32>(x_1133.x, x_1133.y));
        let x_1136 : vec4<f32> = u_xlat3;
        u_xlat3 = vec4<f32>(x_1135.x, x_1135.y, x_1136.z, x_1136.w);
        let x_1138 : vec4<f32> = u_xlat2;
        let x_1141 : vec4<f32> = x_372.x_MainLightShadowmapSize;
        let x_1144 : vec4<f32> = u_xlat3;
        u_xlat55 = ((vec2<f32>(x_1138.x, x_1138.y) * vec2<f32>(x_1141.z, x_1141.w)) + -(vec2<f32>(x_1144.x, x_1144.y)));
        let x_1148 : vec2<f32> = u_xlat55;
        u_xlat9 = (vec4<f32>(x_1148.x, x_1148.x, x_1148.y, x_1148.y) + vec4<f32>(0.5f, 1.0f, 0.5f, 1.0f));
        let x_1151 : vec4<f32> = u_xlat9;
        let x_1153 : vec4<f32> = u_xlat9;
        u_xlat10 = (vec4<f32>(x_1151.x, x_1151.x, x_1151.z, x_1151.z) * vec4<f32>(x_1153.x, x_1153.x, x_1153.z, x_1153.z));
        let x_1156 : vec4<f32> = u_xlat10;
        let x_1160 : vec2<f32> = (vec2<f32>(x_1156.y, x_1156.w) * vec2<f32>(0.04081600159406661987f, 0.04081600159406661987f));
        let x_1161 : vec4<f32> = u_xlat11;
        u_xlat11 = vec4<f32>(x_1161.x, x_1160.x, x_1161.z, x_1160.y);
        let x_1163 : vec4<f32> = u_xlat10;
        let x_1166 : vec2<f32> = u_xlat55;
        let x_1168 : vec2<f32> = ((vec2<f32>(x_1163.x, x_1163.z) * vec2<f32>(0.5f, 0.5f)) + -(x_1166));
        let x_1169 : vec4<f32> = u_xlat9;
        u_xlat9 = vec4<f32>(x_1168.x, x_1169.y, x_1168.y, x_1169.w);
        let x_1171 : vec2<f32> = u_xlat55;
        let x_1173 : vec2<f32> = (-(x_1171) + vec2<f32>(1.0f, 1.0f));
        let x_1174 : vec4<f32> = u_xlat10;
        u_xlat10 = vec4<f32>(x_1173.x, x_1173.y, x_1174.z, x_1174.w);
        let x_1176 : vec2<f32> = u_xlat55;
        u_xlat62 = min(x_1176, vec2<f32>(0.0f, 0.0f));
        let x_1178 : vec2<f32> = u_xlat62;
        let x_1180 : vec2<f32> = u_xlat62;
        let x_1182 : vec4<f32> = u_xlat10;
        let x_1184 : vec2<f32> = ((-(x_1178) * x_1180) + vec2<f32>(x_1182.x, x_1182.y));
        let x_1185 : vec4<f32> = u_xlat10;
        u_xlat10 = vec4<f32>(x_1184.x, x_1184.y, x_1185.z, x_1185.w);
        let x_1187 : vec2<f32> = u_xlat55;
        u_xlat62 = max(x_1187, vec2<f32>(0.0f, 0.0f));
        let x_1190 : vec2<f32> = u_xlat62;
        let x_1192 : vec2<f32> = u_xlat62;
        let x_1194 : vec4<f32> = u_xlat9;
        let x_1196 : vec2<f32> = ((-(x_1190) * x_1192) + vec2<f32>(x_1194.y, x_1194.w));
        let x_1197 : vec3<f32> = u_xlat35;
        u_xlat35 = vec3<f32>(x_1196.x, x_1197.y, x_1196.y);
        let x_1199 : vec4<f32> = u_xlat10;
        let x_1202 : vec2<f32> = (vec2<f32>(x_1199.x, x_1199.y) + vec2<f32>(2.0f, 2.0f));
        let x_1203 : vec4<f32> = u_xlat10;
        u_xlat10 = vec4<f32>(x_1202.x, x_1202.y, x_1203.z, x_1203.w);
        let x_1205 : vec3<f32> = u_xlat35;
        let x_1207 : vec2<f32> = (vec2<f32>(x_1205.x, x_1205.z) + vec2<f32>(2.0f, 2.0f));
        let x_1208 : vec4<f32> = u_xlat9;
        u_xlat9 = vec4<f32>(x_1208.x, x_1207.x, x_1208.z, x_1207.y);
        let x_1211 : f32 = u_xlat9.y;
        u_xlat12.z = (x_1211 * 0.08163200318813323975f);
        let x_1215 : vec4<f32> = u_xlat9;
        let x_1218 : vec3<f32> = (vec3<f32>(x_1215.z, x_1215.x, x_1215.w) * vec3<f32>(0.08163200318813323975f, 0.08163200318813323975f, 0.08163200318813323975f));
        let x_1219 : vec4<f32> = u_xlat13;
        u_xlat13 = vec4<f32>(x_1218.x, x_1218.y, x_1218.z, x_1219.w);
        let x_1221 : vec4<f32> = u_xlat10;
        let x_1224 : vec2<f32> = (vec2<f32>(x_1221.x, x_1221.y) * vec2<f32>(0.08163200318813323975f, 0.08163200318813323975f));
        let x_1225 : vec4<f32> = u_xlat9;
        u_xlat9 = vec4<f32>(x_1224.x, x_1224.y, x_1225.z, x_1225.w);
        let x_1228 : f32 = u_xlat13.y;
        u_xlat12.x = x_1228;
        let x_1230 : vec2<f32> = u_xlat55;
        let x_1237 : vec2<f32> = ((vec2<f32>(x_1230.x, x_1230.x) * vec2<f32>(-0.08163200318813323975f, 0.08163200318813323975f)) + vec2<f32>(0.16326400637626647949f, 0.08163200318813323975f));
        let x_1238 : vec4<f32> = u_xlat12;
        u_xlat12 = vec4<f32>(x_1238.x, x_1237.x, x_1238.z, x_1237.y);
        let x_1240 : vec2<f32> = u_xlat55;
        let x_1244 : vec2<f32> = ((vec2<f32>(x_1240.x, x_1240.x) * vec2<f32>(-0.08163200318813323975f, 0.08163200318813323975f)) + vec2<f32>(0.08163200318813323975f, 0.16326400637626647949f));
        let x_1245 : vec4<f32> = u_xlat10;
        u_xlat10 = vec4<f32>(x_1244.x, x_1245.y, x_1244.y, x_1245.w);
        let x_1248 : f32 = u_xlat9.x;
        u_xlat10.y = x_1248;
        let x_1251 : f32 = u_xlat11.y;
        u_xlat10.w = x_1251;
        let x_1253 : vec4<f32> = u_xlat10;
        let x_1254 : vec4<f32> = u_xlat12;
        u_xlat12 = (x_1253 + x_1254);
        let x_1256 : vec2<f32> = u_xlat55;
        let x_1259 : vec2<f32> = ((vec2<f32>(x_1256.y, x_1256.y) * vec2<f32>(-0.08163200318813323975f, 0.08163200318813323975f)) + vec2<f32>(0.16326400637626647949f, 0.08163200318813323975f));
        let x_1260 : vec4<f32> = u_xlat13;
        u_xlat13 = vec4<f32>(x_1260.x, x_1259.x, x_1260.z, x_1259.y);
        let x_1262 : vec2<f32> = u_xlat55;
        let x_1265 : vec2<f32> = ((vec2<f32>(x_1262.y, x_1262.y) * vec2<f32>(-0.08163200318813323975f, 0.08163200318813323975f)) + vec2<f32>(0.08163200318813323975f, 0.16326400637626647949f));
        let x_1266 : vec4<f32> = u_xlat11;
        u_xlat11 = vec4<f32>(x_1265.x, x_1266.y, x_1265.y, x_1266.w);
        let x_1269 : f32 = u_xlat9.y;
        u_xlat11.y = x_1269;
        let x_1271 : vec4<f32> = u_xlat11;
        let x_1272 : vec4<f32> = u_xlat13;
        u_xlat9 = (x_1271 + x_1272);
        let x_1274 : vec4<f32> = u_xlat10;
        let x_1275 : vec4<f32> = u_xlat12;
        u_xlat10 = (x_1274 / x_1275);
        let x_1277 : vec4<f32> = u_xlat10;
        u_xlat10 = (x_1277 + vec4<f32>(-3.5f, -1.5f, 0.5f, 2.5f));
        let x_1283 : vec4<f32> = u_xlat11;
        let x_1284 : vec4<f32> = u_xlat9;
        u_xlat11 = (x_1283 / x_1284);
        let x_1286 : vec4<f32> = u_xlat11;
        u_xlat11 = (x_1286 + vec4<f32>(-3.5f, -1.5f, 0.5f, 2.5f));
        let x_1288 : vec4<f32> = u_xlat10;
        let x_1291 : vec4<f32> = x_372.x_MainLightShadowmapSize;
        u_xlat10 = (vec4<f32>(x_1288.w, x_1288.x, x_1288.y, x_1288.z) * vec4<f32>(x_1291.x, x_1291.x, x_1291.x, x_1291.x));
        let x_1294 : vec4<f32> = u_xlat11;
        let x_1297 : vec4<f32> = x_372.x_MainLightShadowmapSize;
        u_xlat11 = (vec4<f32>(x_1294.x, x_1294.w, x_1294.y, x_1294.z) * vec4<f32>(x_1297.y, x_1297.y, x_1297.y, x_1297.y));
        let x_1300 : vec4<f32> = u_xlat10;
        let x_1301 : vec3<f32> = vec3<f32>(x_1300.y, x_1300.z, x_1300.w);
        let x_1302 : vec4<f32> = u_xlat13;
        u_xlat13 = vec4<f32>(x_1301.x, x_1302.y, x_1301.y, x_1301.z);
        let x_1305 : f32 = u_xlat11.x;
        u_xlat13.y = x_1305;
        let x_1307 : vec4<f32> = u_xlat3;
        let x_1310 : vec4<f32> = x_372.x_MainLightShadowmapSize;
        let x_1313 : vec4<f32> = u_xlat13;
        u_xlat14 = ((vec4<f32>(x_1307.x, x_1307.y, x_1307.x, x_1307.y) * vec4<f32>(x_1310.x, x_1310.y, x_1310.x, x_1310.y)) + vec4<f32>(x_1313.x, x_1313.y, x_1313.z, x_1313.y));
        let x_1316 : vec4<f32> = u_xlat3;
        let x_1319 : vec4<f32> = x_372.x_MainLightShadowmapSize;
        let x_1322 : vec4<f32> = u_xlat13;
        u_xlat55 = ((vec2<f32>(x_1316.x, x_1316.y) * vec2<f32>(x_1319.x, x_1319.y)) + vec2<f32>(x_1322.w, x_1322.y));
        let x_1326 : f32 = u_xlat13.y;
        u_xlat10.y = x_1326;
        let x_1329 : f32 = u_xlat11.z;
        u_xlat13.y = x_1329;
        let x_1331 : vec4<f32> = u_xlat3;
        let x_1334 : vec4<f32> = x_372.x_MainLightShadowmapSize;
        let x_1337 : vec4<f32> = u_xlat13;
        u_xlat15 = ((vec4<f32>(x_1331.x, x_1331.y, x_1331.x, x_1331.y) * vec4<f32>(x_1334.x, x_1334.y, x_1334.x, x_1334.y)) + vec4<f32>(x_1337.x, x_1337.y, x_1337.z, x_1337.y));
        let x_1340 : vec4<f32> = u_xlat3;
        let x_1343 : vec4<f32> = x_372.x_MainLightShadowmapSize;
        let x_1346 : vec4<f32> = u_xlat13;
        let x_1348 : vec2<f32> = ((vec2<f32>(x_1340.x, x_1340.y) * vec2<f32>(x_1343.x, x_1343.y)) + vec2<f32>(x_1346.w, x_1346.y));
        let x_1349 : vec4<f32> = u_xlat16;
        u_xlat16 = vec4<f32>(x_1348.x, x_1348.y, x_1349.z, x_1349.w);
        let x_1352 : f32 = u_xlat13.y;
        u_xlat10.z = x_1352;
        let x_1355 : vec4<f32> = u_xlat3;
        let x_1358 : vec4<f32> = x_372.x_MainLightShadowmapSize;
        let x_1361 : vec4<f32> = u_xlat10;
        u_xlat17 = ((vec4<f32>(x_1355.x, x_1355.y, x_1355.x, x_1355.y) * vec4<f32>(x_1358.x, x_1358.y, x_1358.x, x_1358.y)) + vec4<f32>(x_1361.x, x_1361.y, x_1361.x, x_1361.z));
        let x_1365 : f32 = u_xlat11.w;
        u_xlat13.y = x_1365;
        let x_1368 : vec4<f32> = u_xlat3;
        let x_1371 : vec4<f32> = x_372.x_MainLightShadowmapSize;
        let x_1374 : vec4<f32> = u_xlat13;
        u_xlat18 = ((vec4<f32>(x_1368.x, x_1368.y, x_1368.x, x_1368.y) * vec4<f32>(x_1371.x, x_1371.y, x_1371.x, x_1371.y)) + vec4<f32>(x_1374.x, x_1374.y, x_1374.z, x_1374.y));
        let x_1378 : vec4<f32> = u_xlat3;
        let x_1381 : vec4<f32> = x_372.x_MainLightShadowmapSize;
        let x_1384 : vec4<f32> = u_xlat13;
        u_xlat36 = ((vec2<f32>(x_1378.x, x_1378.y) * vec2<f32>(x_1381.x, x_1381.y)) + vec2<f32>(x_1384.w, x_1384.y));
        let x_1388 : f32 = u_xlat13.y;
        u_xlat10.w = x_1388;
        let x_1391 : vec4<f32> = u_xlat3;
        let x_1394 : vec4<f32> = x_372.x_MainLightShadowmapSize;
        let x_1397 : vec4<f32> = u_xlat10;
        u_xlat68 = ((vec2<f32>(x_1391.x, x_1391.y) * vec2<f32>(x_1394.x, x_1394.y)) + vec2<f32>(x_1397.x, x_1397.w));
        let x_1400 : vec4<f32> = u_xlat13;
        let x_1401 : vec3<f32> = vec3<f32>(x_1400.x, x_1400.z, x_1400.w);
        let x_1402 : vec4<f32> = u_xlat11;
        u_xlat11 = vec4<f32>(x_1401.x, x_1402.y, x_1401.y, x_1401.z);
        let x_1404 : vec4<f32> = u_xlat3;
        let x_1407 : vec4<f32> = x_372.x_MainLightShadowmapSize;
        let x_1410 : vec4<f32> = u_xlat11;
        u_xlat13 = ((vec4<f32>(x_1404.x, x_1404.y, x_1404.x, x_1404.y) * vec4<f32>(x_1407.x, x_1407.y, x_1407.x, x_1407.y)) + vec4<f32>(x_1410.x, x_1410.y, x_1410.z, x_1410.y));
        let x_1414 : vec4<f32> = u_xlat3;
        let x_1417 : vec4<f32> = x_372.x_MainLightShadowmapSize;
        let x_1420 : vec4<f32> = u_xlat11;
        u_xlat63 = ((vec2<f32>(x_1414.x, x_1414.y) * vec2<f32>(x_1417.x, x_1417.y)) + vec2<f32>(x_1420.w, x_1420.y));
        let x_1424 : f32 = u_xlat10.x;
        u_xlat11.x = x_1424;
        let x_1426 : vec4<f32> = u_xlat3;
        let x_1429 : vec4<f32> = x_372.x_MainLightShadowmapSize;
        let x_1432 : vec4<f32> = u_xlat11;
        let x_1434 : vec2<f32> = ((vec2<f32>(x_1426.x, x_1426.y) * vec2<f32>(x_1429.x, x_1429.y)) + vec2<f32>(x_1432.x, x_1432.y));
        let x_1435 : vec4<f32> = u_xlat3;
        u_xlat3 = vec4<f32>(x_1434.x, x_1434.y, x_1435.z, x_1435.w);
        let x_1438 : vec4<f32> = u_xlat9;
        let x_1440 : vec4<f32> = u_xlat12;
        u_xlat19 = (vec4<f32>(x_1438.x, x_1438.x, x_1438.x, x_1438.x) * x_1440);
        let x_1443 : vec4<f32> = u_xlat9;
        let x_1445 : vec4<f32> = u_xlat12;
        u_xlat20 = (vec4<f32>(x_1443.y, x_1443.y, x_1443.y, x_1443.y) * x_1445);
        let x_1448 : vec4<f32> = u_xlat9;
        let x_1450 : vec4<f32> = u_xlat12;
        u_xlat21 = (vec4<f32>(x_1448.z, x_1448.z, x_1448.z, x_1448.z) * x_1450);
        let x_1452 : vec4<f32> = u_xlat9;
        let x_1454 : vec4<f32> = u_xlat12;
        u_xlat9 = (vec4<f32>(x_1452.w, x_1452.w, x_1452.w, x_1452.w) * x_1454);
        let x_1457 : vec4<f32> = u_xlat14;
        let x_1458 : vec2<f32> = vec2<f32>(x_1457.x, x_1457.y);
        let x_1460 : f32 = u_xlat2.z;
        txVec13 = vec3<f32>(x_1458.x, x_1458.y, x_1460);
        let x_1467 : vec3<f32> = txVec13;
        let x_1469 : f32 = textureSampleCompareLevel(x_MainLightShadowmapTexture, sampler_LinearClampCompare, x_1467.xy, x_1467.z);
        u_xlat80 = x_1469;
        let x_1471 : vec4<f32> = u_xlat14;
        let x_1472 : vec2<f32> = vec2<f32>(x_1471.z, x_1471.w);
        let x_1474 : f32 = u_xlat2.z;
        txVec14 = vec3<f32>(x_1472.x, x_1472.y, x_1474);
        let x_1482 : vec3<f32> = txVec14;
        let x_1484 : f32 = textureSampleCompareLevel(x_MainLightShadowmapTexture, sampler_LinearClampCompare, x_1482.xy, x_1482.z);
        u_xlat82 = x_1484;
        let x_1485 : f32 = u_xlat82;
        let x_1487 : f32 = u_xlat19.y;
        u_xlat82 = (x_1485 * x_1487);
        let x_1490 : f32 = u_xlat19.x;
        let x_1491 : f32 = u_xlat80;
        let x_1493 : f32 = u_xlat82;
        u_xlat80 = ((x_1490 * x_1491) + x_1493);
        let x_1496 : vec2<f32> = u_xlat55;
        let x_1498 : f32 = u_xlat2.z;
        txVec15 = vec3<f32>(x_1496.x, x_1496.y, x_1498);
        let x_1505 : vec3<f32> = txVec15;
        let x_1507 : f32 = textureSampleCompareLevel(x_MainLightShadowmapTexture, sampler_LinearClampCompare, x_1505.xy, x_1505.z);
        u_xlat55.x = x_1507;
        let x_1510 : f32 = u_xlat19.z;
        let x_1512 : f32 = u_xlat55.x;
        let x_1514 : f32 = u_xlat80;
        u_xlat80 = ((x_1510 * x_1512) + x_1514);
        let x_1517 : vec4<f32> = u_xlat17;
        let x_1518 : vec2<f32> = vec2<f32>(x_1517.x, x_1517.y);
        let x_1520 : f32 = u_xlat2.z;
        txVec16 = vec3<f32>(x_1518.x, x_1518.y, x_1520);
        let x_1527 : vec3<f32> = txVec16;
        let x_1529 : f32 = textureSampleCompareLevel(x_MainLightShadowmapTexture, sampler_LinearClampCompare, x_1527.xy, x_1527.z);
        u_xlat55.x = x_1529;
        let x_1532 : f32 = u_xlat19.w;
        let x_1534 : f32 = u_xlat55.x;
        let x_1536 : f32 = u_xlat80;
        u_xlat80 = ((x_1532 * x_1534) + x_1536);
        let x_1539 : vec4<f32> = u_xlat15;
        let x_1540 : vec2<f32> = vec2<f32>(x_1539.x, x_1539.y);
        let x_1542 : f32 = u_xlat2.z;
        txVec17 = vec3<f32>(x_1540.x, x_1540.y, x_1542);
        let x_1549 : vec3<f32> = txVec17;
        let x_1551 : f32 = textureSampleCompareLevel(x_MainLightShadowmapTexture, sampler_LinearClampCompare, x_1549.xy, x_1549.z);
        u_xlat55.x = x_1551;
        let x_1554 : f32 = u_xlat20.x;
        let x_1556 : f32 = u_xlat55.x;
        let x_1558 : f32 = u_xlat80;
        u_xlat80 = ((x_1554 * x_1556) + x_1558);
        let x_1561 : vec4<f32> = u_xlat15;
        let x_1562 : vec2<f32> = vec2<f32>(x_1561.z, x_1561.w);
        let x_1564 : f32 = u_xlat2.z;
        txVec18 = vec3<f32>(x_1562.x, x_1562.y, x_1564);
        let x_1571 : vec3<f32> = txVec18;
        let x_1573 : f32 = textureSampleCompareLevel(x_MainLightShadowmapTexture, sampler_LinearClampCompare, x_1571.xy, x_1571.z);
        u_xlat55.x = x_1573;
        let x_1576 : f32 = u_xlat20.y;
        let x_1578 : f32 = u_xlat55.x;
        let x_1580 : f32 = u_xlat80;
        u_xlat80 = ((x_1576 * x_1578) + x_1580);
        let x_1583 : vec4<f32> = u_xlat16;
        let x_1584 : vec2<f32> = vec2<f32>(x_1583.x, x_1583.y);
        let x_1586 : f32 = u_xlat2.z;
        txVec19 = vec3<f32>(x_1584.x, x_1584.y, x_1586);
        let x_1593 : vec3<f32> = txVec19;
        let x_1595 : f32 = textureSampleCompareLevel(x_MainLightShadowmapTexture, sampler_LinearClampCompare, x_1593.xy, x_1593.z);
        u_xlat55.x = x_1595;
        let x_1598 : f32 = u_xlat20.z;
        let x_1600 : f32 = u_xlat55.x;
        let x_1602 : f32 = u_xlat80;
        u_xlat80 = ((x_1598 * x_1600) + x_1602);
        let x_1605 : vec4<f32> = u_xlat17;
        let x_1606 : vec2<f32> = vec2<f32>(x_1605.z, x_1605.w);
        let x_1608 : f32 = u_xlat2.z;
        txVec20 = vec3<f32>(x_1606.x, x_1606.y, x_1608);
        let x_1615 : vec3<f32> = txVec20;
        let x_1617 : f32 = textureSampleCompareLevel(x_MainLightShadowmapTexture, sampler_LinearClampCompare, x_1615.xy, x_1615.z);
        u_xlat55.x = x_1617;
        let x_1620 : f32 = u_xlat20.w;
        let x_1622 : f32 = u_xlat55.x;
        let x_1624 : f32 = u_xlat80;
        u_xlat80 = ((x_1620 * x_1622) + x_1624);
        let x_1627 : vec4<f32> = u_xlat18;
        let x_1628 : vec2<f32> = vec2<f32>(x_1627.x, x_1627.y);
        let x_1630 : f32 = u_xlat2.z;
        txVec21 = vec3<f32>(x_1628.x, x_1628.y, x_1630);
        let x_1637 : vec3<f32> = txVec21;
        let x_1639 : f32 = textureSampleCompareLevel(x_MainLightShadowmapTexture, sampler_LinearClampCompare, x_1637.xy, x_1637.z);
        u_xlat55.x = x_1639;
        let x_1642 : f32 = u_xlat21.x;
        let x_1644 : f32 = u_xlat55.x;
        let x_1646 : f32 = u_xlat80;
        u_xlat80 = ((x_1642 * x_1644) + x_1646);
        let x_1649 : vec4<f32> = u_xlat18;
        let x_1650 : vec2<f32> = vec2<f32>(x_1649.z, x_1649.w);
        let x_1652 : f32 = u_xlat2.z;
        txVec22 = vec3<f32>(x_1650.x, x_1650.y, x_1652);
        let x_1659 : vec3<f32> = txVec22;
        let x_1661 : f32 = textureSampleCompareLevel(x_MainLightShadowmapTexture, sampler_LinearClampCompare, x_1659.xy, x_1659.z);
        u_xlat55.x = x_1661;
        let x_1664 : f32 = u_xlat21.y;
        let x_1666 : f32 = u_xlat55.x;
        let x_1668 : f32 = u_xlat80;
        u_xlat80 = ((x_1664 * x_1666) + x_1668);
        let x_1671 : vec2<f32> = u_xlat36;
        let x_1673 : f32 = u_xlat2.z;
        txVec23 = vec3<f32>(x_1671.x, x_1671.y, x_1673);
        let x_1680 : vec3<f32> = txVec23;
        let x_1682 : f32 = textureSampleCompareLevel(x_MainLightShadowmapTexture, sampler_LinearClampCompare, x_1680.xy, x_1680.z);
        u_xlat55.x = x_1682;
        let x_1685 : f32 = u_xlat21.z;
        let x_1687 : f32 = u_xlat55.x;
        let x_1689 : f32 = u_xlat80;
        u_xlat80 = ((x_1685 * x_1687) + x_1689);
        let x_1692 : vec2<f32> = u_xlat68;
        let x_1694 : f32 = u_xlat2.z;
        txVec24 = vec3<f32>(x_1692.x, x_1692.y, x_1694);
        let x_1701 : vec3<f32> = txVec24;
        let x_1703 : f32 = textureSampleCompareLevel(x_MainLightShadowmapTexture, sampler_LinearClampCompare, x_1701.xy, x_1701.z);
        u_xlat55.x = x_1703;
        let x_1706 : f32 = u_xlat21.w;
        let x_1708 : f32 = u_xlat55.x;
        let x_1710 : f32 = u_xlat80;
        u_xlat80 = ((x_1706 * x_1708) + x_1710);
        let x_1713 : vec4<f32> = u_xlat13;
        let x_1714 : vec2<f32> = vec2<f32>(x_1713.x, x_1713.y);
        let x_1716 : f32 = u_xlat2.z;
        txVec25 = vec3<f32>(x_1714.x, x_1714.y, x_1716);
        let x_1723 : vec3<f32> = txVec25;
        let x_1725 : f32 = textureSampleCompareLevel(x_MainLightShadowmapTexture, sampler_LinearClampCompare, x_1723.xy, x_1723.z);
        u_xlat55.x = x_1725;
        let x_1728 : f32 = u_xlat9.x;
        let x_1730 : f32 = u_xlat55.x;
        let x_1732 : f32 = u_xlat80;
        u_xlat80 = ((x_1728 * x_1730) + x_1732);
        let x_1735 : vec4<f32> = u_xlat13;
        let x_1736 : vec2<f32> = vec2<f32>(x_1735.z, x_1735.w);
        let x_1738 : f32 = u_xlat2.z;
        txVec26 = vec3<f32>(x_1736.x, x_1736.y, x_1738);
        let x_1745 : vec3<f32> = txVec26;
        let x_1747 : f32 = textureSampleCompareLevel(x_MainLightShadowmapTexture, sampler_LinearClampCompare, x_1745.xy, x_1745.z);
        u_xlat55.x = x_1747;
        let x_1750 : f32 = u_xlat9.y;
        let x_1752 : f32 = u_xlat55.x;
        let x_1754 : f32 = u_xlat80;
        u_xlat80 = ((x_1750 * x_1752) + x_1754);
        let x_1757 : vec2<f32> = u_xlat63;
        let x_1759 : f32 = u_xlat2.z;
        txVec27 = vec3<f32>(x_1757.x, x_1757.y, x_1759);
        let x_1766 : vec3<f32> = txVec27;
        let x_1768 : f32 = textureSampleCompareLevel(x_MainLightShadowmapTexture, sampler_LinearClampCompare, x_1766.xy, x_1766.z);
        u_xlat55.x = x_1768;
        let x_1771 : f32 = u_xlat9.z;
        let x_1773 : f32 = u_xlat55.x;
        let x_1775 : f32 = u_xlat80;
        u_xlat80 = ((x_1771 * x_1773) + x_1775);
        let x_1778 : vec4<f32> = u_xlat3;
        let x_1779 : vec2<f32> = vec2<f32>(x_1778.x, x_1778.y);
        let x_1781 : f32 = u_xlat2.z;
        txVec28 = vec3<f32>(x_1779.x, x_1779.y, x_1781);
        let x_1788 : vec3<f32> = txVec28;
        let x_1790 : f32 = textureSampleCompareLevel(x_MainLightShadowmapTexture, sampler_LinearClampCompare, x_1788.xy, x_1788.z);
        u_xlat3.x = x_1790;
        let x_1793 : f32 = u_xlat9.w;
        let x_1795 : f32 = u_xlat3.x;
        let x_1797 : f32 = u_xlat80;
        u_xlat79 = ((x_1793 * x_1795) + x_1797);
      }
    }
  } else {
    let x_1801 : vec4<f32> = u_xlat2;
    let x_1802 : vec2<f32> = vec2<f32>(x_1801.x, x_1801.y);
    let x_1804 : f32 = u_xlat2.z;
    txVec29 = vec3<f32>(x_1802.x, x_1802.y, x_1804);
    let x_1811 : vec3<f32> = txVec29;
    let x_1813 : f32 = textureSampleCompareLevel(x_MainLightShadowmapTexture, sampler_LinearClampCompare, x_1811.xy, x_1811.z);
    u_xlat79 = x_1813;
  }
  let x_1815 : f32 = x_372.x_MainLightShadowParams.x;
  u_xlat80 = (-(x_1815) + 1.0f);
  let x_1818 : f32 = u_xlat79;
  let x_1820 : f32 = x_372.x_MainLightShadowParams.x;
  let x_1822 : f32 = u_xlat80;
  u_xlat79 = ((x_1818 * x_1820) + x_1822);
  let x_1826 : f32 = u_xlat2.z;
  u_xlatb3.x = (0.0f >= x_1826);
  let x_1831 : f32 = u_xlat2.z;
  u_xlatb29 = (x_1831 >= 1.0f);
  let x_1833 : bool = u_xlatb29;
  let x_1835 : bool = u_xlatb3.x;
  u_xlatb3.x = (x_1833 | x_1835);
  let x_1839 : bool = u_xlatb3.x;
  let x_1840 : f32 = u_xlat79;
  u_xlat79 = select(x_1840, 1.0f, x_1839);
  let x_1842 : vec3<f32> = u_xlat1;
  let x_1844 : vec4<f32> = x_149.x_MainLightPosition;
  u_xlat1.x = dot(x_1842, -(vec3<f32>(x_1844.x, x_1844.y, x_1844.z)));
  let x_1850 : f32 = u_xlat1.x;
  u_xlat1.x = clamp(x_1850, 0.0f, 1.0f);
  let x_1854 : f32 = u_xlat79;
  let x_1857 : vec4<f32> = x_149.x_MainLightColor;
  u_xlat27 = (vec3<f32>(x_1854, x_1854, x_1854) * vec3<f32>(x_1857.x, x_1857.y, x_1857.z));
  let x_1860 : vec3<f32> = u_xlat27;
  let x_1861 : vec3<f32> = u_xlat1;
  u_xlat1 = (x_1860 * vec3<f32>(x_1861.x, x_1861.x, x_1861.x));
  let x_1864 : vec3<f32> = u_xlat1;
  let x_1865 : vec4<f32> = u_xlat6;
  u_xlat1 = (x_1864 * vec3<f32>(x_1865.x, x_1865.y, x_1865.z));
  let x_1869 : f32 = x_83.unity_LODFade.x;
  u_xlatb79 = (x_1869 < 0.0f);
  let x_1872 : f32 = x_83.unity_LODFade.x;
  u_xlat29 = (x_1872 + 1.0f);
  let x_1874 : bool = u_xlatb79;
  if (x_1874) {
    let x_1879 : f32 = u_xlat29;
    x_1876 = x_1879;
  } else {
    let x_1882 : f32 = x_83.unity_LODFade.x;
    x_1876 = x_1882;
  }
  let x_1883 : f32 = x_1876;
  u_xlat79 = x_1883;
  let x_1884 : f32 = u_xlat79;
  u_xlatb29 = (0.5f >= x_1884);
  let x_1886 : vec4<f32> = u_xlat5;
  let x_1890 : vec4<f32> = x_149.x_ScreenParams;
  let x_1892 : vec3<f32> = (abs(vec3<f32>(x_1886.x, x_1886.y, x_1886.z)) * vec3<f32>(x_1890.x, x_1890.y, x_1890.x));
  let x_1893 : vec4<f32> = u_xlat5;
  u_xlat5 = vec4<f32>(x_1892.x, x_1892.y, x_1892.z, x_1893.w);
  let x_1898 : vec4<f32> = u_xlat5;
  u_xlatu5 = vec3<u32>(vec3<f32>(x_1898.x, x_1898.y, x_1898.z));
  let x_1903 : u32 = u_xlatu5.z;
  u_xlatu55 = (x_1903 * 1025u);
  let x_1907 : u32 = u_xlatu55;
  u_xlatu81 = (x_1907 >> 6u);
  let x_1911 : u32 = u_xlatu81;
  let x_1912 : u32 = u_xlatu55;
  u_xlati55 = bitcast<i32>((x_1911 ^ x_1912));
  let x_1915 : i32 = u_xlati55;
  u_xlatu55 = (bitcast<u32>(x_1915) * 9u);
  let x_1919 : u32 = u_xlatu55;
  u_xlatu81 = (x_1919 >> 11u);
  let x_1922 : u32 = u_xlatu81;
  let x_1923 : u32 = u_xlatu55;
  u_xlati55 = bitcast<i32>((x_1922 ^ x_1923));
  let x_1926 : i32 = u_xlati55;
  u_xlati55 = (x_1926 * 32769i);
  let x_1929 : i32 = u_xlati55;
  let x_1932 : u32 = u_xlatu5.y;
  u_xlati55 = bitcast<i32>((bitcast<u32>(x_1929) ^ x_1932));
  let x_1935 : i32 = u_xlati55;
  u_xlatu55 = (bitcast<u32>(x_1935) * 1025u);
  let x_1938 : u32 = u_xlatu55;
  u_xlatu81 = (x_1938 >> 6u);
  let x_1940 : u32 = u_xlatu81;
  let x_1941 : u32 = u_xlatu55;
  u_xlati55 = bitcast<i32>((x_1940 ^ x_1941));
  let x_1944 : i32 = u_xlati55;
  u_xlatu55 = (bitcast<u32>(x_1944) * 9u);
  let x_1947 : u32 = u_xlatu55;
  u_xlatu81 = (x_1947 >> 11u);
  let x_1949 : u32 = u_xlatu81;
  let x_1950 : u32 = u_xlatu55;
  u_xlati55 = bitcast<i32>((x_1949 ^ x_1950));
  let x_1953 : i32 = u_xlati55;
  u_xlati55 = (x_1953 * 32769i);
  let x_1955 : i32 = u_xlati55;
  let x_1958 : u32 = u_xlatu5.x;
  u_xlati55 = bitcast<i32>((bitcast<u32>(x_1955) ^ x_1958));
  let x_1961 : i32 = u_xlati55;
  u_xlatu55 = (bitcast<u32>(x_1961) * 1025u);
  let x_1964 : u32 = u_xlatu55;
  u_xlatu81 = (x_1964 >> 6u);
  let x_1966 : u32 = u_xlatu81;
  let x_1967 : u32 = u_xlatu55;
  u_xlati55 = bitcast<i32>((x_1966 ^ x_1967));
  let x_1970 : i32 = u_xlati55;
  u_xlatu55 = (bitcast<u32>(x_1970) * 9u);
  let x_1973 : u32 = u_xlatu55;
  u_xlatu81 = (x_1973 >> 11u);
  let x_1975 : u32 = u_xlatu81;
  let x_1976 : u32 = u_xlatu55;
  u_xlati55 = bitcast<i32>((x_1975 ^ x_1976));
  let x_1979 : i32 = u_xlati55;
  u_xlati55 = (x_1979 * 32769i);
  param = 1065353216i;
  let x_1985 : i32 = u_xlati55;
  param_1 = x_1985;
  param_2 = 0i;
  param_3 = 23i;
  let x_1988 : i32 = int_bitfieldInsert_i1_i1_i1_i1_(&(param), &(param_1), &(param_2), &(param_3));
  u_xlat55.x = bitcast<f32>(x_1988);
  let x_1992 : f32 = u_xlat55.x;
  u_xlat55.x = (x_1992 + -1.0f);
  let x_1997 : f32 = u_xlat55.x;
  u_xlat81 = (-(x_1997) + 1.0f);
  let x_2000 : bool = u_xlatb29;
  if (x_2000) {
    let x_2005 : f32 = u_xlat55.x;
    x_2001 = x_2005;
  } else {
    let x_2007 : f32 = u_xlat81;
    x_2001 = x_2007;
  }
  let x_2008 : f32 = x_2001;
  u_xlat29 = x_2008;
  let x_2009 : f32 = u_xlat79;
  let x_2011 : f32 = u_xlat29;
  u_xlat79 = ((x_2009 * 2.0f) + -(x_2011));
  let x_2014 : f32 = u_xlat79;
  let x_2016 : f32 = u_xlat6.w;
  u_xlat29 = (x_2014 * x_2016);
  let x_2019 : f32 = u_xlat29;
  u_xlatb55 = (x_2019 >= 0.40000000596046447754f);
  let x_2022 : bool = u_xlatb55;
  let x_2023 : f32 = u_xlat29;
  u_xlat55.x = select(0.0f, x_2023, x_2022);
  let x_2027 : f32 = u_xlat6.w;
  let x_2028 : f32 = u_xlat79;
  u_xlat79 = ((x_2027 * x_2028) + -0.40000000596046447754f);
  let x_2032 : f32 = u_xlat29;
  u_xlat81 = dpdxCoarse(x_2032);
  let x_2034 : f32 = u_xlat29;
  u_xlat29 = dpdyCoarse(x_2034);
  let x_2036 : f32 = u_xlat29;
  let x_2038 : f32 = u_xlat81;
  u_xlat29 = (abs(x_2036) + abs(x_2038));
  let x_2041 : f32 = u_xlat29;
  u_xlat29 = max(x_2041, 0.00009999999747378752f);
  let x_2044 : f32 = u_xlat79;
  let x_2045 : f32 = u_xlat29;
  u_xlat79 = (x_2044 / x_2045);
  let x_2047 : f32 = u_xlat79;
  u_xlat79 = (x_2047 + 0.5f);
  let x_2049 : f32 = u_xlat79;
  u_xlat79 = clamp(x_2049, 0.0f, 1.0f);
  let x_2052 : f32 = x_149.x_AlphaToMaskAvailable;
  u_xlatb29 = !((x_2052 == 0.0f));
  let x_2054 : bool = u_xlatb29;
  if (x_2054) {
    let x_2058 : f32 = u_xlat79;
    x_2055 = x_2058;
  } else {
    let x_2061 : f32 = u_xlat55.x;
    x_2055 = x_2061;
  }
  let x_2062 : f32 = x_2055;
  u_xlat79 = x_2062;
  let x_2063 : f32 = u_xlat79;
  u_xlat55.x = (x_2063 + -0.00009999999747378752f);
  let x_2068 : f32 = u_xlat55.x;
  u_xlatb55 = (x_2068 < 0.0f);
  let x_2070 : bool = u_xlatb55;
  if (((select(0i, 1i, x_2070) * -1i) != 0i)) {
    discard;
  }
  let x_2078 : vec3<f32> = u_xlat26;
  let x_2079 : vec3<f32> = u_xlat34;
  u_xlat26 = (x_2078 * vec3<f32>(x_2079.y, x_2079.y, x_2079.y));
  let x_2082 : vec3<f32> = u_xlat34;
  let x_2084 : vec4<f32> = vs_INTERP4;
  let x_2087 : vec3<f32> = u_xlat26;
  u_xlat26 = ((vec3<f32>(x_2082.x, x_2082.x, x_2082.x) * vec3<f32>(x_2084.x, x_2084.y, x_2084.z)) + x_2087);
  let x_2089 : vec3<f32> = u_xlat34;
  let x_2091 : vec3<f32> = vs_INTERP9;
  let x_2093 : vec3<f32> = u_xlat26;
  u_xlat26 = ((vec3<f32>(x_2089.z, x_2089.z, x_2089.z) * x_2091) + x_2093);
  let x_2095 : vec3<f32> = u_xlat26;
  let x_2096 : vec3<f32> = u_xlat26;
  u_xlat55.x = dot(x_2095, x_2096);
  let x_2100 : f32 = u_xlat55.x;
  u_xlat55.x = inverseSqrt(x_2100);
  let x_2103 : vec3<f32> = u_xlat26;
  let x_2104 : vec2<f32> = u_xlat55;
  let x_2106 : vec3<f32> = (x_2103 * vec3<f32>(x_2104.x, x_2104.x, x_2104.x));
  let x_2107 : vec4<f32> = u_xlat5;
  u_xlat5 = vec4<f32>(x_2106.x, x_2106.y, x_2106.z, x_2107.w);
  let x_2110 : f32 = vs_INTERP8.y;
  let x_2112 : f32 = x_149.unity_MatrixV[1i].z;
  u_xlat26.x = (x_2110 * x_2112);
  let x_2116 : f32 = x_149.unity_MatrixV[0i].z;
  let x_2118 : f32 = vs_INTERP8.x;
  let x_2121 : f32 = u_xlat26.x;
  u_xlat26.x = ((x_2116 * x_2118) + x_2121);
  let x_2125 : f32 = x_149.unity_MatrixV[2i].z;
  let x_2127 : f32 = vs_INTERP8.z;
  let x_2130 : f32 = u_xlat26.x;
  u_xlat26.x = ((x_2125 * x_2127) + x_2130);
  let x_2134 : f32 = u_xlat26.x;
  let x_2136 : f32 = x_149.unity_MatrixV[3i].z;
  u_xlat26.x = (x_2134 + x_2136);
  let x_2140 : f32 = u_xlat26.x;
  let x_2143 : f32 = x_149.x_ProjectionParams.y;
  u_xlat26.x = (-(x_2140) + -(x_2143));
  let x_2148 : f32 = u_xlat26.x;
  u_xlat26.x = max(x_2148, 0.0f);
  let x_2152 : f32 = u_xlat26.x;
  let x_2154 : f32 = x_149.unity_FogParams.x;
  u_xlat26.x = (x_2152 * x_2154);
  u_xlat5.w = 1.0f;
  let x_2160 : vec4<f32> = x_83.unity_SHAr;
  let x_2161 : vec4<f32> = u_xlat5;
  u_xlat6.x = dot(x_2160, x_2161);
  let x_2166 : vec4<f32> = x_83.unity_SHAg;
  let x_2167 : vec4<f32> = u_xlat5;
  u_xlat6.y = dot(x_2166, x_2167);
  let x_2172 : vec4<f32> = x_83.unity_SHAb;
  let x_2173 : vec4<f32> = u_xlat5;
  u_xlat6.z = dot(x_2172, x_2173);
  let x_2176 : vec4<f32> = u_xlat5;
  let x_2178 : vec4<f32> = u_xlat5;
  u_xlat9 = (vec4<f32>(x_2176.y, x_2176.z, x_2176.z, x_2176.x) * vec4<f32>(x_2178.x, x_2178.y, x_2178.z, x_2178.z));
  let x_2183 : vec4<f32> = x_83.unity_SHBr;
  let x_2184 : vec4<f32> = u_xlat9;
  u_xlat10.x = dot(x_2183, x_2184);
  let x_2189 : vec4<f32> = x_83.unity_SHBg;
  let x_2190 : vec4<f32> = u_xlat9;
  u_xlat10.y = dot(x_2189, x_2190);
  let x_2194 : vec4<f32> = x_83.unity_SHBb;
  let x_2195 : vec4<f32> = u_xlat9;
  u_xlat10.z = dot(x_2194, x_2195);
  let x_2200 : f32 = u_xlat5.y;
  let x_2202 : f32 = u_xlat5.y;
  u_xlat52.x = (x_2200 * x_2202);
  let x_2206 : f32 = u_xlat5.x;
  let x_2208 : f32 = u_xlat5.x;
  let x_2211 : f32 = u_xlat52.x;
  u_xlat52.x = ((x_2206 * x_2208) + -(x_2211));
  let x_2217 : vec4<f32> = x_83.unity_SHC;
  let x_2219 : vec2<f32> = u_xlat52;
  let x_2222 : vec4<f32> = u_xlat10;
  u_xlat34 = ((vec3<f32>(x_2217.x, x_2217.y, x_2217.z) * vec3<f32>(x_2219.x, x_2219.x, x_2219.x)) + vec3<f32>(x_2222.x, x_2222.y, x_2222.z));
  let x_2225 : vec4<f32> = u_xlat6;
  let x_2227 : vec3<f32> = u_xlat34;
  let x_2228 : vec3<f32> = (vec3<f32>(x_2225.x, x_2225.y, x_2225.z) + x_2227);
  let x_2229 : vec4<f32> = u_xlat6;
  u_xlat6 = vec4<f32>(x_2228.x, x_2228.y, x_2228.z, x_2229.w);
  let x_2231 : vec4<f32> = u_xlat6;
  let x_2233 : vec3<f32> = max(vec3<f32>(x_2231.x, x_2231.y, x_2231.z), vec3<f32>(0.0f, 0.0f, 0.0f));
  let x_2234 : vec4<f32> = u_xlat6;
  u_xlat6 = vec4<f32>(x_2233.x, x_2233.y, x_2233.z, x_2234.w);
  let x_2237 : f32 = u_xlat8.x;
  u_xlat8.x = x_2237;
  let x_2240 : f32 = u_xlat8.x;
  u_xlat8.x = clamp(x_2240, 0.0f, 1.0f);
  let x_2243 : f32 = u_xlat79;
  u_xlat79 = x_2243;
  let x_2244 : f32 = u_xlat79;
  u_xlat79 = clamp(x_2244, 0.0f, 1.0f);
  let x_2246 : vec3<f32> = u_xlat7;
  u_xlat7 = (x_2246 * vec3<f32>(0.95999997854232788086f, 0.95999997854232788086f, 0.95999997854232788086f));
  let x_2251 : f32 = u_xlat8.x;
  u_xlat52.x = (-(x_2251) + 1.0f);
  let x_2257 : f32 = u_xlat52.x;
  let x_2259 : f32 = u_xlat52.x;
  u_xlat78 = (x_2257 * x_2259);
  let x_2261 : f32 = u_xlat78;
  u_xlat78 = max(x_2261, 0.0078125f);
  let x_2264 : f32 = u_xlat78;
  let x_2265 : f32 = u_xlat78;
  u_xlat55.x = (x_2264 * x_2265);
  let x_2269 : f32 = u_xlat8.x;
  u_xlat81 = (x_2269 + 0.04000002145767211914f);
  let x_2272 : f32 = u_xlat81;
  u_xlat81 = min(x_2272, 1.0f);
  let x_2274 : f32 = u_xlat78;
  u_xlat82 = ((x_2274 * 4.0f) + 2.0f);
  let x_2279 : f32 = vs_INTERP6.w;
  u_xlat83 = min(x_2279, 1.0f);
  let x_2281 : bool = u_xlatb0;
  if (x_2281) {
    let x_2285 : f32 = x_372.x_MainLightShadowParams.y;
    u_xlatb0 = (x_2285 == 1.0f);
    let x_2287 : bool = u_xlatb0;
    if (x_2287) {
      let x_2290 : vec4<f32> = u_xlat2;
      let x_2293 : vec4<f32> = x_372.x_MainLightShadowOffset0;
      u_xlat8 = (vec4<f32>(x_2290.x, x_2290.y, x_2290.x, x_2290.y) + x_2293);
      let x_2296 : vec4<f32> = u_xlat8;
      let x_2297 : vec2<f32> = vec2<f32>(x_2296.x, x_2296.y);
      let x_2299 : f32 = u_xlat2.z;
      txVec30 = vec3<f32>(x_2297.x, x_2297.y, x_2299);
      let x_2306 : vec3<f32> = txVec30;
      let x_2308 : f32 = textureSampleCompareLevel(x_MainLightShadowmapTexture, sampler_LinearClampCompare, x_2306.xy, x_2306.z);
      u_xlat9.x = x_2308;
      let x_2311 : vec4<f32> = u_xlat8;
      let x_2312 : vec2<f32> = vec2<f32>(x_2311.z, x_2311.w);
      let x_2314 : f32 = u_xlat2.z;
      txVec31 = vec3<f32>(x_2312.x, x_2312.y, x_2314);
      let x_2321 : vec3<f32> = txVec31;
      let x_2323 : f32 = textureSampleCompareLevel(x_MainLightShadowmapTexture, sampler_LinearClampCompare, x_2321.xy, x_2321.z);
      u_xlat9.y = x_2323;
      let x_2325 : vec4<f32> = u_xlat2;
      let x_2328 : vec4<f32> = x_372.x_MainLightShadowOffset1;
      u_xlat8 = (vec4<f32>(x_2325.x, x_2325.y, x_2325.x, x_2325.y) + x_2328);
      let x_2331 : vec4<f32> = u_xlat8;
      let x_2332 : vec2<f32> = vec2<f32>(x_2331.x, x_2331.y);
      let x_2334 : f32 = u_xlat2.z;
      txVec32 = vec3<f32>(x_2332.x, x_2332.y, x_2334);
      let x_2341 : vec3<f32> = txVec32;
      let x_2343 : f32 = textureSampleCompareLevel(x_MainLightShadowmapTexture, sampler_LinearClampCompare, x_2341.xy, x_2341.z);
      u_xlat9.z = x_2343;
      let x_2346 : vec4<f32> = u_xlat8;
      let x_2347 : vec2<f32> = vec2<f32>(x_2346.z, x_2346.w);
      let x_2349 : f32 = u_xlat2.z;
      txVec33 = vec3<f32>(x_2347.x, x_2347.y, x_2349);
      let x_2356 : vec3<f32> = txVec33;
      let x_2358 : f32 = textureSampleCompareLevel(x_MainLightShadowmapTexture, sampler_LinearClampCompare, x_2356.xy, x_2356.z);
      u_xlat9.w = x_2358;
      let x_2360 : vec4<f32> = u_xlat9;
      u_xlat0.x = dot(x_2360, vec4<f32>(0.25f, 0.25f, 0.25f, 0.25f));
    } else {
      let x_2366 : f32 = x_372.x_MainLightShadowParams.y;
      u_xlatb84 = (x_2366 == 2.0f);
      let x_2368 : bool = u_xlatb84;
      if (x_2368) {
        let x_2371 : vec4<f32> = u_xlat2;
        let x_2374 : vec4<f32> = x_372.x_MainLightShadowmapSize;
        let x_2377 : vec2<f32> = ((vec2<f32>(x_2371.x, x_2371.y) * vec2<f32>(x_2374.z, x_2374.w)) + vec2<f32>(0.5f, 0.5f));
        let x_2378 : vec4<f32> = u_xlat8;
        u_xlat8 = vec4<f32>(x_2377.x, x_2377.y, x_2378.z, x_2378.w);
        let x_2380 : vec4<f32> = u_xlat8;
        let x_2382 : vec2<f32> = floor(vec2<f32>(x_2380.x, x_2380.y));
        let x_2383 : vec4<f32> = u_xlat8;
        u_xlat8 = vec4<f32>(x_2382.x, x_2382.y, x_2383.z, x_2383.w);
        let x_2386 : vec4<f32> = u_xlat2;
        let x_2389 : vec4<f32> = x_372.x_MainLightShadowmapSize;
        let x_2392 : vec4<f32> = u_xlat8;
        u_xlat60 = ((vec2<f32>(x_2386.x, x_2386.y) * vec2<f32>(x_2389.z, x_2389.w)) + -(vec2<f32>(x_2392.x, x_2392.y)));
        let x_2396 : vec2<f32> = u_xlat60;
        u_xlat9 = (vec4<f32>(x_2396.x, x_2396.x, x_2396.y, x_2396.y) + vec4<f32>(0.5f, 1.0f, 0.5f, 1.0f));
        let x_2399 : vec4<f32> = u_xlat9;
        let x_2401 : vec4<f32> = u_xlat9;
        u_xlat10 = (vec4<f32>(x_2399.x, x_2399.x, x_2399.z, x_2399.z) * vec4<f32>(x_2401.x, x_2401.x, x_2401.z, x_2401.z));
        let x_2404 : vec4<f32> = u_xlat10;
        let x_2406 : vec2<f32> = (vec2<f32>(x_2404.y, x_2404.w) * vec2<f32>(0.07999999821186065674f, 0.07999999821186065674f));
        let x_2407 : vec4<f32> = u_xlat9;
        u_xlat9 = vec4<f32>(x_2406.x, x_2407.y, x_2406.y, x_2407.w);
        let x_2409 : vec4<f32> = u_xlat10;
        let x_2412 : vec2<f32> = u_xlat60;
        let x_2414 : vec2<f32> = ((vec2<f32>(x_2409.x, x_2409.z) * vec2<f32>(0.5f, 0.5f)) + -(x_2412));
        let x_2415 : vec4<f32> = u_xlat10;
        u_xlat10 = vec4<f32>(x_2414.x, x_2414.y, x_2415.z, x_2415.w);
        let x_2417 : vec2<f32> = u_xlat60;
        u_xlat62 = (-(x_2417) + vec2<f32>(1.0f, 1.0f));
        let x_2420 : vec2<f32> = u_xlat60;
        let x_2421 : vec2<f32> = min(x_2420, vec2<f32>(0.0f, 0.0f));
        let x_2422 : vec4<f32> = u_xlat11;
        u_xlat11 = vec4<f32>(x_2421.x, x_2421.y, x_2422.z, x_2422.w);
        let x_2424 : vec4<f32> = u_xlat11;
        let x_2427 : vec4<f32> = u_xlat11;
        let x_2430 : vec2<f32> = u_xlat62;
        let x_2431 : vec2<f32> = ((-(vec2<f32>(x_2424.x, x_2424.y)) * vec2<f32>(x_2427.x, x_2427.y)) + x_2430);
        let x_2432 : vec4<f32> = u_xlat11;
        u_xlat11 = vec4<f32>(x_2431.x, x_2431.y, x_2432.z, x_2432.w);
        let x_2434 : vec2<f32> = u_xlat60;
        u_xlat60 = max(x_2434, vec2<f32>(0.0f, 0.0f));
        let x_2436 : vec2<f32> = u_xlat60;
        let x_2438 : vec2<f32> = u_xlat60;
        let x_2440 : vec4<f32> = u_xlat9;
        u_xlat60 = ((-(x_2436) * x_2438) + vec2<f32>(x_2440.y, x_2440.w));
        let x_2443 : vec4<f32> = u_xlat11;
        let x_2445 : vec2<f32> = (vec2<f32>(x_2443.x, x_2443.y) + vec2<f32>(1.0f, 1.0f));
        let x_2446 : vec4<f32> = u_xlat11;
        u_xlat11 = vec4<f32>(x_2445.x, x_2445.y, x_2446.z, x_2446.w);
        let x_2448 : vec2<f32> = u_xlat60;
        u_xlat60 = (x_2448 + vec2<f32>(1.0f, 1.0f));
        let x_2450 : vec4<f32> = u_xlat10;
        let x_2452 : vec2<f32> = (vec2<f32>(x_2450.x, x_2450.y) * vec2<f32>(0.15999999642372131348f, 0.15999999642372131348f));
        let x_2453 : vec4<f32> = u_xlat12;
        u_xlat12 = vec4<f32>(x_2452.x, x_2452.y, x_2453.z, x_2453.w);
        let x_2455 : vec2<f32> = u_xlat62;
        let x_2456 : vec2<f32> = (x_2455 * vec2<f32>(0.15999999642372131348f, 0.15999999642372131348f));
        let x_2457 : vec4<f32> = u_xlat10;
        u_xlat10 = vec4<f32>(x_2456.x, x_2456.y, x_2457.z, x_2457.w);
        let x_2459 : vec4<f32> = u_xlat11;
        let x_2461 : vec2<f32> = (vec2<f32>(x_2459.x, x_2459.y) * vec2<f32>(0.15999999642372131348f, 0.15999999642372131348f));
        let x_2462 : vec4<f32> = u_xlat11;
        u_xlat11 = vec4<f32>(x_2461.x, x_2461.y, x_2462.z, x_2462.w);
        let x_2464 : vec2<f32> = u_xlat60;
        let x_2465 : vec2<f32> = (x_2464 * vec2<f32>(0.15999999642372131348f, 0.15999999642372131348f));
        let x_2466 : vec4<f32> = u_xlat13;
        u_xlat13 = vec4<f32>(x_2465.x, x_2465.y, x_2466.z, x_2466.w);
        let x_2468 : vec4<f32> = u_xlat9;
        u_xlat60 = (vec2<f32>(x_2468.y, x_2468.w) * vec2<f32>(0.15999999642372131348f, 0.15999999642372131348f));
        let x_2472 : f32 = u_xlat11.x;
        u_xlat12.z = x_2472;
        let x_2475 : f32 = u_xlat60.x;
        u_xlat12.w = x_2475;
        let x_2478 : f32 = u_xlat13.x;
        u_xlat10.z = x_2478;
        let x_2481 : f32 = u_xlat9.x;
        u_xlat10.w = x_2481;
        let x_2483 : vec4<f32> = u_xlat10;
        let x_2485 : vec4<f32> = u_xlat12;
        u_xlat14 = (vec4<f32>(x_2483.z, x_2483.w, x_2483.x, x_2483.z) + vec4<f32>(x_2485.z, x_2485.w, x_2485.x, x_2485.z));
        let x_2489 : f32 = u_xlat12.y;
        u_xlat11.z = x_2489;
        let x_2492 : f32 = u_xlat60.y;
        u_xlat11.w = x_2492;
        let x_2495 : f32 = u_xlat10.y;
        u_xlat13.z = x_2495;
        let x_2498 : f32 = u_xlat9.z;
        u_xlat13.w = x_2498;
        let x_2500 : vec4<f32> = u_xlat11;
        let x_2502 : vec4<f32> = u_xlat13;
        let x_2504 : vec3<f32> = (vec3<f32>(x_2500.z, x_2500.y, x_2500.w) + vec3<f32>(x_2502.z, x_2502.y, x_2502.w));
        let x_2505 : vec4<f32> = u_xlat9;
        u_xlat9 = vec4<f32>(x_2504.x, x_2504.y, x_2504.z, x_2505.w);
        let x_2507 : vec4<f32> = u_xlat10;
        let x_2509 : vec4<f32> = u_xlat14;
        let x_2511 : vec3<f32> = (vec3<f32>(x_2507.x, x_2507.z, x_2507.w) / vec3<f32>(x_2509.z, x_2509.w, x_2509.y));
        let x_2512 : vec4<f32> = u_xlat10;
        u_xlat10 = vec4<f32>(x_2511.x, x_2511.y, x_2511.z, x_2512.w);
        let x_2514 : vec4<f32> = u_xlat10;
        let x_2516 : vec3<f32> = (vec3<f32>(x_2514.x, x_2514.y, x_2514.z) + vec3<f32>(-2.5f, -0.5f, 1.5f));
        let x_2517 : vec4<f32> = u_xlat10;
        u_xlat10 = vec4<f32>(x_2516.x, x_2516.y, x_2516.z, x_2517.w);
        let x_2519 : vec4<f32> = u_xlat13;
        let x_2521 : vec4<f32> = u_xlat9;
        let x_2523 : vec3<f32> = (vec3<f32>(x_2519.z, x_2519.y, x_2519.w) / vec3<f32>(x_2521.x, x_2521.y, x_2521.z));
        let x_2524 : vec4<f32> = u_xlat11;
        u_xlat11 = vec4<f32>(x_2523.x, x_2523.y, x_2523.z, x_2524.w);
        let x_2526 : vec4<f32> = u_xlat11;
        let x_2528 : vec3<f32> = (vec3<f32>(x_2526.x, x_2526.y, x_2526.z) + vec3<f32>(-2.5f, -0.5f, 1.5f));
        let x_2529 : vec4<f32> = u_xlat11;
        u_xlat11 = vec4<f32>(x_2528.x, x_2528.y, x_2528.z, x_2529.w);
        let x_2531 : vec4<f32> = u_xlat10;
        let x_2534 : vec4<f32> = x_372.x_MainLightShadowmapSize;
        let x_2536 : vec3<f32> = (vec3<f32>(x_2531.y, x_2531.x, x_2531.z) * vec3<f32>(x_2534.x, x_2534.x, x_2534.x));
        let x_2537 : vec4<f32> = u_xlat10;
        u_xlat10 = vec4<f32>(x_2536.x, x_2536.y, x_2536.z, x_2537.w);
        let x_2539 : vec4<f32> = u_xlat11;
        let x_2542 : vec4<f32> = x_372.x_MainLightShadowmapSize;
        let x_2544 : vec3<f32> = (vec3<f32>(x_2539.x, x_2539.y, x_2539.z) * vec3<f32>(x_2542.y, x_2542.y, x_2542.y));
        let x_2545 : vec4<f32> = u_xlat11;
        u_xlat11 = vec4<f32>(x_2544.x, x_2544.y, x_2544.z, x_2545.w);
        let x_2548 : f32 = u_xlat11.x;
        u_xlat10.w = x_2548;
        let x_2550 : vec4<f32> = u_xlat8;
        let x_2553 : vec4<f32> = x_372.x_MainLightShadowmapSize;
        let x_2556 : vec4<f32> = u_xlat10;
        u_xlat12 = ((vec4<f32>(x_2550.x, x_2550.y, x_2550.x, x_2550.y) * vec4<f32>(x_2553.x, x_2553.y, x_2553.x, x_2553.y)) + vec4<f32>(x_2556.y, x_2556.w, x_2556.x, x_2556.w));
        let x_2559 : vec4<f32> = u_xlat8;
        let x_2562 : vec4<f32> = x_372.x_MainLightShadowmapSize;
        let x_2565 : vec4<f32> = u_xlat10;
        u_xlat60 = ((vec2<f32>(x_2559.x, x_2559.y) * vec2<f32>(x_2562.x, x_2562.y)) + vec2<f32>(x_2565.z, x_2565.w));
        let x_2569 : f32 = u_xlat10.y;
        u_xlat11.w = x_2569;
        let x_2571 : vec4<f32> = u_xlat11;
        let x_2572 : vec2<f32> = vec2<f32>(x_2571.y, x_2571.z);
        let x_2573 : vec4<f32> = u_xlat10;
        u_xlat10 = vec4<f32>(x_2573.x, x_2572.x, x_2573.z, x_2572.y);
        let x_2575 : vec4<f32> = u_xlat8;
        let x_2578 : vec4<f32> = x_372.x_MainLightShadowmapSize;
        let x_2581 : vec4<f32> = u_xlat10;
        u_xlat13 = ((vec4<f32>(x_2575.x, x_2575.y, x_2575.x, x_2575.y) * vec4<f32>(x_2578.x, x_2578.y, x_2578.x, x_2578.y)) + vec4<f32>(x_2581.x, x_2581.y, x_2581.z, x_2581.y));
        let x_2584 : vec4<f32> = u_xlat8;
        let x_2587 : vec4<f32> = x_372.x_MainLightShadowmapSize;
        let x_2590 : vec4<f32> = u_xlat11;
        u_xlat11 = ((vec4<f32>(x_2584.x, x_2584.y, x_2584.x, x_2584.y) * vec4<f32>(x_2587.x, x_2587.y, x_2587.x, x_2587.y)) + vec4<f32>(x_2590.w, x_2590.y, x_2590.w, x_2590.z));
        let x_2593 : vec4<f32> = u_xlat8;
        let x_2596 : vec4<f32> = x_372.x_MainLightShadowmapSize;
        let x_2599 : vec4<f32> = u_xlat10;
        u_xlat10 = ((vec4<f32>(x_2593.x, x_2593.y, x_2593.x, x_2593.y) * vec4<f32>(x_2596.x, x_2596.y, x_2596.x, x_2596.y)) + vec4<f32>(x_2599.x, x_2599.w, x_2599.z, x_2599.w));
        let x_2602 : vec4<f32> = u_xlat9;
        let x_2604 : vec4<f32> = u_xlat14;
        u_xlat15 = (vec4<f32>(x_2602.x, x_2602.x, x_2602.x, x_2602.y) * vec4<f32>(x_2604.z, x_2604.w, x_2604.y, x_2604.z));
        let x_2607 : vec4<f32> = u_xlat9;
        let x_2609 : vec4<f32> = u_xlat14;
        u_xlat16 = (vec4<f32>(x_2607.y, x_2607.y, x_2607.z, x_2607.z) * x_2609);
        let x_2613 : f32 = u_xlat9.z;
        let x_2615 : f32 = u_xlat14.y;
        u_xlat84 = (x_2613 * x_2615);
        let x_2618 : vec4<f32> = u_xlat12;
        let x_2619 : vec2<f32> = vec2<f32>(x_2618.x, x_2618.y);
        let x_2621 : f32 = u_xlat2.z;
        txVec34 = vec3<f32>(x_2619.x, x_2619.y, x_2621);
        let x_2629 : vec3<f32> = txVec34;
        let x_2631 : f32 = textureSampleCompareLevel(x_MainLightShadowmapTexture, sampler_LinearClampCompare, x_2629.xy, x_2629.z);
        u_xlat85 = x_2631;
        let x_2633 : vec4<f32> = u_xlat12;
        let x_2634 : vec2<f32> = vec2<f32>(x_2633.z, x_2633.w);
        let x_2636 : f32 = u_xlat2.z;
        txVec35 = vec3<f32>(x_2634.x, x_2634.y, x_2636);
        let x_2643 : vec3<f32> = txVec35;
        let x_2645 : f32 = textureSampleCompareLevel(x_MainLightShadowmapTexture, sampler_LinearClampCompare, x_2643.xy, x_2643.z);
        u_xlat8.x = x_2645;
        let x_2648 : f32 = u_xlat8.x;
        let x_2650 : f32 = u_xlat15.y;
        u_xlat8.x = (x_2648 * x_2650);
        let x_2654 : f32 = u_xlat15.x;
        let x_2655 : f32 = u_xlat85;
        let x_2658 : f32 = u_xlat8.x;
        u_xlat85 = ((x_2654 * x_2655) + x_2658);
        let x_2661 : vec2<f32> = u_xlat60;
        let x_2663 : f32 = u_xlat2.z;
        txVec36 = vec3<f32>(x_2661.x, x_2661.y, x_2663);
        let x_2670 : vec3<f32> = txVec36;
        let x_2672 : f32 = textureSampleCompareLevel(x_MainLightShadowmapTexture, sampler_LinearClampCompare, x_2670.xy, x_2670.z);
        u_xlat8.x = x_2672;
        let x_2675 : f32 = u_xlat15.z;
        let x_2677 : f32 = u_xlat8.x;
        let x_2679 : f32 = u_xlat85;
        u_xlat85 = ((x_2675 * x_2677) + x_2679);
        let x_2682 : vec4<f32> = u_xlat11;
        let x_2683 : vec2<f32> = vec2<f32>(x_2682.x, x_2682.y);
        let x_2685 : f32 = u_xlat2.z;
        txVec37 = vec3<f32>(x_2683.x, x_2683.y, x_2685);
        let x_2692 : vec3<f32> = txVec37;
        let x_2694 : f32 = textureSampleCompareLevel(x_MainLightShadowmapTexture, sampler_LinearClampCompare, x_2692.xy, x_2692.z);
        u_xlat8.x = x_2694;
        let x_2697 : f32 = u_xlat15.w;
        let x_2699 : f32 = u_xlat8.x;
        let x_2701 : f32 = u_xlat85;
        u_xlat85 = ((x_2697 * x_2699) + x_2701);
        let x_2704 : vec4<f32> = u_xlat13;
        let x_2705 : vec2<f32> = vec2<f32>(x_2704.x, x_2704.y);
        let x_2707 : f32 = u_xlat2.z;
        txVec38 = vec3<f32>(x_2705.x, x_2705.y, x_2707);
        let x_2714 : vec3<f32> = txVec38;
        let x_2716 : f32 = textureSampleCompareLevel(x_MainLightShadowmapTexture, sampler_LinearClampCompare, x_2714.xy, x_2714.z);
        u_xlat8.x = x_2716;
        let x_2719 : f32 = u_xlat16.x;
        let x_2721 : f32 = u_xlat8.x;
        let x_2723 : f32 = u_xlat85;
        u_xlat85 = ((x_2719 * x_2721) + x_2723);
        let x_2726 : vec4<f32> = u_xlat13;
        let x_2727 : vec2<f32> = vec2<f32>(x_2726.z, x_2726.w);
        let x_2729 : f32 = u_xlat2.z;
        txVec39 = vec3<f32>(x_2727.x, x_2727.y, x_2729);
        let x_2736 : vec3<f32> = txVec39;
        let x_2738 : f32 = textureSampleCompareLevel(x_MainLightShadowmapTexture, sampler_LinearClampCompare, x_2736.xy, x_2736.z);
        u_xlat8.x = x_2738;
        let x_2741 : f32 = u_xlat16.y;
        let x_2743 : f32 = u_xlat8.x;
        let x_2745 : f32 = u_xlat85;
        u_xlat85 = ((x_2741 * x_2743) + x_2745);
        let x_2748 : vec4<f32> = u_xlat11;
        let x_2749 : vec2<f32> = vec2<f32>(x_2748.z, x_2748.w);
        let x_2751 : f32 = u_xlat2.z;
        txVec40 = vec3<f32>(x_2749.x, x_2749.y, x_2751);
        let x_2758 : vec3<f32> = txVec40;
        let x_2760 : f32 = textureSampleCompareLevel(x_MainLightShadowmapTexture, sampler_LinearClampCompare, x_2758.xy, x_2758.z);
        u_xlat8.x = x_2760;
        let x_2763 : f32 = u_xlat16.z;
        let x_2765 : f32 = u_xlat8.x;
        let x_2767 : f32 = u_xlat85;
        u_xlat85 = ((x_2763 * x_2765) + x_2767);
        let x_2770 : vec4<f32> = u_xlat10;
        let x_2771 : vec2<f32> = vec2<f32>(x_2770.x, x_2770.y);
        let x_2773 : f32 = u_xlat2.z;
        txVec41 = vec3<f32>(x_2771.x, x_2771.y, x_2773);
        let x_2780 : vec3<f32> = txVec41;
        let x_2782 : f32 = textureSampleCompareLevel(x_MainLightShadowmapTexture, sampler_LinearClampCompare, x_2780.xy, x_2780.z);
        u_xlat8.x = x_2782;
        let x_2785 : f32 = u_xlat16.w;
        let x_2787 : f32 = u_xlat8.x;
        let x_2789 : f32 = u_xlat85;
        u_xlat85 = ((x_2785 * x_2787) + x_2789);
        let x_2792 : vec4<f32> = u_xlat10;
        let x_2793 : vec2<f32> = vec2<f32>(x_2792.z, x_2792.w);
        let x_2795 : f32 = u_xlat2.z;
        txVec42 = vec3<f32>(x_2793.x, x_2793.y, x_2795);
        let x_2802 : vec3<f32> = txVec42;
        let x_2804 : f32 = textureSampleCompareLevel(x_MainLightShadowmapTexture, sampler_LinearClampCompare, x_2802.xy, x_2802.z);
        u_xlat8.x = x_2804;
        let x_2806 : f32 = u_xlat84;
        let x_2808 : f32 = u_xlat8.x;
        let x_2810 : f32 = u_xlat85;
        u_xlat0.x = ((x_2806 * x_2808) + x_2810);
      } else {
        let x_2814 : vec4<f32> = u_xlat2;
        let x_2817 : vec4<f32> = x_372.x_MainLightShadowmapSize;
        let x_2820 : vec2<f32> = ((vec2<f32>(x_2814.x, x_2814.y) * vec2<f32>(x_2817.z, x_2817.w)) + vec2<f32>(0.5f, 0.5f));
        let x_2821 : vec4<f32> = u_xlat8;
        u_xlat8 = vec4<f32>(x_2820.x, x_2820.y, x_2821.z, x_2821.w);
        let x_2823 : vec4<f32> = u_xlat8;
        let x_2825 : vec2<f32> = floor(vec2<f32>(x_2823.x, x_2823.y));
        let x_2826 : vec4<f32> = u_xlat8;
        u_xlat8 = vec4<f32>(x_2825.x, x_2825.y, x_2826.z, x_2826.w);
        let x_2828 : vec4<f32> = u_xlat2;
        let x_2831 : vec4<f32> = x_372.x_MainLightShadowmapSize;
        let x_2834 : vec4<f32> = u_xlat8;
        u_xlat60 = ((vec2<f32>(x_2828.x, x_2828.y) * vec2<f32>(x_2831.z, x_2831.w)) + -(vec2<f32>(x_2834.x, x_2834.y)));
        let x_2838 : vec2<f32> = u_xlat60;
        u_xlat9 = (vec4<f32>(x_2838.x, x_2838.x, x_2838.y, x_2838.y) + vec4<f32>(0.5f, 1.0f, 0.5f, 1.0f));
        let x_2841 : vec4<f32> = u_xlat9;
        let x_2843 : vec4<f32> = u_xlat9;
        u_xlat10 = (vec4<f32>(x_2841.x, x_2841.x, x_2841.z, x_2841.z) * vec4<f32>(x_2843.x, x_2843.x, x_2843.z, x_2843.z));
        let x_2846 : vec4<f32> = u_xlat10;
        let x_2848 : vec2<f32> = (vec2<f32>(x_2846.y, x_2846.w) * vec2<f32>(0.04081600159406661987f, 0.04081600159406661987f));
        let x_2849 : vec4<f32> = u_xlat11;
        u_xlat11 = vec4<f32>(x_2849.x, x_2848.x, x_2849.z, x_2848.y);
        let x_2851 : vec4<f32> = u_xlat10;
        let x_2854 : vec2<f32> = u_xlat60;
        let x_2856 : vec2<f32> = ((vec2<f32>(x_2851.x, x_2851.z) * vec2<f32>(0.5f, 0.5f)) + -(x_2854));
        let x_2857 : vec4<f32> = u_xlat9;
        u_xlat9 = vec4<f32>(x_2856.x, x_2857.y, x_2856.y, x_2857.w);
        let x_2859 : vec2<f32> = u_xlat60;
        let x_2861 : vec2<f32> = (-(x_2859) + vec2<f32>(1.0f, 1.0f));
        let x_2862 : vec4<f32> = u_xlat10;
        u_xlat10 = vec4<f32>(x_2861.x, x_2861.y, x_2862.z, x_2862.w);
        let x_2864 : vec2<f32> = u_xlat60;
        u_xlat62 = min(x_2864, vec2<f32>(0.0f, 0.0f));
        let x_2866 : vec2<f32> = u_xlat62;
        let x_2868 : vec2<f32> = u_xlat62;
        let x_2870 : vec4<f32> = u_xlat10;
        let x_2872 : vec2<f32> = ((-(x_2866) * x_2868) + vec2<f32>(x_2870.x, x_2870.y));
        let x_2873 : vec4<f32> = u_xlat10;
        u_xlat10 = vec4<f32>(x_2872.x, x_2872.y, x_2873.z, x_2873.w);
        let x_2875 : vec2<f32> = u_xlat60;
        u_xlat62 = max(x_2875, vec2<f32>(0.0f, 0.0f));
        let x_2877 : vec2<f32> = u_xlat62;
        let x_2879 : vec2<f32> = u_xlat62;
        let x_2881 : vec4<f32> = u_xlat9;
        let x_2883 : vec2<f32> = ((-(x_2877) * x_2879) + vec2<f32>(x_2881.y, x_2881.w));
        let x_2884 : vec3<f32> = u_xlat35;
        u_xlat35 = vec3<f32>(x_2883.x, x_2884.y, x_2883.y);
        let x_2886 : vec4<f32> = u_xlat10;
        let x_2888 : vec2<f32> = (vec2<f32>(x_2886.x, x_2886.y) + vec2<f32>(2.0f, 2.0f));
        let x_2889 : vec4<f32> = u_xlat10;
        u_xlat10 = vec4<f32>(x_2888.x, x_2888.y, x_2889.z, x_2889.w);
        let x_2891 : vec3<f32> = u_xlat35;
        let x_2893 : vec2<f32> = (vec2<f32>(x_2891.x, x_2891.z) + vec2<f32>(2.0f, 2.0f));
        let x_2894 : vec4<f32> = u_xlat9;
        u_xlat9 = vec4<f32>(x_2894.x, x_2893.x, x_2894.z, x_2893.y);
        let x_2897 : f32 = u_xlat9.y;
        u_xlat12.z = (x_2897 * 0.08163200318813323975f);
        let x_2900 : vec4<f32> = u_xlat9;
        let x_2902 : vec3<f32> = (vec3<f32>(x_2900.z, x_2900.x, x_2900.w) * vec3<f32>(0.08163200318813323975f, 0.08163200318813323975f, 0.08163200318813323975f));
        let x_2903 : vec4<f32> = u_xlat13;
        u_xlat13 = vec4<f32>(x_2902.x, x_2902.y, x_2902.z, x_2903.w);
        let x_2905 : vec4<f32> = u_xlat10;
        let x_2907 : vec2<f32> = (vec2<f32>(x_2905.x, x_2905.y) * vec2<f32>(0.08163200318813323975f, 0.08163200318813323975f));
        let x_2908 : vec4<f32> = u_xlat9;
        u_xlat9 = vec4<f32>(x_2907.x, x_2907.y, x_2908.z, x_2908.w);
        let x_2911 : f32 = u_xlat13.y;
        u_xlat12.x = x_2911;
        let x_2913 : vec2<f32> = u_xlat60;
        let x_2916 : vec2<f32> = ((vec2<f32>(x_2913.x, x_2913.x) * vec2<f32>(-0.08163200318813323975f, 0.08163200318813323975f)) + vec2<f32>(0.16326400637626647949f, 0.08163200318813323975f));
        let x_2917 : vec4<f32> = u_xlat12;
        u_xlat12 = vec4<f32>(x_2917.x, x_2916.x, x_2917.z, x_2916.y);
        let x_2919 : vec2<f32> = u_xlat60;
        let x_2922 : vec2<f32> = ((vec2<f32>(x_2919.x, x_2919.x) * vec2<f32>(-0.08163200318813323975f, 0.08163200318813323975f)) + vec2<f32>(0.08163200318813323975f, 0.16326400637626647949f));
        let x_2923 : vec4<f32> = u_xlat10;
        u_xlat10 = vec4<f32>(x_2922.x, x_2923.y, x_2922.y, x_2923.w);
        let x_2926 : f32 = u_xlat9.x;
        u_xlat10.y = x_2926;
        let x_2929 : f32 = u_xlat11.y;
        u_xlat10.w = x_2929;
        let x_2931 : vec4<f32> = u_xlat10;
        let x_2932 : vec4<f32> = u_xlat12;
        u_xlat12 = (x_2931 + x_2932);
        let x_2934 : vec2<f32> = u_xlat60;
        let x_2937 : vec2<f32> = ((vec2<f32>(x_2934.y, x_2934.y) * vec2<f32>(-0.08163200318813323975f, 0.08163200318813323975f)) + vec2<f32>(0.16326400637626647949f, 0.08163200318813323975f));
        let x_2938 : vec4<f32> = u_xlat13;
        u_xlat13 = vec4<f32>(x_2938.x, x_2937.x, x_2938.z, x_2937.y);
        let x_2940 : vec2<f32> = u_xlat60;
        let x_2943 : vec2<f32> = ((vec2<f32>(x_2940.y, x_2940.y) * vec2<f32>(-0.08163200318813323975f, 0.08163200318813323975f)) + vec2<f32>(0.08163200318813323975f, 0.16326400637626647949f));
        let x_2944 : vec4<f32> = u_xlat11;
        u_xlat11 = vec4<f32>(x_2943.x, x_2944.y, x_2943.y, x_2944.w);
        let x_2947 : f32 = u_xlat9.y;
        u_xlat11.y = x_2947;
        let x_2949 : vec4<f32> = u_xlat11;
        let x_2950 : vec4<f32> = u_xlat13;
        u_xlat9 = (x_2949 + x_2950);
        let x_2952 : vec4<f32> = u_xlat10;
        let x_2953 : vec4<f32> = u_xlat12;
        u_xlat10 = (x_2952 / x_2953);
        let x_2955 : vec4<f32> = u_xlat10;
        u_xlat10 = (x_2955 + vec4<f32>(-3.5f, -1.5f, 0.5f, 2.5f));
        let x_2957 : vec4<f32> = u_xlat11;
        let x_2958 : vec4<f32> = u_xlat9;
        u_xlat11 = (x_2957 / x_2958);
        let x_2960 : vec4<f32> = u_xlat11;
        u_xlat11 = (x_2960 + vec4<f32>(-3.5f, -1.5f, 0.5f, 2.5f));
        let x_2962 : vec4<f32> = u_xlat10;
        let x_2965 : vec4<f32> = x_372.x_MainLightShadowmapSize;
        u_xlat10 = (vec4<f32>(x_2962.w, x_2962.x, x_2962.y, x_2962.z) * vec4<f32>(x_2965.x, x_2965.x, x_2965.x, x_2965.x));
        let x_2968 : vec4<f32> = u_xlat11;
        let x_2971 : vec4<f32> = x_372.x_MainLightShadowmapSize;
        u_xlat11 = (vec4<f32>(x_2968.x, x_2968.w, x_2968.y, x_2968.z) * vec4<f32>(x_2971.y, x_2971.y, x_2971.y, x_2971.y));
        let x_2974 : vec4<f32> = u_xlat10;
        let x_2975 : vec3<f32> = vec3<f32>(x_2974.y, x_2974.z, x_2974.w);
        let x_2976 : vec4<f32> = u_xlat13;
        u_xlat13 = vec4<f32>(x_2975.x, x_2976.y, x_2975.y, x_2975.z);
        let x_2979 : f32 = u_xlat11.x;
        u_xlat13.y = x_2979;
        let x_2981 : vec4<f32> = u_xlat8;
        let x_2984 : vec4<f32> = x_372.x_MainLightShadowmapSize;
        let x_2987 : vec4<f32> = u_xlat13;
        u_xlat14 = ((vec4<f32>(x_2981.x, x_2981.y, x_2981.x, x_2981.y) * vec4<f32>(x_2984.x, x_2984.y, x_2984.x, x_2984.y)) + vec4<f32>(x_2987.x, x_2987.y, x_2987.z, x_2987.y));
        let x_2990 : vec4<f32> = u_xlat8;
        let x_2993 : vec4<f32> = x_372.x_MainLightShadowmapSize;
        let x_2996 : vec4<f32> = u_xlat13;
        u_xlat60 = ((vec2<f32>(x_2990.x, x_2990.y) * vec2<f32>(x_2993.x, x_2993.y)) + vec2<f32>(x_2996.w, x_2996.y));
        let x_3000 : f32 = u_xlat13.y;
        u_xlat10.y = x_3000;
        let x_3003 : f32 = u_xlat11.z;
        u_xlat13.y = x_3003;
        let x_3005 : vec4<f32> = u_xlat8;
        let x_3008 : vec4<f32> = x_372.x_MainLightShadowmapSize;
        let x_3011 : vec4<f32> = u_xlat13;
        u_xlat15 = ((vec4<f32>(x_3005.x, x_3005.y, x_3005.x, x_3005.y) * vec4<f32>(x_3008.x, x_3008.y, x_3008.x, x_3008.y)) + vec4<f32>(x_3011.x, x_3011.y, x_3011.z, x_3011.y));
        let x_3014 : vec4<f32> = u_xlat8;
        let x_3017 : vec4<f32> = x_372.x_MainLightShadowmapSize;
        let x_3020 : vec4<f32> = u_xlat13;
        let x_3022 : vec2<f32> = ((vec2<f32>(x_3014.x, x_3014.y) * vec2<f32>(x_3017.x, x_3017.y)) + vec2<f32>(x_3020.w, x_3020.y));
        let x_3023 : vec4<f32> = u_xlat16;
        u_xlat16 = vec4<f32>(x_3022.x, x_3022.y, x_3023.z, x_3023.w);
        let x_3026 : f32 = u_xlat13.y;
        u_xlat10.z = x_3026;
        let x_3028 : vec4<f32> = u_xlat8;
        let x_3031 : vec4<f32> = x_372.x_MainLightShadowmapSize;
        let x_3034 : vec4<f32> = u_xlat10;
        u_xlat17 = ((vec4<f32>(x_3028.x, x_3028.y, x_3028.x, x_3028.y) * vec4<f32>(x_3031.x, x_3031.y, x_3031.x, x_3031.y)) + vec4<f32>(x_3034.x, x_3034.y, x_3034.x, x_3034.z));
        let x_3038 : f32 = u_xlat11.w;
        u_xlat13.y = x_3038;
        let x_3040 : vec4<f32> = u_xlat8;
        let x_3043 : vec4<f32> = x_372.x_MainLightShadowmapSize;
        let x_3046 : vec4<f32> = u_xlat13;
        u_xlat18 = ((vec4<f32>(x_3040.x, x_3040.y, x_3040.x, x_3040.y) * vec4<f32>(x_3043.x, x_3043.y, x_3043.x, x_3043.y)) + vec4<f32>(x_3046.x, x_3046.y, x_3046.z, x_3046.y));
        let x_3049 : vec4<f32> = u_xlat8;
        let x_3052 : vec4<f32> = x_372.x_MainLightShadowmapSize;
        let x_3055 : vec4<f32> = u_xlat13;
        u_xlat36 = ((vec2<f32>(x_3049.x, x_3049.y) * vec2<f32>(x_3052.x, x_3052.y)) + vec2<f32>(x_3055.w, x_3055.y));
        let x_3059 : f32 = u_xlat13.y;
        u_xlat10.w = x_3059;
        let x_3061 : vec4<f32> = u_xlat8;
        let x_3064 : vec4<f32> = x_372.x_MainLightShadowmapSize;
        let x_3067 : vec4<f32> = u_xlat10;
        u_xlat68 = ((vec2<f32>(x_3061.x, x_3061.y) * vec2<f32>(x_3064.x, x_3064.y)) + vec2<f32>(x_3067.x, x_3067.w));
        let x_3070 : vec4<f32> = u_xlat13;
        let x_3071 : vec3<f32> = vec3<f32>(x_3070.x, x_3070.z, x_3070.w);
        let x_3072 : vec4<f32> = u_xlat11;
        u_xlat11 = vec4<f32>(x_3071.x, x_3072.y, x_3071.y, x_3071.z);
        let x_3074 : vec4<f32> = u_xlat8;
        let x_3077 : vec4<f32> = x_372.x_MainLightShadowmapSize;
        let x_3080 : vec4<f32> = u_xlat11;
        u_xlat13 = ((vec4<f32>(x_3074.x, x_3074.y, x_3074.x, x_3074.y) * vec4<f32>(x_3077.x, x_3077.y, x_3077.x, x_3077.y)) + vec4<f32>(x_3080.x, x_3080.y, x_3080.z, x_3080.y));
        let x_3083 : vec4<f32> = u_xlat8;
        let x_3086 : vec4<f32> = x_372.x_MainLightShadowmapSize;
        let x_3089 : vec4<f32> = u_xlat11;
        u_xlat63 = ((vec2<f32>(x_3083.x, x_3083.y) * vec2<f32>(x_3086.x, x_3086.y)) + vec2<f32>(x_3089.w, x_3089.y));
        let x_3093 : f32 = u_xlat10.x;
        u_xlat11.x = x_3093;
        let x_3095 : vec4<f32> = u_xlat8;
        let x_3098 : vec4<f32> = x_372.x_MainLightShadowmapSize;
        let x_3101 : vec4<f32> = u_xlat11;
        let x_3103 : vec2<f32> = ((vec2<f32>(x_3095.x, x_3095.y) * vec2<f32>(x_3098.x, x_3098.y)) + vec2<f32>(x_3101.x, x_3101.y));
        let x_3104 : vec4<f32> = u_xlat8;
        u_xlat8 = vec4<f32>(x_3103.x, x_3103.y, x_3104.z, x_3104.w);
        let x_3106 : vec4<f32> = u_xlat9;
        let x_3108 : vec4<f32> = u_xlat12;
        u_xlat19 = (vec4<f32>(x_3106.x, x_3106.x, x_3106.x, x_3106.x) * x_3108);
        let x_3110 : vec4<f32> = u_xlat9;
        let x_3112 : vec4<f32> = u_xlat12;
        u_xlat20 = (vec4<f32>(x_3110.y, x_3110.y, x_3110.y, x_3110.y) * x_3112);
        let x_3114 : vec4<f32> = u_xlat9;
        let x_3116 : vec4<f32> = u_xlat12;
        u_xlat21 = (vec4<f32>(x_3114.z, x_3114.z, x_3114.z, x_3114.z) * x_3116);
        let x_3118 : vec4<f32> = u_xlat9;
        let x_3120 : vec4<f32> = u_xlat12;
        u_xlat9 = (vec4<f32>(x_3118.w, x_3118.w, x_3118.w, x_3118.w) * x_3120);
        let x_3123 : vec4<f32> = u_xlat14;
        let x_3124 : vec2<f32> = vec2<f32>(x_3123.x, x_3123.y);
        let x_3126 : f32 = u_xlat2.z;
        txVec43 = vec3<f32>(x_3124.x, x_3124.y, x_3126);
        let x_3133 : vec3<f32> = txVec43;
        let x_3135 : f32 = textureSampleCompareLevel(x_MainLightShadowmapTexture, sampler_LinearClampCompare, x_3133.xy, x_3133.z);
        u_xlat84 = x_3135;
        let x_3137 : vec4<f32> = u_xlat14;
        let x_3138 : vec2<f32> = vec2<f32>(x_3137.z, x_3137.w);
        let x_3140 : f32 = u_xlat2.z;
        txVec44 = vec3<f32>(x_3138.x, x_3138.y, x_3140);
        let x_3147 : vec3<f32> = txVec44;
        let x_3149 : f32 = textureSampleCompareLevel(x_MainLightShadowmapTexture, sampler_LinearClampCompare, x_3147.xy, x_3147.z);
        u_xlat85 = x_3149;
        let x_3150 : f32 = u_xlat85;
        let x_3152 : f32 = u_xlat19.y;
        u_xlat85 = (x_3150 * x_3152);
        let x_3155 : f32 = u_xlat19.x;
        let x_3156 : f32 = u_xlat84;
        let x_3158 : f32 = u_xlat85;
        u_xlat84 = ((x_3155 * x_3156) + x_3158);
        let x_3161 : vec2<f32> = u_xlat60;
        let x_3163 : f32 = u_xlat2.z;
        txVec45 = vec3<f32>(x_3161.x, x_3161.y, x_3163);
        let x_3170 : vec3<f32> = txVec45;
        let x_3172 : f32 = textureSampleCompareLevel(x_MainLightShadowmapTexture, sampler_LinearClampCompare, x_3170.xy, x_3170.z);
        u_xlat85 = x_3172;
        let x_3174 : f32 = u_xlat19.z;
        let x_3175 : f32 = u_xlat85;
        let x_3177 : f32 = u_xlat84;
        u_xlat84 = ((x_3174 * x_3175) + x_3177);
        let x_3180 : vec4<f32> = u_xlat17;
        let x_3181 : vec2<f32> = vec2<f32>(x_3180.x, x_3180.y);
        let x_3183 : f32 = u_xlat2.z;
        txVec46 = vec3<f32>(x_3181.x, x_3181.y, x_3183);
        let x_3190 : vec3<f32> = txVec46;
        let x_3192 : f32 = textureSampleCompareLevel(x_MainLightShadowmapTexture, sampler_LinearClampCompare, x_3190.xy, x_3190.z);
        u_xlat85 = x_3192;
        let x_3194 : f32 = u_xlat19.w;
        let x_3195 : f32 = u_xlat85;
        let x_3197 : f32 = u_xlat84;
        u_xlat84 = ((x_3194 * x_3195) + x_3197);
        let x_3200 : vec4<f32> = u_xlat15;
        let x_3201 : vec2<f32> = vec2<f32>(x_3200.x, x_3200.y);
        let x_3203 : f32 = u_xlat2.z;
        txVec47 = vec3<f32>(x_3201.x, x_3201.y, x_3203);
        let x_3210 : vec3<f32> = txVec47;
        let x_3212 : f32 = textureSampleCompareLevel(x_MainLightShadowmapTexture, sampler_LinearClampCompare, x_3210.xy, x_3210.z);
        u_xlat85 = x_3212;
        let x_3214 : f32 = u_xlat20.x;
        let x_3215 : f32 = u_xlat85;
        let x_3217 : f32 = u_xlat84;
        u_xlat84 = ((x_3214 * x_3215) + x_3217);
        let x_3220 : vec4<f32> = u_xlat15;
        let x_3221 : vec2<f32> = vec2<f32>(x_3220.z, x_3220.w);
        let x_3223 : f32 = u_xlat2.z;
        txVec48 = vec3<f32>(x_3221.x, x_3221.y, x_3223);
        let x_3230 : vec3<f32> = txVec48;
        let x_3232 : f32 = textureSampleCompareLevel(x_MainLightShadowmapTexture, sampler_LinearClampCompare, x_3230.xy, x_3230.z);
        u_xlat85 = x_3232;
        let x_3234 : f32 = u_xlat20.y;
        let x_3235 : f32 = u_xlat85;
        let x_3237 : f32 = u_xlat84;
        u_xlat84 = ((x_3234 * x_3235) + x_3237);
        let x_3240 : vec4<f32> = u_xlat16;
        let x_3241 : vec2<f32> = vec2<f32>(x_3240.x, x_3240.y);
        let x_3243 : f32 = u_xlat2.z;
        txVec49 = vec3<f32>(x_3241.x, x_3241.y, x_3243);
        let x_3250 : vec3<f32> = txVec49;
        let x_3252 : f32 = textureSampleCompareLevel(x_MainLightShadowmapTexture, sampler_LinearClampCompare, x_3250.xy, x_3250.z);
        u_xlat85 = x_3252;
        let x_3254 : f32 = u_xlat20.z;
        let x_3255 : f32 = u_xlat85;
        let x_3257 : f32 = u_xlat84;
        u_xlat84 = ((x_3254 * x_3255) + x_3257);
        let x_3260 : vec4<f32> = u_xlat17;
        let x_3261 : vec2<f32> = vec2<f32>(x_3260.z, x_3260.w);
        let x_3263 : f32 = u_xlat2.z;
        txVec50 = vec3<f32>(x_3261.x, x_3261.y, x_3263);
        let x_3270 : vec3<f32> = txVec50;
        let x_3272 : f32 = textureSampleCompareLevel(x_MainLightShadowmapTexture, sampler_LinearClampCompare, x_3270.xy, x_3270.z);
        u_xlat85 = x_3272;
        let x_3274 : f32 = u_xlat20.w;
        let x_3275 : f32 = u_xlat85;
        let x_3277 : f32 = u_xlat84;
        u_xlat84 = ((x_3274 * x_3275) + x_3277);
        let x_3280 : vec4<f32> = u_xlat18;
        let x_3281 : vec2<f32> = vec2<f32>(x_3280.x, x_3280.y);
        let x_3283 : f32 = u_xlat2.z;
        txVec51 = vec3<f32>(x_3281.x, x_3281.y, x_3283);
        let x_3290 : vec3<f32> = txVec51;
        let x_3292 : f32 = textureSampleCompareLevel(x_MainLightShadowmapTexture, sampler_LinearClampCompare, x_3290.xy, x_3290.z);
        u_xlat85 = x_3292;
        let x_3294 : f32 = u_xlat21.x;
        let x_3295 : f32 = u_xlat85;
        let x_3297 : f32 = u_xlat84;
        u_xlat84 = ((x_3294 * x_3295) + x_3297);
        let x_3300 : vec4<f32> = u_xlat18;
        let x_3301 : vec2<f32> = vec2<f32>(x_3300.z, x_3300.w);
        let x_3303 : f32 = u_xlat2.z;
        txVec52 = vec3<f32>(x_3301.x, x_3301.y, x_3303);
        let x_3310 : vec3<f32> = txVec52;
        let x_3312 : f32 = textureSampleCompareLevel(x_MainLightShadowmapTexture, sampler_LinearClampCompare, x_3310.xy, x_3310.z);
        u_xlat85 = x_3312;
        let x_3314 : f32 = u_xlat21.y;
        let x_3315 : f32 = u_xlat85;
        let x_3317 : f32 = u_xlat84;
        u_xlat84 = ((x_3314 * x_3315) + x_3317);
        let x_3320 : vec2<f32> = u_xlat36;
        let x_3322 : f32 = u_xlat2.z;
        txVec53 = vec3<f32>(x_3320.x, x_3320.y, x_3322);
        let x_3329 : vec3<f32> = txVec53;
        let x_3331 : f32 = textureSampleCompareLevel(x_MainLightShadowmapTexture, sampler_LinearClampCompare, x_3329.xy, x_3329.z);
        u_xlat85 = x_3331;
        let x_3333 : f32 = u_xlat21.z;
        let x_3334 : f32 = u_xlat85;
        let x_3336 : f32 = u_xlat84;
        u_xlat84 = ((x_3333 * x_3334) + x_3336);
        let x_3339 : vec2<f32> = u_xlat68;
        let x_3341 : f32 = u_xlat2.z;
        txVec54 = vec3<f32>(x_3339.x, x_3339.y, x_3341);
        let x_3348 : vec3<f32> = txVec54;
        let x_3350 : f32 = textureSampleCompareLevel(x_MainLightShadowmapTexture, sampler_LinearClampCompare, x_3348.xy, x_3348.z);
        u_xlat85 = x_3350;
        let x_3352 : f32 = u_xlat21.w;
        let x_3353 : f32 = u_xlat85;
        let x_3355 : f32 = u_xlat84;
        u_xlat84 = ((x_3352 * x_3353) + x_3355);
        let x_3358 : vec4<f32> = u_xlat13;
        let x_3359 : vec2<f32> = vec2<f32>(x_3358.x, x_3358.y);
        let x_3361 : f32 = u_xlat2.z;
        txVec55 = vec3<f32>(x_3359.x, x_3359.y, x_3361);
        let x_3368 : vec3<f32> = txVec55;
        let x_3370 : f32 = textureSampleCompareLevel(x_MainLightShadowmapTexture, sampler_LinearClampCompare, x_3368.xy, x_3368.z);
        u_xlat85 = x_3370;
        let x_3372 : f32 = u_xlat9.x;
        let x_3373 : f32 = u_xlat85;
        let x_3375 : f32 = u_xlat84;
        u_xlat84 = ((x_3372 * x_3373) + x_3375);
        let x_3378 : vec4<f32> = u_xlat13;
        let x_3379 : vec2<f32> = vec2<f32>(x_3378.z, x_3378.w);
        let x_3381 : f32 = u_xlat2.z;
        txVec56 = vec3<f32>(x_3379.x, x_3379.y, x_3381);
        let x_3388 : vec3<f32> = txVec56;
        let x_3390 : f32 = textureSampleCompareLevel(x_MainLightShadowmapTexture, sampler_LinearClampCompare, x_3388.xy, x_3388.z);
        u_xlat85 = x_3390;
        let x_3392 : f32 = u_xlat9.y;
        let x_3393 : f32 = u_xlat85;
        let x_3395 : f32 = u_xlat84;
        u_xlat84 = ((x_3392 * x_3393) + x_3395);
        let x_3398 : vec2<f32> = u_xlat63;
        let x_3400 : f32 = u_xlat2.z;
        txVec57 = vec3<f32>(x_3398.x, x_3398.y, x_3400);
        let x_3407 : vec3<f32> = txVec57;
        let x_3409 : f32 = textureSampleCompareLevel(x_MainLightShadowmapTexture, sampler_LinearClampCompare, x_3407.xy, x_3407.z);
        u_xlat85 = x_3409;
        let x_3411 : f32 = u_xlat9.z;
        let x_3412 : f32 = u_xlat85;
        let x_3414 : f32 = u_xlat84;
        u_xlat84 = ((x_3411 * x_3412) + x_3414);
        let x_3417 : vec4<f32> = u_xlat8;
        let x_3418 : vec2<f32> = vec2<f32>(x_3417.x, x_3417.y);
        let x_3420 : f32 = u_xlat2.z;
        txVec58 = vec3<f32>(x_3418.x, x_3418.y, x_3420);
        let x_3427 : vec3<f32> = txVec58;
        let x_3429 : f32 = textureSampleCompareLevel(x_MainLightShadowmapTexture, sampler_LinearClampCompare, x_3427.xy, x_3427.z);
        u_xlat85 = x_3429;
        let x_3431 : f32 = u_xlat9.w;
        let x_3432 : f32 = u_xlat85;
        let x_3434 : f32 = u_xlat84;
        u_xlat0.x = ((x_3431 * x_3432) + x_3434);
      }
    }
  } else {
    let x_3439 : vec4<f32> = u_xlat2;
    let x_3440 : vec2<f32> = vec2<f32>(x_3439.x, x_3439.y);
    let x_3442 : f32 = u_xlat2.z;
    txVec59 = vec3<f32>(x_3440.x, x_3440.y, x_3442);
    let x_3449 : vec3<f32> = txVec59;
    let x_3451 : f32 = textureSampleCompareLevel(x_MainLightShadowmapTexture, sampler_LinearClampCompare, x_3449.xy, x_3449.z);
    u_xlat0.x = x_3451;
  }
  let x_3454 : f32 = u_xlat0.x;
  let x_3456 : f32 = x_372.x_MainLightShadowParams.x;
  let x_3458 : f32 = u_xlat80;
  u_xlat0.x = ((x_3454 * x_3456) + x_3458);
  let x_3462 : bool = u_xlatb3.x;
  if (x_3462) {
    x_3463 = 1.0f;
  } else {
    let x_3468 : f32 = u_xlat0.x;
    x_3463 = x_3468;
  }
  let x_3469 : f32 = x_3463;
  u_xlat0.x = x_3469;
  let x_3471 : vec3<f32> = vs_INTERP8;
  let x_3473 : vec3<f32> = x_149.x_WorldSpaceCameraPos;
  let x_3475 : vec3<f32> = (x_3471 + -(x_3473));
  let x_3476 : vec4<f32> = u_xlat2;
  u_xlat2 = vec4<f32>(x_3475.x, x_3475.y, x_3475.z, x_3476.w);
  let x_3478 : vec4<f32> = u_xlat2;
  let x_3480 : vec4<f32> = u_xlat2;
  u_xlat2.x = dot(vec3<f32>(x_3478.x, x_3478.y, x_3478.z), vec3<f32>(x_3480.x, x_3480.y, x_3480.z));
  let x_3486 : f32 = u_xlat2.x;
  let x_3488 : f32 = x_372.x_MainLightShadowParams.z;
  let x_3491 : f32 = x_372.x_MainLightShadowParams.w;
  u_xlat28.x = ((x_3486 * x_3488) + x_3491);
  let x_3495 : f32 = u_xlat28.x;
  u_xlat28.x = clamp(x_3495, 0.0f, 1.0f);
  let x_3500 : f32 = u_xlat0.x;
  u_xlat54 = (-(x_3500) + 1.0f);
  let x_3504 : f32 = u_xlat28.x;
  let x_3505 : f32 = u_xlat54;
  let x_3508 : f32 = u_xlat0.x;
  u_xlat0.x = ((x_3504 * x_3505) + x_3508);
  let x_3519 : f32 = x_3517.x_MainLightCookieTextureFormat;
  u_xlatb28.x = !((x_3519 == -1.0f));
  let x_3523 : bool = u_xlatb28.x;
  if (x_3523) {
    let x_3526 : vec3<f32> = vs_INTERP8;
    let x_3529 : vec4<f32> = x_3517.x_MainLightWorldToLight[1i];
    let x_3531 : vec2<f32> = (vec2<f32>(x_3526.y, x_3526.y) * vec2<f32>(x_3529.x, x_3529.y));
    let x_3532 : vec3<f32> = u_xlat28;
    u_xlat28 = vec3<f32>(x_3531.x, x_3531.y, x_3532.z);
    let x_3535 : vec4<f32> = x_3517.x_MainLightWorldToLight[0i];
    let x_3537 : vec3<f32> = vs_INTERP8;
    let x_3540 : vec3<f32> = u_xlat28;
    let x_3542 : vec2<f32> = ((vec2<f32>(x_3535.x, x_3535.y) * vec2<f32>(x_3537.x, x_3537.x)) + vec2<f32>(x_3540.x, x_3540.y));
    let x_3543 : vec3<f32> = u_xlat28;
    u_xlat28 = vec3<f32>(x_3542.x, x_3542.y, x_3543.z);
    let x_3546 : vec4<f32> = x_3517.x_MainLightWorldToLight[2i];
    let x_3548 : vec3<f32> = vs_INTERP8;
    let x_3551 : vec3<f32> = u_xlat28;
    let x_3553 : vec2<f32> = ((vec2<f32>(x_3546.x, x_3546.y) * vec2<f32>(x_3548.z, x_3548.z)) + vec2<f32>(x_3551.x, x_3551.y));
    let x_3554 : vec3<f32> = u_xlat28;
    u_xlat28 = vec3<f32>(x_3553.x, x_3553.y, x_3554.z);
    let x_3556 : vec3<f32> = u_xlat28;
    let x_3559 : vec4<f32> = x_3517.x_MainLightWorldToLight[3i];
    let x_3561 : vec2<f32> = (vec2<f32>(x_3556.x, x_3556.y) + vec2<f32>(x_3559.x, x_3559.y));
    let x_3562 : vec3<f32> = u_xlat28;
    u_xlat28 = vec3<f32>(x_3561.x, x_3561.y, x_3562.z);
    let x_3564 : vec3<f32> = u_xlat28;
    let x_3567 : vec2<f32> = ((vec2<f32>(x_3564.x, x_3564.y) * vec2<f32>(0.5f, 0.5f)) + vec2<f32>(0.5f, 0.5f));
    let x_3568 : vec3<f32> = u_xlat28;
    u_xlat28 = vec3<f32>(x_3567.x, x_3567.y, x_3568.z);
    let x_3575 : vec3<f32> = u_xlat28;
    let x_3578 : f32 = x_149.x_GlobalMipBias.x;
    let x_3579 : vec4<f32> = textureSampleBias(x_MainLightCookieTexture, sampler_MainLightCookieTexture, vec2<f32>(x_3575.x, x_3575.y), x_3578);
    u_xlat8 = x_3579;
    let x_3581 : f32 = x_3517.x_MainLightCookieTextureFormat;
    let x_3583 : f32 = x_3517.x_MainLightCookieTextureFormat;
    let x_3585 : f32 = x_3517.x_MainLightCookieTextureFormat;
    let x_3587 : f32 = x_3517.x_MainLightCookieTextureFormat;
    let x_3588 : vec4<f32> = vec4<f32>(x_3581, x_3583, x_3585, x_3587);
    let x_3595 : vec4<bool> = (vec4<f32>(x_3588.x, x_3588.y, x_3588.z, x_3588.w) == vec4<f32>(0.0f, 1.0f, 0.0f, 0.0f));
    u_xlatb28 = vec2<bool>(x_3595.x, x_3595.y);
    let x_3598 : bool = u_xlatb28.y;
    if (x_3598) {
      let x_3603 : f32 = u_xlat8.w;
      x_3599 = x_3603;
    } else {
      let x_3606 : f32 = u_xlat8.x;
      x_3599 = x_3606;
    }
    let x_3607 : f32 = x_3599;
    u_xlat54 = x_3607;
    let x_3609 : bool = u_xlatb28.x;
    if (x_3609) {
      let x_3613 : vec4<f32> = u_xlat8;
      x_3610 = vec3<f32>(x_3613.x, x_3613.y, x_3613.z);
    } else {
      let x_3616 : f32 = u_xlat54;
      x_3610 = vec3<f32>(x_3616, x_3616, x_3616);
    }
    let x_3618 : vec3<f32> = x_3610;
    u_xlat28 = x_3618;
  } else {
    u_xlat28.x = 1.0f;
    u_xlat28.y = 1.0f;
    u_xlat28.z = 1.0f;
  }
  let x_3623 : vec3<f32> = u_xlat28;
  let x_3625 : vec4<f32> = x_149.x_MainLightColor;
  u_xlat28 = (x_3623 * vec3<f32>(x_3625.x, x_3625.y, x_3625.z));
  let x_3628 : vec3<f32> = u_xlat4;
  let x_3630 : vec4<f32> = u_xlat5;
  u_xlat3.x = dot(-(x_3628), vec3<f32>(x_3630.x, x_3630.y, x_3630.z));
  let x_3635 : f32 = u_xlat3.x;
  let x_3637 : f32 = u_xlat3.x;
  u_xlat3.x = (x_3635 + x_3637);
  let x_3640 : vec4<f32> = u_xlat5;
  let x_3642 : vec4<f32> = u_xlat3;
  let x_3646 : vec3<f32> = u_xlat4;
  let x_3648 : vec3<f32> = ((vec3<f32>(x_3640.x, x_3640.y, x_3640.z) * -(vec3<f32>(x_3642.x, x_3642.x, x_3642.x))) + -(x_3646));
  let x_3649 : vec4<f32> = u_xlat8;
  u_xlat8 = vec4<f32>(x_3648.x, x_3648.y, x_3648.z, x_3649.w);
  let x_3651 : vec4<f32> = u_xlat5;
  let x_3653 : vec3<f32> = u_xlat4;
  u_xlat3.x = dot(vec3<f32>(x_3651.x, x_3651.y, x_3651.z), x_3653);
  let x_3657 : f32 = u_xlat3.x;
  u_xlat3.x = clamp(x_3657, 0.0f, 1.0f);
  let x_3661 : f32 = u_xlat3.x;
  u_xlat3.x = (-(x_3661) + 1.0f);
  let x_3666 : f32 = u_xlat3.x;
  let x_3668 : f32 = u_xlat3.x;
  u_xlat3.x = (x_3666 * x_3668);
  let x_3672 : f32 = u_xlat3.x;
  let x_3674 : f32 = u_xlat3.x;
  u_xlat3.x = (x_3672 * x_3674);
  let x_3678 : f32 = u_xlat52.x;
  u_xlat84 = ((-(x_3678) * 0.69999998807907104492f) + 1.70000004768371582031f);
  let x_3685 : f32 = u_xlat52.x;
  let x_3686 : f32 = u_xlat84;
  u_xlat52.x = (x_3685 * x_3686);
  let x_3690 : f32 = u_xlat52.x;
  u_xlat52.x = (x_3690 * 6.0f);
  let x_3702 : vec4<f32> = u_xlat8;
  let x_3705 : f32 = u_xlat52.x;
  let x_3706 : vec4<f32> = textureSampleLevel(unity_SpecCube0, samplerunity_SpecCube0, vec3<f32>(x_3702.x, x_3702.y, x_3702.z), x_3705);
  u_xlat8 = x_3706;
  let x_3708 : f32 = u_xlat8.w;
  u_xlat52.x = (x_3708 + -1.0f);
  let x_3712 : f32 = x_83.unity_SpecCube0_HDR.w;
  let x_3714 : f32 = u_xlat52.x;
  u_xlat52.x = ((x_3712 * x_3714) + 1.0f);
  let x_3719 : f32 = u_xlat52.x;
  u_xlat52.x = max(x_3719, 0.0f);
  let x_3723 : f32 = u_xlat52.x;
  u_xlat52.x = log2(x_3723);
  let x_3727 : f32 = u_xlat52.x;
  let x_3729 : f32 = x_83.unity_SpecCube0_HDR.y;
  u_xlat52.x = (x_3727 * x_3729);
  let x_3733 : f32 = u_xlat52.x;
  u_xlat52.x = exp2(x_3733);
  let x_3737 : f32 = u_xlat52.x;
  let x_3739 : f32 = x_83.unity_SpecCube0_HDR.x;
  u_xlat52.x = (x_3737 * x_3739);
  let x_3742 : vec4<f32> = u_xlat8;
  let x_3744 : vec2<f32> = u_xlat52;
  let x_3746 : vec3<f32> = (vec3<f32>(x_3742.x, x_3742.y, x_3742.z) * vec3<f32>(x_3744.x, x_3744.x, x_3744.x));
  let x_3747 : vec4<f32> = u_xlat8;
  u_xlat8 = vec4<f32>(x_3746.x, x_3746.y, x_3746.z, x_3747.w);
  let x_3749 : f32 = u_xlat78;
  let x_3751 : f32 = u_xlat78;
  u_xlat52 = ((vec2<f32>(x_3749, x_3749) * vec2<f32>(x_3751, x_3751)) + vec2<f32>(-1.0f, 1.0f));
  let x_3757 : f32 = u_xlat52.y;
  u_xlat78 = (1.0f / x_3757);
  let x_3759 : f32 = u_xlat81;
  u_xlat81 = (x_3759 + -0.03999999910593032837f);
  let x_3763 : f32 = u_xlat3.x;
  let x_3764 : f32 = u_xlat81;
  u_xlat3.x = ((x_3763 * x_3764) + 0.03999999910593032837f);
  let x_3769 : f32 = u_xlat78;
  let x_3771 : f32 = u_xlat3.x;
  u_xlat78 = (x_3769 * x_3771);
  let x_3773 : f32 = u_xlat78;
  let x_3775 : vec4<f32> = u_xlat8;
  let x_3777 : vec3<f32> = (vec3<f32>(x_3773, x_3773, x_3773) * vec3<f32>(x_3775.x, x_3775.y, x_3775.z));
  let x_3778 : vec4<f32> = u_xlat8;
  u_xlat8 = vec4<f32>(x_3777.x, x_3777.y, x_3777.z, x_3778.w);
  let x_3780 : vec4<f32> = u_xlat6;
  let x_3782 : vec3<f32> = u_xlat7;
  let x_3784 : vec4<f32> = u_xlat8;
  let x_3786 : vec3<f32> = ((vec3<f32>(x_3780.x, x_3780.y, x_3780.z) * x_3782) + vec3<f32>(x_3784.x, x_3784.y, x_3784.z));
  let x_3787 : vec4<f32> = u_xlat6;
  u_xlat6 = vec4<f32>(x_3786.x, x_3786.y, x_3786.z, x_3787.w);
  let x_3790 : f32 = u_xlat0.x;
  let x_3792 : f32 = x_83.unity_LightData.z;
  u_xlat0.x = (x_3790 * x_3792);
  let x_3795 : vec4<f32> = u_xlat5;
  let x_3798 : vec4<f32> = x_149.x_MainLightPosition;
  u_xlat78 = dot(vec3<f32>(x_3795.x, x_3795.y, x_3795.z), vec3<f32>(x_3798.x, x_3798.y, x_3798.z));
  let x_3801 : f32 = u_xlat78;
  u_xlat78 = clamp(x_3801, 0.0f, 1.0f);
  let x_3803 : f32 = u_xlat78;
  let x_3805 : f32 = u_xlat0.x;
  u_xlat0.x = (x_3803 * x_3805);
  let x_3808 : vec4<f32> = u_xlat0;
  let x_3810 : vec3<f32> = u_xlat28;
  u_xlat28 = (vec3<f32>(x_3808.x, x_3808.x, x_3808.x) * x_3810);
  let x_3812 : vec3<f32> = u_xlat4;
  let x_3814 : vec4<f32> = x_149.x_MainLightPosition;
  let x_3816 : vec3<f32> = (x_3812 + vec3<f32>(x_3814.x, x_3814.y, x_3814.z));
  let x_3817 : vec4<f32> = u_xlat8;
  u_xlat8 = vec4<f32>(x_3816.x, x_3816.y, x_3816.z, x_3817.w);
  let x_3819 : vec4<f32> = u_xlat8;
  let x_3821 : vec4<f32> = u_xlat8;
  u_xlat0.x = dot(vec3<f32>(x_3819.x, x_3819.y, x_3819.z), vec3<f32>(x_3821.x, x_3821.y, x_3821.z));
  let x_3826 : f32 = u_xlat0.x;
  u_xlat0.x = max(x_3826, 1.17549435e-38f);
  let x_3830 : f32 = u_xlat0.x;
  u_xlat0.x = inverseSqrt(x_3830);
  let x_3833 : vec4<f32> = u_xlat0;
  let x_3835 : vec4<f32> = u_xlat8;
  let x_3837 : vec3<f32> = (vec3<f32>(x_3833.x, x_3833.x, x_3833.x) * vec3<f32>(x_3835.x, x_3835.y, x_3835.z));
  let x_3838 : vec4<f32> = u_xlat8;
  u_xlat8 = vec4<f32>(x_3837.x, x_3837.y, x_3837.z, x_3838.w);
  let x_3840 : vec4<f32> = u_xlat5;
  let x_3842 : vec4<f32> = u_xlat8;
  u_xlat0.x = dot(vec3<f32>(x_3840.x, x_3840.y, x_3840.z), vec3<f32>(x_3842.x, x_3842.y, x_3842.z));
  let x_3847 : f32 = u_xlat0.x;
  u_xlat0.x = clamp(x_3847, 0.0f, 1.0f);
  let x_3851 : vec4<f32> = x_149.x_MainLightPosition;
  let x_3853 : vec4<f32> = u_xlat8;
  u_xlat0.w = dot(vec3<f32>(x_3851.x, x_3851.y, x_3851.z), vec3<f32>(x_3853.x, x_3853.y, x_3853.z));
  let x_3858 : f32 = u_xlat0.w;
  u_xlat0.w = clamp(x_3858, 0.0f, 1.0f);
  let x_3861 : vec4<f32> = u_xlat0;
  let x_3863 : vec4<f32> = u_xlat0;
  let x_3865 : vec2<f32> = (vec2<f32>(x_3861.x, x_3861.w) * vec2<f32>(x_3863.x, x_3863.w));
  let x_3866 : vec4<f32> = u_xlat0;
  u_xlat0 = vec4<f32>(x_3865.x, x_3866.y, x_3866.z, x_3865.y);
  let x_3869 : f32 = u_xlat0.x;
  let x_3871 : f32 = u_xlat52.x;
  u_xlat0.x = ((x_3869 * x_3871) + 1.00001001358032226562f);
  let x_3877 : f32 = u_xlat0.x;
  let x_3879 : f32 = u_xlat0.x;
  u_xlat0.x = (x_3877 * x_3879);
  let x_3883 : f32 = u_xlat0.w;
  u_xlat78 = max(x_3883, 0.10000000149011611938f);
  let x_3886 : f32 = u_xlat78;
  let x_3888 : f32 = u_xlat0.x;
  u_xlat0.x = (x_3886 * x_3888);
  let x_3891 : f32 = u_xlat82;
  let x_3893 : f32 = u_xlat0.x;
  u_xlat0.x = (x_3891 * x_3893);
  let x_3897 : f32 = u_xlat55.x;
  let x_3899 : f32 = u_xlat0.x;
  u_xlat0.x = (x_3897 / x_3899);
  let x_3902 : vec4<f32> = u_xlat0;
  let x_3906 : vec3<f32> = u_xlat7;
  let x_3907 : vec3<f32> = ((vec3<f32>(x_3902.x, x_3902.x, x_3902.x) * vec3<f32>(0.03999999910593032837f, 0.03999999910593032837f, 0.03999999910593032837f)) + x_3906);
  let x_3908 : vec4<f32> = u_xlat8;
  u_xlat8 = vec4<f32>(x_3907.x, x_3907.y, x_3907.z, x_3908.w);
  let x_3910 : vec3<f32> = u_xlat28;
  let x_3911 : vec4<f32> = u_xlat8;
  u_xlat28 = (x_3910 * vec3<f32>(x_3911.x, x_3911.y, x_3911.z));
  let x_3915 : f32 = x_149.x_AdditionalLightsCount.x;
  let x_3917 : f32 = x_83.unity_LightData.y;
  u_xlat0.x = min(x_3915, x_3917);
  let x_3921 : f32 = u_xlat0.x;
  u_xlatu0 = bitcast<u32>(i32(x_3921));
  let x_3925 : f32 = u_xlat2.x;
  let x_3928 : f32 = x_372.x_AdditionalShadowFadeParams.x;
  let x_3931 : f32 = x_372.x_AdditionalShadowFadeParams.y;
  u_xlat78 = ((x_3925 * x_3928) + x_3931);
  let x_3933 : f32 = u_xlat78;
  u_xlat78 = clamp(x_3933, 0.0f, 1.0f);
  let x_3936 : f32 = x_3517.x_AdditionalLightsCookieAtlasTextureFormat;
  let x_3938 : f32 = x_3517.x_AdditionalLightsCookieAtlasTextureFormat;
  let x_3940 : f32 = x_3517.x_AdditionalLightsCookieAtlasTextureFormat;
  let x_3942 : f32 = x_3517.x_AdditionalLightsCookieAtlasTextureFormat;
  let x_3943 : vec4<f32> = vec4<f32>(x_3936, x_3938, x_3940, x_3942);
  let x_3950 : vec4<bool> = (vec4<f32>(x_3943.x, x_3943.y, x_3943.z, x_3943.w) == vec4<f32>(0.0f, 0.0f, 0.0f, 1.0f));
  let x_3951 : vec2<bool> = vec2<bool>(x_3950.x, x_3950.w);
  let x_3952 : vec4<bool> = u_xlatb3;
  u_xlatb3 = vec4<bool>(x_3951.x, x_3952.y, x_3952.z, x_3951.y);
  u_xlat8.x = 0.0f;
  u_xlat8.y = 0.0f;
  u_xlat8.z = 0.0f;
  u_xlatu_loop_1 = 0u;
  loop {
    let x_3963 : u32 = u_xlatu_loop_1;
    let x_3964 : u32 = u_xlatu0;
    if ((x_3963 < x_3964)) {
    } else {
      break;
    }
    let x_3967 : u32 = u_xlatu_loop_1;
    u_xlatu84 = (x_3967 >> 2u);
    let x_3970 : u32 = u_xlatu_loop_1;
    u_xlati85 = bitcast<i32>((x_3970 & 3u));
    let x_3973 : u32 = u_xlatu84;
    let x_3976 : vec4<f32> = x_83.unity_LightIndices[bitcast<i32>(x_3973)];
    let x_3986 : i32 = u_xlati85;
    indexable = array<vec4<u32>, 4u>(vec4<u32>(1065353216u, 0u, 0u, 0u), vec4<u32>(0u, 1065353216u, 0u, 0u), vec4<u32>(0u, 0u, 1065353216u, 0u), vec4<u32>(0u, 0u, 0u, 1065353216u));
    let x_3991 : vec4<u32> = indexable[x_3986];
    u_xlat84 = dot(x_3976, bitcast<vec4<f32>>(x_3991));
    let x_3995 : f32 = u_xlat84;
    u_xlati84 = i32(x_3995);
    let x_3997 : vec3<f32> = vs_INTERP8;
    let x_4008 : i32 = u_xlati84;
    let x_4010 : vec4<f32> = x_4007.x_AdditionalLightsPosition[x_4008];
    let x_4013 : i32 = u_xlati84;
    let x_4015 : vec4<f32> = x_4007.x_AdditionalLightsPosition[x_4013];
    let x_4017 : vec3<f32> = ((-(x_3997) * vec3<f32>(x_4010.w, x_4010.w, x_4010.w)) + vec3<f32>(x_4015.x, x_4015.y, x_4015.z));
    let x_4018 : vec4<f32> = u_xlat9;
    u_xlat9 = vec4<f32>(x_4017.x, x_4017.y, x_4017.z, x_4018.w);
    let x_4020 : vec4<f32> = u_xlat9;
    let x_4022 : vec4<f32> = u_xlat9;
    u_xlat85 = dot(vec3<f32>(x_4020.x, x_4020.y, x_4020.z), vec3<f32>(x_4022.x, x_4022.y, x_4022.z));
    let x_4025 : f32 = u_xlat85;
    u_xlat85 = max(x_4025, 0.00006103515625f);
    let x_4029 : f32 = u_xlat85;
    u_xlat86 = inverseSqrt(x_4029);
    let x_4031 : f32 = u_xlat86;
    let x_4033 : vec4<f32> = u_xlat9;
    let x_4035 : vec3<f32> = (vec3<f32>(x_4031, x_4031, x_4031) * vec3<f32>(x_4033.x, x_4033.y, x_4033.z));
    let x_4036 : vec4<f32> = u_xlat10;
    u_xlat10 = vec4<f32>(x_4035.x, x_4035.y, x_4035.z, x_4036.w);
    let x_4039 : f32 = u_xlat85;
    u_xlat87 = (1.0f / x_4039);
    let x_4041 : f32 = u_xlat85;
    let x_4042 : i32 = u_xlati84;
    let x_4044 : f32 = x_4007.x_AdditionalLightsAttenuation[x_4042].x;
    u_xlat85 = (x_4041 * x_4044);
    let x_4046 : f32 = u_xlat85;
    let x_4048 : f32 = u_xlat85;
    u_xlat85 = ((-(x_4046) * x_4048) + 1.0f);
    let x_4051 : f32 = u_xlat85;
    u_xlat85 = max(x_4051, 0.0f);
    let x_4053 : f32 = u_xlat85;
    let x_4054 : f32 = u_xlat85;
    u_xlat85 = (x_4053 * x_4054);
    let x_4056 : f32 = u_xlat85;
    let x_4057 : f32 = u_xlat87;
    u_xlat85 = (x_4056 * x_4057);
    let x_4059 : i32 = u_xlati84;
    let x_4061 : vec4<f32> = x_4007.x_AdditionalLightsSpotDir[x_4059];
    let x_4063 : vec4<f32> = u_xlat10;
    u_xlat87 = dot(vec3<f32>(x_4061.x, x_4061.y, x_4061.z), vec3<f32>(x_4063.x, x_4063.y, x_4063.z));
    let x_4066 : f32 = u_xlat87;
    let x_4067 : i32 = u_xlati84;
    let x_4069 : f32 = x_4007.x_AdditionalLightsAttenuation[x_4067].z;
    let x_4071 : i32 = u_xlati84;
    let x_4073 : f32 = x_4007.x_AdditionalLightsAttenuation[x_4071].w;
    u_xlat87 = ((x_4066 * x_4069) + x_4073);
    let x_4075 : f32 = u_xlat87;
    u_xlat87 = clamp(x_4075, 0.0f, 1.0f);
    let x_4077 : f32 = u_xlat87;
    let x_4078 : f32 = u_xlat87;
    u_xlat87 = (x_4077 * x_4078);
    let x_4080 : f32 = u_xlat85;
    let x_4081 : f32 = u_xlat87;
    u_xlat85 = (x_4080 * x_4081);
    let x_4085 : i32 = u_xlati84;
    let x_4087 : f32 = x_372.x_AdditionalShadowParams[x_4085].w;
    u_xlati87 = i32(x_4087);
    let x_4090 : i32 = u_xlati87;
    u_xlatb88 = (x_4090 >= 0i);
    let x_4092 : bool = u_xlatb88;
    if (x_4092) {
      let x_4096 : i32 = u_xlati84;
      let x_4098 : f32 = x_372.x_AdditionalShadowParams[x_4096].z;
      u_xlatb88 = any(!((vec4<f32>(0.0f, 0.0f, 0.0f, 0.0f) == vec4<f32>(x_4098, x_4098, x_4098, x_4098))));
      let x_4102 : bool = u_xlatb88;
      if (x_4102) {
        let x_4106 : vec4<f32> = u_xlat10;
        let x_4109 : vec4<f32> = u_xlat10;
        let x_4112 : vec4<bool> = (abs(vec4<f32>(x_4106.z, x_4106.z, x_4106.y, x_4106.z)) >= abs(vec4<f32>(x_4109.x, x_4109.y, x_4109.x, x_4109.x)));
        let x_4114 : vec3<bool> = vec3<bool>(x_4112.x, x_4112.y, x_4112.z);
        let x_4115 : vec4<bool> = u_xlatb11;
        u_xlatb11 = vec4<bool>(x_4114.x, x_4114.y, x_4114.z, x_4115.w);
        let x_4118 : bool = u_xlatb11.y;
        let x_4120 : bool = u_xlatb11.x;
        u_xlatb88 = (x_4118 & x_4120);
        let x_4122 : vec4<f32> = u_xlat10;
        let x_4125 : vec4<bool> = (-(vec4<f32>(x_4122.z, x_4122.y, x_4122.z, x_4122.x)) < vec4<f32>(0.0f, 0.0f, 0.0f, 0.0f));
        let x_4126 : vec3<bool> = vec3<bool>(x_4125.x, x_4125.y, x_4125.w);
        let x_4127 : vec4<bool> = u_xlatb11;
        u_xlatb11 = vec4<bool>(x_4126.x, x_4126.y, x_4127.z, x_4126.z);
        let x_4130 : bool = u_xlatb11.x;
        u_xlat11.x = select(4.0f, 5.0f, x_4130);
        let x_4135 : bool = u_xlatb11.y;
        u_xlat11.y = select(2.0f, 3.0f, x_4135);
        let x_4140 : bool = u_xlatb11.w;
        u_xlat89 = select(0.0f, 1.0f, x_4140);
        let x_4144 : bool = u_xlatb11.z;
        if (x_4144) {
          let x_4149 : f32 = u_xlat11.y;
          x_4145 = x_4149;
        } else {
          let x_4151 : f32 = u_xlat89;
          x_4145 = x_4151;
        }
        let x_4152 : f32 = x_4145;
        u_xlat37.x = x_4152;
        let x_4155 : bool = u_xlatb88;
        if (x_4155) {
          let x_4160 : f32 = u_xlat11.x;
          x_4156 = x_4160;
        } else {
          let x_4163 : f32 = u_xlat37.x;
          x_4156 = x_4163;
        }
        let x_4164 : f32 = x_4156;
        u_xlat88 = x_4164;
        let x_4165 : i32 = u_xlati84;
        let x_4167 : f32 = x_372.x_AdditionalShadowParams[x_4165].w;
        u_xlat11.x = trunc(x_4167);
        let x_4170 : f32 = u_xlat88;
        let x_4172 : f32 = u_xlat11.x;
        u_xlat88 = (x_4170 + x_4172);
        let x_4174 : f32 = u_xlat88;
        u_xlati87 = i32(x_4174);
      }
      let x_4176 : i32 = u_xlati87;
      u_xlati87 = (x_4176 << bitcast<u32>(2i));
      let x_4178 : vec3<f32> = vs_INTERP8;
      let x_4181 : i32 = u_xlati87;
      let x_4184 : i32 = u_xlati87;
      let x_4188 : vec4<f32> = x_372.x_AdditionalLightsWorldToShadow[((x_4181 + 1i) / 4i)][((x_4184 + 1i) % 4i)];
      u_xlat11 = (vec4<f32>(x_4178.y, x_4178.y, x_4178.y, x_4178.y) * x_4188);
      let x_4190 : i32 = u_xlati87;
      let x_4192 : i32 = u_xlati87;
      let x_4195 : vec4<f32> = x_372.x_AdditionalLightsWorldToShadow[(x_4190 / 4i)][(x_4192 % 4i)];
      let x_4196 : vec3<f32> = vs_INTERP8;
      let x_4199 : vec4<f32> = u_xlat11;
      u_xlat11 = ((x_4195 * vec4<f32>(x_4196.x, x_4196.x, x_4196.x, x_4196.x)) + x_4199);
      let x_4201 : i32 = u_xlati87;
      let x_4204 : i32 = u_xlati87;
      let x_4208 : vec4<f32> = x_372.x_AdditionalLightsWorldToShadow[((x_4201 + 2i) / 4i)][((x_4204 + 2i) % 4i)];
      let x_4209 : vec3<f32> = vs_INTERP8;
      let x_4212 : vec4<f32> = u_xlat11;
      u_xlat11 = ((x_4208 * vec4<f32>(x_4209.z, x_4209.z, x_4209.z, x_4209.z)) + x_4212);
      let x_4214 : vec4<f32> = u_xlat11;
      let x_4215 : i32 = u_xlati87;
      let x_4218 : i32 = u_xlati87;
      let x_4222 : vec4<f32> = x_372.x_AdditionalLightsWorldToShadow[((x_4215 + 3i) / 4i)][((x_4218 + 3i) % 4i)];
      u_xlat11 = (x_4214 + x_4222);
      let x_4224 : vec4<f32> = u_xlat11;
      let x_4226 : vec4<f32> = u_xlat11;
      let x_4228 : vec3<f32> = (vec3<f32>(x_4224.x, x_4224.y, x_4224.z) / vec3<f32>(x_4226.w, x_4226.w, x_4226.w));
      let x_4229 : vec4<f32> = u_xlat11;
      u_xlat11 = vec4<f32>(x_4228.x, x_4228.y, x_4228.z, x_4229.w);
      let x_4232 : i32 = u_xlati84;
      let x_4234 : f32 = x_372.x_AdditionalShadowParams[x_4232].y;
      u_xlatb87 = (0.0f < x_4234);
      let x_4236 : bool = u_xlatb87;
      if (x_4236) {
        let x_4239 : i32 = u_xlati84;
        let x_4241 : f32 = x_372.x_AdditionalShadowParams[x_4239].y;
        u_xlatb87 = (1.0f == x_4241);
        let x_4243 : bool = u_xlatb87;
        if (x_4243) {
          let x_4246 : vec4<f32> = u_xlat11;
          let x_4250 : vec4<f32> = x_372.x_AdditionalShadowOffset0;
          u_xlat12 = (vec4<f32>(x_4246.x, x_4246.y, x_4246.x, x_4246.y) + x_4250);
          let x_4253 : vec4<f32> = u_xlat12;
          let x_4254 : vec2<f32> = vec2<f32>(x_4253.x, x_4253.y);
          let x_4256 : f32 = u_xlat11.z;
          txVec60 = vec3<f32>(x_4254.x, x_4254.y, x_4256);
          let x_4264 : vec3<f32> = txVec60;
          let x_4266 : f32 = textureSampleCompareLevel(x_AdditionalLightsShadowmapTexture, sampler_LinearClampCompare, x_4264.xy, x_4264.z);
          u_xlat13.x = x_4266;
          let x_4269 : vec4<f32> = u_xlat12;
          let x_4270 : vec2<f32> = vec2<f32>(x_4269.z, x_4269.w);
          let x_4272 : f32 = u_xlat11.z;
          txVec61 = vec3<f32>(x_4270.x, x_4270.y, x_4272);
          let x_4279 : vec3<f32> = txVec61;
          let x_4281 : f32 = textureSampleCompareLevel(x_AdditionalLightsShadowmapTexture, sampler_LinearClampCompare, x_4279.xy, x_4279.z);
          u_xlat13.y = x_4281;
          let x_4283 : vec4<f32> = u_xlat11;
          let x_4286 : vec4<f32> = x_372.x_AdditionalShadowOffset1;
          u_xlat12 = (vec4<f32>(x_4283.x, x_4283.y, x_4283.x, x_4283.y) + x_4286);
          let x_4289 : vec4<f32> = u_xlat12;
          let x_4290 : vec2<f32> = vec2<f32>(x_4289.x, x_4289.y);
          let x_4292 : f32 = u_xlat11.z;
          txVec62 = vec3<f32>(x_4290.x, x_4290.y, x_4292);
          let x_4299 : vec3<f32> = txVec62;
          let x_4301 : f32 = textureSampleCompareLevel(x_AdditionalLightsShadowmapTexture, sampler_LinearClampCompare, x_4299.xy, x_4299.z);
          u_xlat13.z = x_4301;
          let x_4304 : vec4<f32> = u_xlat12;
          let x_4305 : vec2<f32> = vec2<f32>(x_4304.z, x_4304.w);
          let x_4307 : f32 = u_xlat11.z;
          txVec63 = vec3<f32>(x_4305.x, x_4305.y, x_4307);
          let x_4314 : vec3<f32> = txVec63;
          let x_4316 : f32 = textureSampleCompareLevel(x_AdditionalLightsShadowmapTexture, sampler_LinearClampCompare, x_4314.xy, x_4314.z);
          u_xlat13.w = x_4316;
          let x_4318 : vec4<f32> = u_xlat13;
          u_xlat87 = dot(x_4318, vec4<f32>(0.25f, 0.25f, 0.25f, 0.25f));
        } else {
          let x_4321 : i32 = u_xlati84;
          let x_4323 : f32 = x_372.x_AdditionalShadowParams[x_4321].y;
          u_xlatb88 = (2.0f == x_4323);
          let x_4325 : bool = u_xlatb88;
          if (x_4325) {
            let x_4328 : vec4<f32> = u_xlat11;
            let x_4332 : vec4<f32> = x_372.x_AdditionalShadowmapSize;
            let x_4335 : vec2<f32> = ((vec2<f32>(x_4328.x, x_4328.y) * vec2<f32>(x_4332.z, x_4332.w)) + vec2<f32>(0.5f, 0.5f));
            let x_4336 : vec4<f32> = u_xlat12;
            u_xlat12 = vec4<f32>(x_4335.x, x_4335.y, x_4336.z, x_4336.w);
            let x_4338 : vec4<f32> = u_xlat12;
            let x_4340 : vec2<f32> = floor(vec2<f32>(x_4338.x, x_4338.y));
            let x_4341 : vec4<f32> = u_xlat12;
            u_xlat12 = vec4<f32>(x_4340.x, x_4340.y, x_4341.z, x_4341.w);
            let x_4344 : vec4<f32> = u_xlat11;
            let x_4347 : vec4<f32> = x_372.x_AdditionalShadowmapSize;
            let x_4350 : vec4<f32> = u_xlat12;
            u_xlat64 = ((vec2<f32>(x_4344.x, x_4344.y) * vec2<f32>(x_4347.z, x_4347.w)) + -(vec2<f32>(x_4350.x, x_4350.y)));
            let x_4354 : vec2<f32> = u_xlat64;
            u_xlat13 = (vec4<f32>(x_4354.x, x_4354.x, x_4354.y, x_4354.y) + vec4<f32>(0.5f, 1.0f, 0.5f, 1.0f));
            let x_4357 : vec4<f32> = u_xlat13;
            let x_4359 : vec4<f32> = u_xlat13;
            u_xlat14 = (vec4<f32>(x_4357.x, x_4357.x, x_4357.z, x_4357.z) * vec4<f32>(x_4359.x, x_4359.x, x_4359.z, x_4359.z));
            let x_4362 : vec4<f32> = u_xlat14;
            let x_4364 : vec2<f32> = (vec2<f32>(x_4362.y, x_4362.w) * vec2<f32>(0.07999999821186065674f, 0.07999999821186065674f));
            let x_4365 : vec4<f32> = u_xlat13;
            u_xlat13 = vec4<f32>(x_4364.x, x_4365.y, x_4364.y, x_4365.w);
            let x_4367 : vec4<f32> = u_xlat14;
            let x_4370 : vec2<f32> = u_xlat64;
            let x_4372 : vec2<f32> = ((vec2<f32>(x_4367.x, x_4367.z) * vec2<f32>(0.5f, 0.5f)) + -(x_4370));
            let x_4373 : vec4<f32> = u_xlat14;
            u_xlat14 = vec4<f32>(x_4372.x, x_4372.y, x_4373.z, x_4373.w);
            let x_4376 : vec2<f32> = u_xlat64;
            u_xlat66 = (-(x_4376) + vec2<f32>(1.0f, 1.0f));
            let x_4379 : vec2<f32> = u_xlat64;
            let x_4380 : vec2<f32> = min(x_4379, vec2<f32>(0.0f, 0.0f));
            let x_4381 : vec4<f32> = u_xlat15;
            u_xlat15 = vec4<f32>(x_4380.x, x_4380.y, x_4381.z, x_4381.w);
            let x_4383 : vec4<f32> = u_xlat15;
            let x_4386 : vec4<f32> = u_xlat15;
            let x_4389 : vec2<f32> = u_xlat66;
            let x_4390 : vec2<f32> = ((-(vec2<f32>(x_4383.x, x_4383.y)) * vec2<f32>(x_4386.x, x_4386.y)) + x_4389);
            let x_4391 : vec4<f32> = u_xlat15;
            u_xlat15 = vec4<f32>(x_4390.x, x_4390.y, x_4391.z, x_4391.w);
            let x_4393 : vec2<f32> = u_xlat64;
            u_xlat64 = max(x_4393, vec2<f32>(0.0f, 0.0f));
            let x_4395 : vec2<f32> = u_xlat64;
            let x_4397 : vec2<f32> = u_xlat64;
            let x_4399 : vec4<f32> = u_xlat13;
            u_xlat64 = ((-(x_4395) * x_4397) + vec2<f32>(x_4399.y, x_4399.w));
            let x_4402 : vec4<f32> = u_xlat15;
            let x_4404 : vec2<f32> = (vec2<f32>(x_4402.x, x_4402.y) + vec2<f32>(1.0f, 1.0f));
            let x_4405 : vec4<f32> = u_xlat15;
            u_xlat15 = vec4<f32>(x_4404.x, x_4404.y, x_4405.z, x_4405.w);
            let x_4407 : vec2<f32> = u_xlat64;
            u_xlat64 = (x_4407 + vec2<f32>(1.0f, 1.0f));
            let x_4409 : vec4<f32> = u_xlat14;
            let x_4411 : vec2<f32> = (vec2<f32>(x_4409.x, x_4409.y) * vec2<f32>(0.15999999642372131348f, 0.15999999642372131348f));
            let x_4412 : vec4<f32> = u_xlat16;
            u_xlat16 = vec4<f32>(x_4411.x, x_4411.y, x_4412.z, x_4412.w);
            let x_4414 : vec2<f32> = u_xlat66;
            let x_4415 : vec2<f32> = (x_4414 * vec2<f32>(0.15999999642372131348f, 0.15999999642372131348f));
            let x_4416 : vec4<f32> = u_xlat14;
            u_xlat14 = vec4<f32>(x_4415.x, x_4415.y, x_4416.z, x_4416.w);
            let x_4418 : vec4<f32> = u_xlat15;
            let x_4420 : vec2<f32> = (vec2<f32>(x_4418.x, x_4418.y) * vec2<f32>(0.15999999642372131348f, 0.15999999642372131348f));
            let x_4421 : vec4<f32> = u_xlat15;
            u_xlat15 = vec4<f32>(x_4420.x, x_4420.y, x_4421.z, x_4421.w);
            let x_4423 : vec2<f32> = u_xlat64;
            let x_4424 : vec2<f32> = (x_4423 * vec2<f32>(0.15999999642372131348f, 0.15999999642372131348f));
            let x_4425 : vec4<f32> = u_xlat17;
            u_xlat17 = vec4<f32>(x_4424.x, x_4424.y, x_4425.z, x_4425.w);
            let x_4427 : vec4<f32> = u_xlat13;
            u_xlat64 = (vec2<f32>(x_4427.y, x_4427.w) * vec2<f32>(0.15999999642372131348f, 0.15999999642372131348f));
            let x_4431 : f32 = u_xlat15.x;
            u_xlat16.z = x_4431;
            let x_4434 : f32 = u_xlat64.x;
            u_xlat16.w = x_4434;
            let x_4437 : f32 = u_xlat17.x;
            u_xlat14.z = x_4437;
            let x_4440 : f32 = u_xlat13.x;
            u_xlat14.w = x_4440;
            let x_4442 : vec4<f32> = u_xlat14;
            let x_4444 : vec4<f32> = u_xlat16;
            u_xlat18 = (vec4<f32>(x_4442.z, x_4442.w, x_4442.x, x_4442.z) + vec4<f32>(x_4444.z, x_4444.w, x_4444.x, x_4444.z));
            let x_4448 : f32 = u_xlat16.y;
            u_xlat15.z = x_4448;
            let x_4451 : f32 = u_xlat64.y;
            u_xlat15.w = x_4451;
            let x_4454 : f32 = u_xlat14.y;
            u_xlat17.z = x_4454;
            let x_4457 : f32 = u_xlat13.z;
            u_xlat17.w = x_4457;
            let x_4459 : vec4<f32> = u_xlat15;
            let x_4461 : vec4<f32> = u_xlat17;
            let x_4463 : vec3<f32> = (vec3<f32>(x_4459.z, x_4459.y, x_4459.w) + vec3<f32>(x_4461.z, x_4461.y, x_4461.w));
            let x_4464 : vec4<f32> = u_xlat13;
            u_xlat13 = vec4<f32>(x_4463.x, x_4463.y, x_4463.z, x_4464.w);
            let x_4466 : vec4<f32> = u_xlat14;
            let x_4468 : vec4<f32> = u_xlat18;
            let x_4470 : vec3<f32> = (vec3<f32>(x_4466.x, x_4466.z, x_4466.w) / vec3<f32>(x_4468.z, x_4468.w, x_4468.y));
            let x_4471 : vec4<f32> = u_xlat14;
            u_xlat14 = vec4<f32>(x_4470.x, x_4470.y, x_4470.z, x_4471.w);
            let x_4473 : vec4<f32> = u_xlat14;
            let x_4475 : vec3<f32> = (vec3<f32>(x_4473.x, x_4473.y, x_4473.z) + vec3<f32>(-2.5f, -0.5f, 1.5f));
            let x_4476 : vec4<f32> = u_xlat14;
            u_xlat14 = vec4<f32>(x_4475.x, x_4475.y, x_4475.z, x_4476.w);
            let x_4478 : vec4<f32> = u_xlat17;
            let x_4480 : vec4<f32> = u_xlat13;
            let x_4482 : vec3<f32> = (vec3<f32>(x_4478.z, x_4478.y, x_4478.w) / vec3<f32>(x_4480.x, x_4480.y, x_4480.z));
            let x_4483 : vec4<f32> = u_xlat15;
            u_xlat15 = vec4<f32>(x_4482.x, x_4482.y, x_4482.z, x_4483.w);
            let x_4485 : vec4<f32> = u_xlat15;
            let x_4487 : vec3<f32> = (vec3<f32>(x_4485.x, x_4485.y, x_4485.z) + vec3<f32>(-2.5f, -0.5f, 1.5f));
            let x_4488 : vec4<f32> = u_xlat15;
            u_xlat15 = vec4<f32>(x_4487.x, x_4487.y, x_4487.z, x_4488.w);
            let x_4490 : vec4<f32> = u_xlat14;
            let x_4493 : vec4<f32> = x_372.x_AdditionalShadowmapSize;
            let x_4495 : vec3<f32> = (vec3<f32>(x_4490.y, x_4490.x, x_4490.z) * vec3<f32>(x_4493.x, x_4493.x, x_4493.x));
            let x_4496 : vec4<f32> = u_xlat14;
            u_xlat14 = vec4<f32>(x_4495.x, x_4495.y, x_4495.z, x_4496.w);
            let x_4498 : vec4<f32> = u_xlat15;
            let x_4501 : vec4<f32> = x_372.x_AdditionalShadowmapSize;
            let x_4503 : vec3<f32> = (vec3<f32>(x_4498.x, x_4498.y, x_4498.z) * vec3<f32>(x_4501.y, x_4501.y, x_4501.y));
            let x_4504 : vec4<f32> = u_xlat15;
            u_xlat15 = vec4<f32>(x_4503.x, x_4503.y, x_4503.z, x_4504.w);
            let x_4507 : f32 = u_xlat15.x;
            u_xlat14.w = x_4507;
            let x_4509 : vec4<f32> = u_xlat12;
            let x_4512 : vec4<f32> = x_372.x_AdditionalShadowmapSize;
            let x_4515 : vec4<f32> = u_xlat14;
            u_xlat16 = ((vec4<f32>(x_4509.x, x_4509.y, x_4509.x, x_4509.y) * vec4<f32>(x_4512.x, x_4512.y, x_4512.x, x_4512.y)) + vec4<f32>(x_4515.y, x_4515.w, x_4515.x, x_4515.w));
            let x_4518 : vec4<f32> = u_xlat12;
            let x_4521 : vec4<f32> = x_372.x_AdditionalShadowmapSize;
            let x_4524 : vec4<f32> = u_xlat14;
            u_xlat64 = ((vec2<f32>(x_4518.x, x_4518.y) * vec2<f32>(x_4521.x, x_4521.y)) + vec2<f32>(x_4524.z, x_4524.w));
            let x_4528 : f32 = u_xlat14.y;
            u_xlat15.w = x_4528;
            let x_4530 : vec4<f32> = u_xlat15;
            let x_4531 : vec2<f32> = vec2<f32>(x_4530.y, x_4530.z);
            let x_4532 : vec4<f32> = u_xlat14;
            u_xlat14 = vec4<f32>(x_4532.x, x_4531.x, x_4532.z, x_4531.y);
            let x_4534 : vec4<f32> = u_xlat12;
            let x_4537 : vec4<f32> = x_372.x_AdditionalShadowmapSize;
            let x_4540 : vec4<f32> = u_xlat14;
            u_xlat17 = ((vec4<f32>(x_4534.x, x_4534.y, x_4534.x, x_4534.y) * vec4<f32>(x_4537.x, x_4537.y, x_4537.x, x_4537.y)) + vec4<f32>(x_4540.x, x_4540.y, x_4540.z, x_4540.y));
            let x_4543 : vec4<f32> = u_xlat12;
            let x_4546 : vec4<f32> = x_372.x_AdditionalShadowmapSize;
            let x_4549 : vec4<f32> = u_xlat15;
            u_xlat15 = ((vec4<f32>(x_4543.x, x_4543.y, x_4543.x, x_4543.y) * vec4<f32>(x_4546.x, x_4546.y, x_4546.x, x_4546.y)) + vec4<f32>(x_4549.w, x_4549.y, x_4549.w, x_4549.z));
            let x_4552 : vec4<f32> = u_xlat12;
            let x_4555 : vec4<f32> = x_372.x_AdditionalShadowmapSize;
            let x_4558 : vec4<f32> = u_xlat14;
            u_xlat14 = ((vec4<f32>(x_4552.x, x_4552.y, x_4552.x, x_4552.y) * vec4<f32>(x_4555.x, x_4555.y, x_4555.x, x_4555.y)) + vec4<f32>(x_4558.x, x_4558.w, x_4558.z, x_4558.w));
            let x_4561 : vec4<f32> = u_xlat13;
            let x_4563 : vec4<f32> = u_xlat18;
            u_xlat19 = (vec4<f32>(x_4561.x, x_4561.x, x_4561.x, x_4561.y) * vec4<f32>(x_4563.z, x_4563.w, x_4563.y, x_4563.z));
            let x_4566 : vec4<f32> = u_xlat13;
            let x_4568 : vec4<f32> = u_xlat18;
            u_xlat20 = (vec4<f32>(x_4566.y, x_4566.y, x_4566.z, x_4566.z) * x_4568);
            let x_4571 : f32 = u_xlat13.z;
            let x_4573 : f32 = u_xlat18.y;
            u_xlat88 = (x_4571 * x_4573);
            let x_4576 : vec4<f32> = u_xlat16;
            let x_4577 : vec2<f32> = vec2<f32>(x_4576.x, x_4576.y);
            let x_4579 : f32 = u_xlat11.z;
            txVec64 = vec3<f32>(x_4577.x, x_4577.y, x_4579);
            let x_4586 : vec3<f32> = txVec64;
            let x_4588 : f32 = textureSampleCompareLevel(x_AdditionalLightsShadowmapTexture, sampler_LinearClampCompare, x_4586.xy, x_4586.z);
            u_xlat89 = x_4588;
            let x_4590 : vec4<f32> = u_xlat16;
            let x_4591 : vec2<f32> = vec2<f32>(x_4590.z, x_4590.w);
            let x_4593 : f32 = u_xlat11.z;
            txVec65 = vec3<f32>(x_4591.x, x_4591.y, x_4593);
            let x_4600 : vec3<f32> = txVec65;
            let x_4602 : f32 = textureSampleCompareLevel(x_AdditionalLightsShadowmapTexture, sampler_LinearClampCompare, x_4600.xy, x_4600.z);
            u_xlat12.x = x_4602;
            let x_4605 : f32 = u_xlat12.x;
            let x_4607 : f32 = u_xlat19.y;
            u_xlat12.x = (x_4605 * x_4607);
            let x_4611 : f32 = u_xlat19.x;
            let x_4612 : f32 = u_xlat89;
            let x_4615 : f32 = u_xlat12.x;
            u_xlat89 = ((x_4611 * x_4612) + x_4615);
            let x_4618 : vec2<f32> = u_xlat64;
            let x_4620 : f32 = u_xlat11.z;
            txVec66 = vec3<f32>(x_4618.x, x_4618.y, x_4620);
            let x_4627 : vec3<f32> = txVec66;
            let x_4629 : f32 = textureSampleCompareLevel(x_AdditionalLightsShadowmapTexture, sampler_LinearClampCompare, x_4627.xy, x_4627.z);
            u_xlat12.x = x_4629;
            let x_4632 : f32 = u_xlat19.z;
            let x_4634 : f32 = u_xlat12.x;
            let x_4636 : f32 = u_xlat89;
            u_xlat89 = ((x_4632 * x_4634) + x_4636);
            let x_4639 : vec4<f32> = u_xlat15;
            let x_4640 : vec2<f32> = vec2<f32>(x_4639.x, x_4639.y);
            let x_4642 : f32 = u_xlat11.z;
            txVec67 = vec3<f32>(x_4640.x, x_4640.y, x_4642);
            let x_4649 : vec3<f32> = txVec67;
            let x_4651 : f32 = textureSampleCompareLevel(x_AdditionalLightsShadowmapTexture, sampler_LinearClampCompare, x_4649.xy, x_4649.z);
            u_xlat12.x = x_4651;
            let x_4654 : f32 = u_xlat19.w;
            let x_4656 : f32 = u_xlat12.x;
            let x_4658 : f32 = u_xlat89;
            u_xlat89 = ((x_4654 * x_4656) + x_4658);
            let x_4661 : vec4<f32> = u_xlat17;
            let x_4662 : vec2<f32> = vec2<f32>(x_4661.x, x_4661.y);
            let x_4664 : f32 = u_xlat11.z;
            txVec68 = vec3<f32>(x_4662.x, x_4662.y, x_4664);
            let x_4671 : vec3<f32> = txVec68;
            let x_4673 : f32 = textureSampleCompareLevel(x_AdditionalLightsShadowmapTexture, sampler_LinearClampCompare, x_4671.xy, x_4671.z);
            u_xlat12.x = x_4673;
            let x_4676 : f32 = u_xlat20.x;
            let x_4678 : f32 = u_xlat12.x;
            let x_4680 : f32 = u_xlat89;
            u_xlat89 = ((x_4676 * x_4678) + x_4680);
            let x_4683 : vec4<f32> = u_xlat17;
            let x_4684 : vec2<f32> = vec2<f32>(x_4683.z, x_4683.w);
            let x_4686 : f32 = u_xlat11.z;
            txVec69 = vec3<f32>(x_4684.x, x_4684.y, x_4686);
            let x_4693 : vec3<f32> = txVec69;
            let x_4695 : f32 = textureSampleCompareLevel(x_AdditionalLightsShadowmapTexture, sampler_LinearClampCompare, x_4693.xy, x_4693.z);
            u_xlat12.x = x_4695;
            let x_4698 : f32 = u_xlat20.y;
            let x_4700 : f32 = u_xlat12.x;
            let x_4702 : f32 = u_xlat89;
            u_xlat89 = ((x_4698 * x_4700) + x_4702);
            let x_4705 : vec4<f32> = u_xlat15;
            let x_4706 : vec2<f32> = vec2<f32>(x_4705.z, x_4705.w);
            let x_4708 : f32 = u_xlat11.z;
            txVec70 = vec3<f32>(x_4706.x, x_4706.y, x_4708);
            let x_4715 : vec3<f32> = txVec70;
            let x_4717 : f32 = textureSampleCompareLevel(x_AdditionalLightsShadowmapTexture, sampler_LinearClampCompare, x_4715.xy, x_4715.z);
            u_xlat12.x = x_4717;
            let x_4720 : f32 = u_xlat20.z;
            let x_4722 : f32 = u_xlat12.x;
            let x_4724 : f32 = u_xlat89;
            u_xlat89 = ((x_4720 * x_4722) + x_4724);
            let x_4727 : vec4<f32> = u_xlat14;
            let x_4728 : vec2<f32> = vec2<f32>(x_4727.x, x_4727.y);
            let x_4730 : f32 = u_xlat11.z;
            txVec71 = vec3<f32>(x_4728.x, x_4728.y, x_4730);
            let x_4737 : vec3<f32> = txVec71;
            let x_4739 : f32 = textureSampleCompareLevel(x_AdditionalLightsShadowmapTexture, sampler_LinearClampCompare, x_4737.xy, x_4737.z);
            u_xlat12.x = x_4739;
            let x_4742 : f32 = u_xlat20.w;
            let x_4744 : f32 = u_xlat12.x;
            let x_4746 : f32 = u_xlat89;
            u_xlat89 = ((x_4742 * x_4744) + x_4746);
            let x_4749 : vec4<f32> = u_xlat14;
            let x_4750 : vec2<f32> = vec2<f32>(x_4749.z, x_4749.w);
            let x_4752 : f32 = u_xlat11.z;
            txVec72 = vec3<f32>(x_4750.x, x_4750.y, x_4752);
            let x_4759 : vec3<f32> = txVec72;
            let x_4761 : f32 = textureSampleCompareLevel(x_AdditionalLightsShadowmapTexture, sampler_LinearClampCompare, x_4759.xy, x_4759.z);
            u_xlat12.x = x_4761;
            let x_4763 : f32 = u_xlat88;
            let x_4765 : f32 = u_xlat12.x;
            let x_4767 : f32 = u_xlat89;
            u_xlat87 = ((x_4763 * x_4765) + x_4767);
          } else {
            let x_4770 : vec4<f32> = u_xlat11;
            let x_4773 : vec4<f32> = x_372.x_AdditionalShadowmapSize;
            let x_4776 : vec2<f32> = ((vec2<f32>(x_4770.x, x_4770.y) * vec2<f32>(x_4773.z, x_4773.w)) + vec2<f32>(0.5f, 0.5f));
            let x_4777 : vec4<f32> = u_xlat12;
            u_xlat12 = vec4<f32>(x_4776.x, x_4776.y, x_4777.z, x_4777.w);
            let x_4779 : vec4<f32> = u_xlat12;
            let x_4781 : vec2<f32> = floor(vec2<f32>(x_4779.x, x_4779.y));
            let x_4782 : vec4<f32> = u_xlat12;
            u_xlat12 = vec4<f32>(x_4781.x, x_4781.y, x_4782.z, x_4782.w);
            let x_4784 : vec4<f32> = u_xlat11;
            let x_4787 : vec4<f32> = x_372.x_AdditionalShadowmapSize;
            let x_4790 : vec4<f32> = u_xlat12;
            u_xlat64 = ((vec2<f32>(x_4784.x, x_4784.y) * vec2<f32>(x_4787.z, x_4787.w)) + -(vec2<f32>(x_4790.x, x_4790.y)));
            let x_4794 : vec2<f32> = u_xlat64;
            u_xlat13 = (vec4<f32>(x_4794.x, x_4794.x, x_4794.y, x_4794.y) + vec4<f32>(0.5f, 1.0f, 0.5f, 1.0f));
            let x_4797 : vec4<f32> = u_xlat13;
            let x_4799 : vec4<f32> = u_xlat13;
            u_xlat14 = (vec4<f32>(x_4797.x, x_4797.x, x_4797.z, x_4797.z) * vec4<f32>(x_4799.x, x_4799.x, x_4799.z, x_4799.z));
            let x_4802 : vec4<f32> = u_xlat14;
            let x_4804 : vec2<f32> = (vec2<f32>(x_4802.y, x_4802.w) * vec2<f32>(0.04081600159406661987f, 0.04081600159406661987f));
            let x_4805 : vec4<f32> = u_xlat15;
            u_xlat15 = vec4<f32>(x_4805.x, x_4804.x, x_4805.z, x_4804.y);
            let x_4807 : vec4<f32> = u_xlat14;
            let x_4810 : vec2<f32> = u_xlat64;
            let x_4812 : vec2<f32> = ((vec2<f32>(x_4807.x, x_4807.z) * vec2<f32>(0.5f, 0.5f)) + -(x_4810));
            let x_4813 : vec4<f32> = u_xlat13;
            u_xlat13 = vec4<f32>(x_4812.x, x_4813.y, x_4812.y, x_4813.w);
            let x_4815 : vec2<f32> = u_xlat64;
            let x_4817 : vec2<f32> = (-(x_4815) + vec2<f32>(1.0f, 1.0f));
            let x_4818 : vec4<f32> = u_xlat14;
            u_xlat14 = vec4<f32>(x_4817.x, x_4817.y, x_4818.z, x_4818.w);
            let x_4820 : vec2<f32> = u_xlat64;
            u_xlat66 = min(x_4820, vec2<f32>(0.0f, 0.0f));
            let x_4822 : vec2<f32> = u_xlat66;
            let x_4824 : vec2<f32> = u_xlat66;
            let x_4826 : vec4<f32> = u_xlat14;
            let x_4828 : vec2<f32> = ((-(x_4822) * x_4824) + vec2<f32>(x_4826.x, x_4826.y));
            let x_4829 : vec4<f32> = u_xlat14;
            u_xlat14 = vec4<f32>(x_4828.x, x_4828.y, x_4829.z, x_4829.w);
            let x_4831 : vec2<f32> = u_xlat64;
            u_xlat66 = max(x_4831, vec2<f32>(0.0f, 0.0f));
            let x_4834 : vec2<f32> = u_xlat66;
            let x_4836 : vec2<f32> = u_xlat66;
            let x_4838 : vec4<f32> = u_xlat13;
            let x_4840 : vec2<f32> = ((-(x_4834) * x_4836) + vec2<f32>(x_4838.y, x_4838.w));
            let x_4841 : vec3<f32> = u_xlat39;
            u_xlat39 = vec3<f32>(x_4840.x, x_4841.y, x_4840.y);
            let x_4843 : vec4<f32> = u_xlat14;
            let x_4845 : vec2<f32> = (vec2<f32>(x_4843.x, x_4843.y) + vec2<f32>(2.0f, 2.0f));
            let x_4846 : vec4<f32> = u_xlat14;
            u_xlat14 = vec4<f32>(x_4845.x, x_4845.y, x_4846.z, x_4846.w);
            let x_4848 : vec3<f32> = u_xlat39;
            let x_4850 : vec2<f32> = (vec2<f32>(x_4848.x, x_4848.z) + vec2<f32>(2.0f, 2.0f));
            let x_4851 : vec4<f32> = u_xlat13;
            u_xlat13 = vec4<f32>(x_4851.x, x_4850.x, x_4851.z, x_4850.y);
            let x_4854 : f32 = u_xlat13.y;
            u_xlat16.z = (x_4854 * 0.08163200318813323975f);
            let x_4857 : vec4<f32> = u_xlat13;
            let x_4859 : vec3<f32> = (vec3<f32>(x_4857.z, x_4857.x, x_4857.w) * vec3<f32>(0.08163200318813323975f, 0.08163200318813323975f, 0.08163200318813323975f));
            let x_4860 : vec4<f32> = u_xlat17;
            u_xlat17 = vec4<f32>(x_4859.x, x_4859.y, x_4859.z, x_4860.w);
            let x_4862 : vec4<f32> = u_xlat14;
            let x_4864 : vec2<f32> = (vec2<f32>(x_4862.x, x_4862.y) * vec2<f32>(0.08163200318813323975f, 0.08163200318813323975f));
            let x_4865 : vec4<f32> = u_xlat13;
            u_xlat13 = vec4<f32>(x_4864.x, x_4864.y, x_4865.z, x_4865.w);
            let x_4868 : f32 = u_xlat17.y;
            u_xlat16.x = x_4868;
            let x_4870 : vec2<f32> = u_xlat64;
            let x_4873 : vec2<f32> = ((vec2<f32>(x_4870.x, x_4870.x) * vec2<f32>(-0.08163200318813323975f, 0.08163200318813323975f)) + vec2<f32>(0.16326400637626647949f, 0.08163200318813323975f));
            let x_4874 : vec4<f32> = u_xlat16;
            u_xlat16 = vec4<f32>(x_4874.x, x_4873.x, x_4874.z, x_4873.y);
            let x_4876 : vec2<f32> = u_xlat64;
            let x_4879 : vec2<f32> = ((vec2<f32>(x_4876.x, x_4876.x) * vec2<f32>(-0.08163200318813323975f, 0.08163200318813323975f)) + vec2<f32>(0.08163200318813323975f, 0.16326400637626647949f));
            let x_4880 : vec4<f32> = u_xlat14;
            u_xlat14 = vec4<f32>(x_4879.x, x_4880.y, x_4879.y, x_4880.w);
            let x_4883 : f32 = u_xlat13.x;
            u_xlat14.y = x_4883;
            let x_4886 : f32 = u_xlat15.y;
            u_xlat14.w = x_4886;
            let x_4888 : vec4<f32> = u_xlat14;
            let x_4889 : vec4<f32> = u_xlat16;
            u_xlat16 = (x_4888 + x_4889);
            let x_4891 : vec2<f32> = u_xlat64;
            let x_4894 : vec2<f32> = ((vec2<f32>(x_4891.y, x_4891.y) * vec2<f32>(-0.08163200318813323975f, 0.08163200318813323975f)) + vec2<f32>(0.16326400637626647949f, 0.08163200318813323975f));
            let x_4895 : vec4<f32> = u_xlat17;
            u_xlat17 = vec4<f32>(x_4895.x, x_4894.x, x_4895.z, x_4894.y);
            let x_4897 : vec2<f32> = u_xlat64;
            let x_4900 : vec2<f32> = ((vec2<f32>(x_4897.y, x_4897.y) * vec2<f32>(-0.08163200318813323975f, 0.08163200318813323975f)) + vec2<f32>(0.08163200318813323975f, 0.16326400637626647949f));
            let x_4901 : vec4<f32> = u_xlat15;
            u_xlat15 = vec4<f32>(x_4900.x, x_4901.y, x_4900.y, x_4901.w);
            let x_4904 : f32 = u_xlat13.y;
            u_xlat15.y = x_4904;
            let x_4906 : vec4<f32> = u_xlat15;
            let x_4907 : vec4<f32> = u_xlat17;
            u_xlat13 = (x_4906 + x_4907);
            let x_4909 : vec4<f32> = u_xlat14;
            let x_4910 : vec4<f32> = u_xlat16;
            u_xlat14 = (x_4909 / x_4910);
            let x_4912 : vec4<f32> = u_xlat14;
            u_xlat14 = (x_4912 + vec4<f32>(-3.5f, -1.5f, 0.5f, 2.5f));
            let x_4914 : vec4<f32> = u_xlat15;
            let x_4915 : vec4<f32> = u_xlat13;
            u_xlat15 = (x_4914 / x_4915);
            let x_4917 : vec4<f32> = u_xlat15;
            u_xlat15 = (x_4917 + vec4<f32>(-3.5f, -1.5f, 0.5f, 2.5f));
            let x_4919 : vec4<f32> = u_xlat14;
            let x_4922 : vec4<f32> = x_372.x_AdditionalShadowmapSize;
            u_xlat14 = (vec4<f32>(x_4919.w, x_4919.x, x_4919.y, x_4919.z) * vec4<f32>(x_4922.x, x_4922.x, x_4922.x, x_4922.x));
            let x_4925 : vec4<f32> = u_xlat15;
            let x_4928 : vec4<f32> = x_372.x_AdditionalShadowmapSize;
            u_xlat15 = (vec4<f32>(x_4925.x, x_4925.w, x_4925.y, x_4925.z) * vec4<f32>(x_4928.y, x_4928.y, x_4928.y, x_4928.y));
            let x_4931 : vec4<f32> = u_xlat14;
            let x_4932 : vec3<f32> = vec3<f32>(x_4931.y, x_4931.z, x_4931.w);
            let x_4933 : vec4<f32> = u_xlat17;
            u_xlat17 = vec4<f32>(x_4932.x, x_4933.y, x_4932.y, x_4932.z);
            let x_4936 : f32 = u_xlat15.x;
            u_xlat17.y = x_4936;
            let x_4938 : vec4<f32> = u_xlat12;
            let x_4941 : vec4<f32> = x_372.x_AdditionalShadowmapSize;
            let x_4944 : vec4<f32> = u_xlat17;
            u_xlat18 = ((vec4<f32>(x_4938.x, x_4938.y, x_4938.x, x_4938.y) * vec4<f32>(x_4941.x, x_4941.y, x_4941.x, x_4941.y)) + vec4<f32>(x_4944.x, x_4944.y, x_4944.z, x_4944.y));
            let x_4947 : vec4<f32> = u_xlat12;
            let x_4950 : vec4<f32> = x_372.x_AdditionalShadowmapSize;
            let x_4953 : vec4<f32> = u_xlat17;
            u_xlat64 = ((vec2<f32>(x_4947.x, x_4947.y) * vec2<f32>(x_4950.x, x_4950.y)) + vec2<f32>(x_4953.w, x_4953.y));
            let x_4957 : f32 = u_xlat17.y;
            u_xlat14.y = x_4957;
            let x_4960 : f32 = u_xlat15.z;
            u_xlat17.y = x_4960;
            let x_4962 : vec4<f32> = u_xlat12;
            let x_4965 : vec4<f32> = x_372.x_AdditionalShadowmapSize;
            let x_4968 : vec4<f32> = u_xlat17;
            u_xlat19 = ((vec4<f32>(x_4962.x, x_4962.y, x_4962.x, x_4962.y) * vec4<f32>(x_4965.x, x_4965.y, x_4965.x, x_4965.y)) + vec4<f32>(x_4968.x, x_4968.y, x_4968.z, x_4968.y));
            let x_4971 : vec4<f32> = u_xlat12;
            let x_4974 : vec4<f32> = x_372.x_AdditionalShadowmapSize;
            let x_4977 : vec4<f32> = u_xlat17;
            let x_4979 : vec2<f32> = ((vec2<f32>(x_4971.x, x_4971.y) * vec2<f32>(x_4974.x, x_4974.y)) + vec2<f32>(x_4977.w, x_4977.y));
            let x_4980 : vec4<f32> = u_xlat20;
            u_xlat20 = vec4<f32>(x_4979.x, x_4979.y, x_4980.z, x_4980.w);
            let x_4983 : f32 = u_xlat17.y;
            u_xlat14.z = x_4983;
            let x_4985 : vec4<f32> = u_xlat12;
            let x_4988 : vec4<f32> = x_372.x_AdditionalShadowmapSize;
            let x_4991 : vec4<f32> = u_xlat14;
            u_xlat21 = ((vec4<f32>(x_4985.x, x_4985.y, x_4985.x, x_4985.y) * vec4<f32>(x_4988.x, x_4988.y, x_4988.x, x_4988.y)) + vec4<f32>(x_4991.x, x_4991.y, x_4991.x, x_4991.z));
            let x_4995 : f32 = u_xlat15.w;
            u_xlat17.y = x_4995;
            let x_4998 : vec4<f32> = u_xlat12;
            let x_5001 : vec4<f32> = x_372.x_AdditionalShadowmapSize;
            let x_5004 : vec4<f32> = u_xlat17;
            u_xlat22 = ((vec4<f32>(x_4998.x, x_4998.y, x_4998.x, x_4998.y) * vec4<f32>(x_5001.x, x_5001.y, x_5001.x, x_5001.y)) + vec4<f32>(x_5004.x, x_5004.y, x_5004.z, x_5004.y));
            let x_5008 : vec4<f32> = u_xlat12;
            let x_5011 : vec4<f32> = x_372.x_AdditionalShadowmapSize;
            let x_5014 : vec4<f32> = u_xlat17;
            u_xlat40 = ((vec2<f32>(x_5008.x, x_5008.y) * vec2<f32>(x_5011.x, x_5011.y)) + vec2<f32>(x_5014.w, x_5014.y));
            let x_5018 : f32 = u_xlat17.y;
            u_xlat14.w = x_5018;
            let x_5021 : vec4<f32> = u_xlat12;
            let x_5024 : vec4<f32> = x_372.x_AdditionalShadowmapSize;
            let x_5027 : vec4<f32> = u_xlat14;
            u_xlat72 = ((vec2<f32>(x_5021.x, x_5021.y) * vec2<f32>(x_5024.x, x_5024.y)) + vec2<f32>(x_5027.x, x_5027.w));
            let x_5030 : vec4<f32> = u_xlat17;
            let x_5031 : vec3<f32> = vec3<f32>(x_5030.x, x_5030.z, x_5030.w);
            let x_5032 : vec4<f32> = u_xlat15;
            u_xlat15 = vec4<f32>(x_5031.x, x_5032.y, x_5031.y, x_5031.z);
            let x_5034 : vec4<f32> = u_xlat12;
            let x_5037 : vec4<f32> = x_372.x_AdditionalShadowmapSize;
            let x_5040 : vec4<f32> = u_xlat15;
            u_xlat17 = ((vec4<f32>(x_5034.x, x_5034.y, x_5034.x, x_5034.y) * vec4<f32>(x_5037.x, x_5037.y, x_5037.x, x_5037.y)) + vec4<f32>(x_5040.x, x_5040.y, x_5040.z, x_5040.y));
            let x_5044 : vec4<f32> = u_xlat12;
            let x_5047 : vec4<f32> = x_372.x_AdditionalShadowmapSize;
            let x_5050 : vec4<f32> = u_xlat15;
            u_xlat67 = ((vec2<f32>(x_5044.x, x_5044.y) * vec2<f32>(x_5047.x, x_5047.y)) + vec2<f32>(x_5050.w, x_5050.y));
            let x_5054 : f32 = u_xlat14.x;
            u_xlat15.x = x_5054;
            let x_5056 : vec4<f32> = u_xlat12;
            let x_5059 : vec4<f32> = x_372.x_AdditionalShadowmapSize;
            let x_5062 : vec4<f32> = u_xlat15;
            let x_5064 : vec2<f32> = ((vec2<f32>(x_5056.x, x_5056.y) * vec2<f32>(x_5059.x, x_5059.y)) + vec2<f32>(x_5062.x, x_5062.y));
            let x_5065 : vec4<f32> = u_xlat12;
            u_xlat12 = vec4<f32>(x_5064.x, x_5064.y, x_5065.z, x_5065.w);
            let x_5068 : vec4<f32> = u_xlat13;
            let x_5070 : vec4<f32> = u_xlat16;
            u_xlat23 = (vec4<f32>(x_5068.x, x_5068.x, x_5068.x, x_5068.x) * x_5070);
            let x_5073 : vec4<f32> = u_xlat13;
            let x_5075 : vec4<f32> = u_xlat16;
            u_xlat24 = (vec4<f32>(x_5073.y, x_5073.y, x_5073.y, x_5073.y) * x_5075);
            let x_5078 : vec4<f32> = u_xlat13;
            let x_5080 : vec4<f32> = u_xlat16;
            u_xlat25 = (vec4<f32>(x_5078.z, x_5078.z, x_5078.z, x_5078.z) * x_5080);
            let x_5082 : vec4<f32> = u_xlat13;
            let x_5084 : vec4<f32> = u_xlat16;
            u_xlat13 = (vec4<f32>(x_5082.w, x_5082.w, x_5082.w, x_5082.w) * x_5084);
            let x_5087 : vec4<f32> = u_xlat18;
            let x_5088 : vec2<f32> = vec2<f32>(x_5087.x, x_5087.y);
            let x_5090 : f32 = u_xlat11.z;
            txVec73 = vec3<f32>(x_5088.x, x_5088.y, x_5090);
            let x_5097 : vec3<f32> = txVec73;
            let x_5099 : f32 = textureSampleCompareLevel(x_AdditionalLightsShadowmapTexture, sampler_LinearClampCompare, x_5097.xy, x_5097.z);
            u_xlat88 = x_5099;
            let x_5101 : vec4<f32> = u_xlat18;
            let x_5102 : vec2<f32> = vec2<f32>(x_5101.z, x_5101.w);
            let x_5104 : f32 = u_xlat11.z;
            txVec74 = vec3<f32>(x_5102.x, x_5102.y, x_5104);
            let x_5111 : vec3<f32> = txVec74;
            let x_5113 : f32 = textureSampleCompareLevel(x_AdditionalLightsShadowmapTexture, sampler_LinearClampCompare, x_5111.xy, x_5111.z);
            u_xlat89 = x_5113;
            let x_5114 : f32 = u_xlat89;
            let x_5116 : f32 = u_xlat23.y;
            u_xlat89 = (x_5114 * x_5116);
            let x_5119 : f32 = u_xlat23.x;
            let x_5120 : f32 = u_xlat88;
            let x_5122 : f32 = u_xlat89;
            u_xlat88 = ((x_5119 * x_5120) + x_5122);
            let x_5125 : vec2<f32> = u_xlat64;
            let x_5127 : f32 = u_xlat11.z;
            txVec75 = vec3<f32>(x_5125.x, x_5125.y, x_5127);
            let x_5134 : vec3<f32> = txVec75;
            let x_5136 : f32 = textureSampleCompareLevel(x_AdditionalLightsShadowmapTexture, sampler_LinearClampCompare, x_5134.xy, x_5134.z);
            u_xlat89 = x_5136;
            let x_5138 : f32 = u_xlat23.z;
            let x_5139 : f32 = u_xlat89;
            let x_5141 : f32 = u_xlat88;
            u_xlat88 = ((x_5138 * x_5139) + x_5141);
            let x_5144 : vec4<f32> = u_xlat21;
            let x_5145 : vec2<f32> = vec2<f32>(x_5144.x, x_5144.y);
            let x_5147 : f32 = u_xlat11.z;
            txVec76 = vec3<f32>(x_5145.x, x_5145.y, x_5147);
            let x_5154 : vec3<f32> = txVec76;
            let x_5156 : f32 = textureSampleCompareLevel(x_AdditionalLightsShadowmapTexture, sampler_LinearClampCompare, x_5154.xy, x_5154.z);
            u_xlat89 = x_5156;
            let x_5158 : f32 = u_xlat23.w;
            let x_5159 : f32 = u_xlat89;
            let x_5161 : f32 = u_xlat88;
            u_xlat88 = ((x_5158 * x_5159) + x_5161);
            let x_5164 : vec4<f32> = u_xlat19;
            let x_5165 : vec2<f32> = vec2<f32>(x_5164.x, x_5164.y);
            let x_5167 : f32 = u_xlat11.z;
            txVec77 = vec3<f32>(x_5165.x, x_5165.y, x_5167);
            let x_5174 : vec3<f32> = txVec77;
            let x_5176 : f32 = textureSampleCompareLevel(x_AdditionalLightsShadowmapTexture, sampler_LinearClampCompare, x_5174.xy, x_5174.z);
            u_xlat89 = x_5176;
            let x_5178 : f32 = u_xlat24.x;
            let x_5179 : f32 = u_xlat89;
            let x_5181 : f32 = u_xlat88;
            u_xlat88 = ((x_5178 * x_5179) + x_5181);
            let x_5184 : vec4<f32> = u_xlat19;
            let x_5185 : vec2<f32> = vec2<f32>(x_5184.z, x_5184.w);
            let x_5187 : f32 = u_xlat11.z;
            txVec78 = vec3<f32>(x_5185.x, x_5185.y, x_5187);
            let x_5194 : vec3<f32> = txVec78;
            let x_5196 : f32 = textureSampleCompareLevel(x_AdditionalLightsShadowmapTexture, sampler_LinearClampCompare, x_5194.xy, x_5194.z);
            u_xlat89 = x_5196;
            let x_5198 : f32 = u_xlat24.y;
            let x_5199 : f32 = u_xlat89;
            let x_5201 : f32 = u_xlat88;
            u_xlat88 = ((x_5198 * x_5199) + x_5201);
            let x_5204 : vec4<f32> = u_xlat20;
            let x_5205 : vec2<f32> = vec2<f32>(x_5204.x, x_5204.y);
            let x_5207 : f32 = u_xlat11.z;
            txVec79 = vec3<f32>(x_5205.x, x_5205.y, x_5207);
            let x_5214 : vec3<f32> = txVec79;
            let x_5216 : f32 = textureSampleCompareLevel(x_AdditionalLightsShadowmapTexture, sampler_LinearClampCompare, x_5214.xy, x_5214.z);
            u_xlat89 = x_5216;
            let x_5218 : f32 = u_xlat24.z;
            let x_5219 : f32 = u_xlat89;
            let x_5221 : f32 = u_xlat88;
            u_xlat88 = ((x_5218 * x_5219) + x_5221);
            let x_5224 : vec4<f32> = u_xlat21;
            let x_5225 : vec2<f32> = vec2<f32>(x_5224.z, x_5224.w);
            let x_5227 : f32 = u_xlat11.z;
            txVec80 = vec3<f32>(x_5225.x, x_5225.y, x_5227);
            let x_5234 : vec3<f32> = txVec80;
            let x_5236 : f32 = textureSampleCompareLevel(x_AdditionalLightsShadowmapTexture, sampler_LinearClampCompare, x_5234.xy, x_5234.z);
            u_xlat89 = x_5236;
            let x_5238 : f32 = u_xlat24.w;
            let x_5239 : f32 = u_xlat89;
            let x_5241 : f32 = u_xlat88;
            u_xlat88 = ((x_5238 * x_5239) + x_5241);
            let x_5244 : vec4<f32> = u_xlat22;
            let x_5245 : vec2<f32> = vec2<f32>(x_5244.x, x_5244.y);
            let x_5247 : f32 = u_xlat11.z;
            txVec81 = vec3<f32>(x_5245.x, x_5245.y, x_5247);
            let x_5254 : vec3<f32> = txVec81;
            let x_5256 : f32 = textureSampleCompareLevel(x_AdditionalLightsShadowmapTexture, sampler_LinearClampCompare, x_5254.xy, x_5254.z);
            u_xlat89 = x_5256;
            let x_5258 : f32 = u_xlat25.x;
            let x_5259 : f32 = u_xlat89;
            let x_5261 : f32 = u_xlat88;
            u_xlat88 = ((x_5258 * x_5259) + x_5261);
            let x_5264 : vec4<f32> = u_xlat22;
            let x_5265 : vec2<f32> = vec2<f32>(x_5264.z, x_5264.w);
            let x_5267 : f32 = u_xlat11.z;
            txVec82 = vec3<f32>(x_5265.x, x_5265.y, x_5267);
            let x_5274 : vec3<f32> = txVec82;
            let x_5276 : f32 = textureSampleCompareLevel(x_AdditionalLightsShadowmapTexture, sampler_LinearClampCompare, x_5274.xy, x_5274.z);
            u_xlat89 = x_5276;
            let x_5278 : f32 = u_xlat25.y;
            let x_5279 : f32 = u_xlat89;
            let x_5281 : f32 = u_xlat88;
            u_xlat88 = ((x_5278 * x_5279) + x_5281);
            let x_5284 : vec2<f32> = u_xlat40;
            let x_5286 : f32 = u_xlat11.z;
            txVec83 = vec3<f32>(x_5284.x, x_5284.y, x_5286);
            let x_5293 : vec3<f32> = txVec83;
            let x_5295 : f32 = textureSampleCompareLevel(x_AdditionalLightsShadowmapTexture, sampler_LinearClampCompare, x_5293.xy, x_5293.z);
            u_xlat89 = x_5295;
            let x_5297 : f32 = u_xlat25.z;
            let x_5298 : f32 = u_xlat89;
            let x_5300 : f32 = u_xlat88;
            u_xlat88 = ((x_5297 * x_5298) + x_5300);
            let x_5303 : vec2<f32> = u_xlat72;
            let x_5305 : f32 = u_xlat11.z;
            txVec84 = vec3<f32>(x_5303.x, x_5303.y, x_5305);
            let x_5312 : vec3<f32> = txVec84;
            let x_5314 : f32 = textureSampleCompareLevel(x_AdditionalLightsShadowmapTexture, sampler_LinearClampCompare, x_5312.xy, x_5312.z);
            u_xlat89 = x_5314;
            let x_5316 : f32 = u_xlat25.w;
            let x_5317 : f32 = u_xlat89;
            let x_5319 : f32 = u_xlat88;
            u_xlat88 = ((x_5316 * x_5317) + x_5319);
            let x_5322 : vec4<f32> = u_xlat17;
            let x_5323 : vec2<f32> = vec2<f32>(x_5322.x, x_5322.y);
            let x_5325 : f32 = u_xlat11.z;
            txVec85 = vec3<f32>(x_5323.x, x_5323.y, x_5325);
            let x_5332 : vec3<f32> = txVec85;
            let x_5334 : f32 = textureSampleCompareLevel(x_AdditionalLightsShadowmapTexture, sampler_LinearClampCompare, x_5332.xy, x_5332.z);
            u_xlat89 = x_5334;
            let x_5336 : f32 = u_xlat13.x;
            let x_5337 : f32 = u_xlat89;
            let x_5339 : f32 = u_xlat88;
            u_xlat88 = ((x_5336 * x_5337) + x_5339);
            let x_5342 : vec4<f32> = u_xlat17;
            let x_5343 : vec2<f32> = vec2<f32>(x_5342.z, x_5342.w);
            let x_5345 : f32 = u_xlat11.z;
            txVec86 = vec3<f32>(x_5343.x, x_5343.y, x_5345);
            let x_5352 : vec3<f32> = txVec86;
            let x_5354 : f32 = textureSampleCompareLevel(x_AdditionalLightsShadowmapTexture, sampler_LinearClampCompare, x_5352.xy, x_5352.z);
            u_xlat89 = x_5354;
            let x_5356 : f32 = u_xlat13.y;
            let x_5357 : f32 = u_xlat89;
            let x_5359 : f32 = u_xlat88;
            u_xlat88 = ((x_5356 * x_5357) + x_5359);
            let x_5362 : vec2<f32> = u_xlat67;
            let x_5364 : f32 = u_xlat11.z;
            txVec87 = vec3<f32>(x_5362.x, x_5362.y, x_5364);
            let x_5371 : vec3<f32> = txVec87;
            let x_5373 : f32 = textureSampleCompareLevel(x_AdditionalLightsShadowmapTexture, sampler_LinearClampCompare, x_5371.xy, x_5371.z);
            u_xlat89 = x_5373;
            let x_5375 : f32 = u_xlat13.z;
            let x_5376 : f32 = u_xlat89;
            let x_5378 : f32 = u_xlat88;
            u_xlat88 = ((x_5375 * x_5376) + x_5378);
            let x_5381 : vec4<f32> = u_xlat12;
            let x_5382 : vec2<f32> = vec2<f32>(x_5381.x, x_5381.y);
            let x_5384 : f32 = u_xlat11.z;
            txVec88 = vec3<f32>(x_5382.x, x_5382.y, x_5384);
            let x_5391 : vec3<f32> = txVec88;
            let x_5393 : f32 = textureSampleCompareLevel(x_AdditionalLightsShadowmapTexture, sampler_LinearClampCompare, x_5391.xy, x_5391.z);
            u_xlat89 = x_5393;
            let x_5395 : f32 = u_xlat13.w;
            let x_5396 : f32 = u_xlat89;
            let x_5398 : f32 = u_xlat88;
            u_xlat87 = ((x_5395 * x_5396) + x_5398);
          }
        }
      } else {
        let x_5402 : vec4<f32> = u_xlat11;
        let x_5403 : vec2<f32> = vec2<f32>(x_5402.x, x_5402.y);
        let x_5405 : f32 = u_xlat11.z;
        txVec89 = vec3<f32>(x_5403.x, x_5403.y, x_5405);
        let x_5412 : vec3<f32> = txVec89;
        let x_5414 : f32 = textureSampleCompareLevel(x_AdditionalLightsShadowmapTexture, sampler_LinearClampCompare, x_5412.xy, x_5412.z);
        u_xlat87 = x_5414;
      }
      let x_5415 : i32 = u_xlati84;
      let x_5417 : f32 = x_372.x_AdditionalShadowParams[x_5415].x;
      u_xlat88 = (1.0f + -(x_5417));
      let x_5420 : f32 = u_xlat87;
      let x_5421 : i32 = u_xlati84;
      let x_5423 : f32 = x_372.x_AdditionalShadowParams[x_5421].x;
      let x_5425 : f32 = u_xlat88;
      u_xlat87 = ((x_5420 * x_5423) + x_5425);
      let x_5428 : f32 = u_xlat11.z;
      u_xlatb88 = (0.0f >= x_5428);
      let x_5431 : f32 = u_xlat11.z;
      u_xlatb11.x = (x_5431 >= 1.0f);
      let x_5434 : bool = u_xlatb88;
      let x_5436 : bool = u_xlatb11.x;
      u_xlatb88 = (x_5434 | x_5436);
      let x_5438 : bool = u_xlatb88;
      let x_5439 : f32 = u_xlat87;
      u_xlat87 = select(x_5439, 1.0f, x_5438);
    } else {
      u_xlat87 = 1.0f;
    }
    let x_5442 : f32 = u_xlat87;
    u_xlat88 = (-(x_5442) + 1.0f);
    let x_5445 : f32 = u_xlat78;
    let x_5446 : f32 = u_xlat88;
    let x_5448 : f32 = u_xlat87;
    u_xlat87 = ((x_5445 * x_5446) + x_5448);
    let x_5451 : i32 = u_xlati84;
    u_xlati88 = (1i << bitcast<u32>((x_5451 & 31i)));
    let x_5455 : i32 = u_xlati88;
    let x_5458 : f32 = x_3517.x_AdditionalLightsCookieEnableBits;
    u_xlati88 = bitcast<i32>((bitcast<u32>(x_5455) & bitcast<u32>(x_5458)));
    let x_5462 : i32 = u_xlati88;
    if ((x_5462 != 0i)) {
      let x_5466 : i32 = u_xlati84;
      let x_5468 : f32 = x_3517.x_AdditionalLightsLightTypes[x_5466].el;
      u_xlati88 = i32(x_5468);
      let x_5471 : i32 = u_xlati88;
      u_xlati11 = select(1i, 0i, (x_5471 != 0i));
      let x_5475 : i32 = u_xlati84;
      u_xlati37 = (x_5475 << bitcast<u32>(2i));
      let x_5477 : i32 = u_xlati11;
      if ((x_5477 != 0i)) {
        let x_5481 : vec3<f32> = vs_INTERP8;
        let x_5483 : i32 = u_xlati37;
        let x_5486 : i32 = u_xlati37;
        let x_5490 : vec4<f32> = x_3517.x_AdditionalLightsWorldToLights[((x_5483 + 1i) / 4i)][((x_5486 + 1i) % 4i)];
        let x_5492 : vec3<f32> = (vec3<f32>(x_5481.y, x_5481.y, x_5481.y) * vec3<f32>(x_5490.x, x_5490.y, x_5490.w));
        let x_5493 : vec4<f32> = u_xlat11;
        u_xlat11 = vec4<f32>(x_5492.x, x_5493.y, x_5492.y, x_5492.z);
        let x_5495 : i32 = u_xlati37;
        let x_5497 : i32 = u_xlati37;
        let x_5500 : vec4<f32> = x_3517.x_AdditionalLightsWorldToLights[(x_5495 / 4i)][(x_5497 % 4i)];
        let x_5502 : vec3<f32> = vs_INTERP8;
        let x_5505 : vec4<f32> = u_xlat11;
        let x_5507 : vec3<f32> = ((vec3<f32>(x_5500.x, x_5500.y, x_5500.w) * vec3<f32>(x_5502.x, x_5502.x, x_5502.x)) + vec3<f32>(x_5505.x, x_5505.z, x_5505.w));
        let x_5508 : vec4<f32> = u_xlat11;
        u_xlat11 = vec4<f32>(x_5507.x, x_5508.y, x_5507.y, x_5507.z);
        let x_5510 : i32 = u_xlati37;
        let x_5513 : i32 = u_xlati37;
        let x_5517 : vec4<f32> = x_3517.x_AdditionalLightsWorldToLights[((x_5510 + 2i) / 4i)][((x_5513 + 2i) % 4i)];
        let x_5519 : vec3<f32> = vs_INTERP8;
        let x_5522 : vec4<f32> = u_xlat11;
        let x_5524 : vec3<f32> = ((vec3<f32>(x_5517.x, x_5517.y, x_5517.w) * vec3<f32>(x_5519.z, x_5519.z, x_5519.z)) + vec3<f32>(x_5522.x, x_5522.z, x_5522.w));
        let x_5525 : vec4<f32> = u_xlat11;
        u_xlat11 = vec4<f32>(x_5524.x, x_5525.y, x_5524.y, x_5524.z);
        let x_5527 : vec4<f32> = u_xlat11;
        let x_5529 : i32 = u_xlati37;
        let x_5532 : i32 = u_xlati37;
        let x_5536 : vec4<f32> = x_3517.x_AdditionalLightsWorldToLights[((x_5529 + 3i) / 4i)][((x_5532 + 3i) % 4i)];
        let x_5538 : vec3<f32> = (vec3<f32>(x_5527.x, x_5527.z, x_5527.w) + vec3<f32>(x_5536.x, x_5536.y, x_5536.w));
        let x_5539 : vec4<f32> = u_xlat11;
        u_xlat11 = vec4<f32>(x_5538.x, x_5539.y, x_5538.y, x_5538.z);
        let x_5541 : vec4<f32> = u_xlat11;
        let x_5543 : vec4<f32> = u_xlat11;
        let x_5545 : vec2<f32> = (vec2<f32>(x_5541.x, x_5541.z) / vec2<f32>(x_5543.w, x_5543.w));
        let x_5546 : vec4<f32> = u_xlat11;
        u_xlat11 = vec4<f32>(x_5545.x, x_5546.y, x_5545.y, x_5546.w);
        let x_5548 : vec4<f32> = u_xlat11;
        let x_5551 : vec2<f32> = ((vec2<f32>(x_5548.x, x_5548.z) * vec2<f32>(0.5f, 0.5f)) + vec2<f32>(0.5f, 0.5f));
        let x_5552 : vec4<f32> = u_xlat11;
        u_xlat11 = vec4<f32>(x_5551.x, x_5552.y, x_5551.y, x_5552.w);
        let x_5554 : vec4<f32> = u_xlat11;
        let x_5558 : vec2<f32> = clamp(vec2<f32>(x_5554.x, x_5554.z), vec2<f32>(0.0f, 0.0f), vec2<f32>(1.0f, 1.0f));
        let x_5559 : vec4<f32> = u_xlat11;
        u_xlat11 = vec4<f32>(x_5558.x, x_5559.y, x_5558.y, x_5559.w);
        let x_5561 : i32 = u_xlati84;
        let x_5563 : vec4<f32> = x_3517.x_AdditionalLightsCookieAtlasUVRects[x_5561];
        let x_5565 : vec4<f32> = u_xlat11;
        let x_5568 : i32 = u_xlati84;
        let x_5570 : vec4<f32> = x_3517.x_AdditionalLightsCookieAtlasUVRects[x_5568];
        let x_5572 : vec2<f32> = ((vec2<f32>(x_5563.x, x_5563.y) * vec2<f32>(x_5565.x, x_5565.z)) + vec2<f32>(x_5570.z, x_5570.w));
        let x_5573 : vec4<f32> = u_xlat11;
        u_xlat11 = vec4<f32>(x_5572.x, x_5573.y, x_5572.y, x_5573.w);
      } else {
        let x_5576 : i32 = u_xlati88;
        u_xlatb88 = (x_5576 == 1i);
        let x_5578 : bool = u_xlatb88;
        u_xlati88 = select(0i, 1i, x_5578);
        let x_5580 : i32 = u_xlati88;
        if ((x_5580 != 0i)) {
          let x_5584 : vec3<f32> = vs_INTERP8;
          let x_5586 : i32 = u_xlati37;
          let x_5589 : i32 = u_xlati37;
          let x_5593 : vec4<f32> = x_3517.x_AdditionalLightsWorldToLights[((x_5586 + 1i) / 4i)][((x_5589 + 1i) % 4i)];
          let x_5595 : vec2<f32> = (vec2<f32>(x_5584.y, x_5584.y) * vec2<f32>(x_5593.x, x_5593.y));
          let x_5596 : vec4<f32> = u_xlat12;
          u_xlat12 = vec4<f32>(x_5595.x, x_5595.y, x_5596.z, x_5596.w);
          let x_5598 : i32 = u_xlati37;
          let x_5600 : i32 = u_xlati37;
          let x_5603 : vec4<f32> = x_3517.x_AdditionalLightsWorldToLights[(x_5598 / 4i)][(x_5600 % 4i)];
          let x_5605 : vec3<f32> = vs_INTERP8;
          let x_5608 : vec4<f32> = u_xlat12;
          let x_5610 : vec2<f32> = ((vec2<f32>(x_5603.x, x_5603.y) * vec2<f32>(x_5605.x, x_5605.x)) + vec2<f32>(x_5608.x, x_5608.y));
          let x_5611 : vec4<f32> = u_xlat12;
          u_xlat12 = vec4<f32>(x_5610.x, x_5610.y, x_5611.z, x_5611.w);
          let x_5613 : i32 = u_xlati37;
          let x_5616 : i32 = u_xlati37;
          let x_5620 : vec4<f32> = x_3517.x_AdditionalLightsWorldToLights[((x_5613 + 2i) / 4i)][((x_5616 + 2i) % 4i)];
          let x_5622 : vec3<f32> = vs_INTERP8;
          let x_5625 : vec4<f32> = u_xlat12;
          let x_5627 : vec2<f32> = ((vec2<f32>(x_5620.x, x_5620.y) * vec2<f32>(x_5622.z, x_5622.z)) + vec2<f32>(x_5625.x, x_5625.y));
          let x_5628 : vec4<f32> = u_xlat12;
          u_xlat12 = vec4<f32>(x_5627.x, x_5627.y, x_5628.z, x_5628.w);
          let x_5630 : vec4<f32> = u_xlat12;
          let x_5632 : i32 = u_xlati37;
          let x_5635 : i32 = u_xlati37;
          let x_5639 : vec4<f32> = x_3517.x_AdditionalLightsWorldToLights[((x_5632 + 3i) / 4i)][((x_5635 + 3i) % 4i)];
          let x_5641 : vec2<f32> = (vec2<f32>(x_5630.x, x_5630.y) + vec2<f32>(x_5639.x, x_5639.y));
          let x_5642 : vec4<f32> = u_xlat12;
          u_xlat12 = vec4<f32>(x_5641.x, x_5641.y, x_5642.z, x_5642.w);
          let x_5644 : vec4<f32> = u_xlat12;
          let x_5647 : vec2<f32> = ((vec2<f32>(x_5644.x, x_5644.y) * vec2<f32>(0.5f, 0.5f)) + vec2<f32>(0.5f, 0.5f));
          let x_5648 : vec4<f32> = u_xlat12;
          u_xlat12 = vec4<f32>(x_5647.x, x_5647.y, x_5648.z, x_5648.w);
          let x_5650 : vec4<f32> = u_xlat12;
          let x_5652 : vec2<f32> = fract(vec2<f32>(x_5650.x, x_5650.y));
          let x_5653 : vec4<f32> = u_xlat12;
          u_xlat12 = vec4<f32>(x_5652.x, x_5652.y, x_5653.z, x_5653.w);
          let x_5655 : i32 = u_xlati84;
          let x_5657 : vec4<f32> = x_3517.x_AdditionalLightsCookieAtlasUVRects[x_5655];
          let x_5659 : vec4<f32> = u_xlat12;
          let x_5662 : i32 = u_xlati84;
          let x_5664 : vec4<f32> = x_3517.x_AdditionalLightsCookieAtlasUVRects[x_5662];
          let x_5666 : vec2<f32> = ((vec2<f32>(x_5657.x, x_5657.y) * vec2<f32>(x_5659.x, x_5659.y)) + vec2<f32>(x_5664.z, x_5664.w));
          let x_5667 : vec4<f32> = u_xlat11;
          u_xlat11 = vec4<f32>(x_5666.x, x_5667.y, x_5666.y, x_5667.w);
        } else {
          let x_5670 : vec3<f32> = vs_INTERP8;
          let x_5672 : i32 = u_xlati37;
          let x_5675 : i32 = u_xlati37;
          let x_5679 : vec4<f32> = x_3517.x_AdditionalLightsWorldToLights[((x_5672 + 1i) / 4i)][((x_5675 + 1i) % 4i)];
          u_xlat12 = (vec4<f32>(x_5670.y, x_5670.y, x_5670.y, x_5670.y) * x_5679);
          let x_5681 : i32 = u_xlati37;
          let x_5683 : i32 = u_xlati37;
          let x_5686 : vec4<f32> = x_3517.x_AdditionalLightsWorldToLights[(x_5681 / 4i)][(x_5683 % 4i)];
          let x_5687 : vec3<f32> = vs_INTERP8;
          let x_5690 : vec4<f32> = u_xlat12;
          u_xlat12 = ((x_5686 * vec4<f32>(x_5687.x, x_5687.x, x_5687.x, x_5687.x)) + x_5690);
          let x_5692 : i32 = u_xlati37;
          let x_5695 : i32 = u_xlati37;
          let x_5699 : vec4<f32> = x_3517.x_AdditionalLightsWorldToLights[((x_5692 + 2i) / 4i)][((x_5695 + 2i) % 4i)];
          let x_5700 : vec3<f32> = vs_INTERP8;
          let x_5703 : vec4<f32> = u_xlat12;
          u_xlat12 = ((x_5699 * vec4<f32>(x_5700.z, x_5700.z, x_5700.z, x_5700.z)) + x_5703);
          let x_5705 : vec4<f32> = u_xlat12;
          let x_5706 : i32 = u_xlati37;
          let x_5709 : i32 = u_xlati37;
          let x_5713 : vec4<f32> = x_3517.x_AdditionalLightsWorldToLights[((x_5706 + 3i) / 4i)][((x_5709 + 3i) % 4i)];
          u_xlat12 = (x_5705 + x_5713);
          let x_5715 : vec4<f32> = u_xlat12;
          let x_5717 : vec4<f32> = u_xlat12;
          let x_5719 : vec3<f32> = (vec3<f32>(x_5715.x, x_5715.y, x_5715.z) / vec3<f32>(x_5717.w, x_5717.w, x_5717.w));
          let x_5720 : vec4<f32> = u_xlat12;
          u_xlat12 = vec4<f32>(x_5719.x, x_5719.y, x_5719.z, x_5720.w);
          let x_5722 : vec4<f32> = u_xlat12;
          let x_5724 : vec4<f32> = u_xlat12;
          u_xlat88 = dot(vec3<f32>(x_5722.x, x_5722.y, x_5722.z), vec3<f32>(x_5724.x, x_5724.y, x_5724.z));
          let x_5727 : f32 = u_xlat88;
          u_xlat88 = inverseSqrt(x_5727);
          let x_5729 : f32 = u_xlat88;
          let x_5731 : vec4<f32> = u_xlat12;
          let x_5733 : vec3<f32> = (vec3<f32>(x_5729, x_5729, x_5729) * vec3<f32>(x_5731.x, x_5731.y, x_5731.z));
          let x_5734 : vec4<f32> = u_xlat12;
          u_xlat12 = vec4<f32>(x_5733.x, x_5733.y, x_5733.z, x_5734.w);
          let x_5736 : vec4<f32> = u_xlat12;
          u_xlat88 = dot(abs(vec3<f32>(x_5736.x, x_5736.y, x_5736.z)), vec3<f32>(1.0f, 1.0f, 1.0f));
          let x_5741 : f32 = u_xlat88;
          u_xlat88 = max(x_5741, 0.00000099999999747524f);
          let x_5744 : f32 = u_xlat88;
          u_xlat88 = (1.0f / x_5744);
          let x_5746 : f32 = u_xlat88;
          let x_5748 : vec4<f32> = u_xlat12;
          let x_5750 : vec3<f32> = (vec3<f32>(x_5746, x_5746, x_5746) * vec3<f32>(x_5748.z, x_5748.x, x_5748.y));
          let x_5751 : vec4<f32> = u_xlat13;
          u_xlat13 = vec4<f32>(x_5750.x, x_5750.y, x_5750.z, x_5751.w);
          let x_5754 : f32 = u_xlat13.x;
          u_xlat13.x = -(x_5754);
          let x_5758 : f32 = u_xlat13.x;
          u_xlat13.x = clamp(x_5758, 0.0f, 1.0f);
          let x_5763 : vec4<f32> = u_xlat13;
          let x_5765 : vec4<bool> = (vec4<f32>(x_5763.y, x_5763.y, x_5763.z, x_5763.z) >= vec4<f32>(0.0f, 0.0f, 0.0f, 0.0f));
          let x_5766 : vec2<bool> = vec2<bool>(x_5765.x, x_5765.z);
          let x_5767 : vec3<bool> = u_xlatb37;
          u_xlatb37 = vec3<bool>(x_5766.x, x_5767.y, x_5766.y);
          let x_5770 : bool = u_xlatb37.x;
          if (x_5770) {
            let x_5775 : f32 = u_xlat13.x;
            x_5771 = x_5775;
          } else {
            let x_5778 : f32 = u_xlat13.x;
            x_5771 = -(x_5778);
          }
          let x_5780 : f32 = x_5771;
          u_xlat37.x = x_5780;
          let x_5783 : bool = u_xlatb37.z;
          if (x_5783) {
            let x_5788 : f32 = u_xlat13.x;
            x_5784 = x_5788;
          } else {
            let x_5791 : f32 = u_xlat13.x;
            x_5784 = -(x_5791);
          }
          let x_5793 : f32 = x_5784;
          u_xlat37.z = x_5793;
          let x_5795 : vec4<f32> = u_xlat12;
          let x_5797 : f32 = u_xlat88;
          let x_5800 : vec3<f32> = u_xlat37;
          let x_5802 : vec2<f32> = ((vec2<f32>(x_5795.x, x_5795.y) * vec2<f32>(x_5797, x_5797)) + vec2<f32>(x_5800.x, x_5800.z));
          let x_5803 : vec3<f32> = u_xlat37;
          u_xlat37 = vec3<f32>(x_5802.x, x_5803.y, x_5802.y);
          let x_5805 : vec3<f32> = u_xlat37;
          let x_5808 : vec2<f32> = ((vec2<f32>(x_5805.x, x_5805.z) * vec2<f32>(0.5f, 0.5f)) + vec2<f32>(0.5f, 0.5f));
          let x_5809 : vec3<f32> = u_xlat37;
          u_xlat37 = vec3<f32>(x_5808.x, x_5809.y, x_5808.y);
          let x_5811 : vec3<f32> = u_xlat37;
          let x_5815 : vec2<f32> = clamp(vec2<f32>(x_5811.x, x_5811.z), vec2<f32>(0.0f, 0.0f), vec2<f32>(1.0f, 1.0f));
          let x_5816 : vec3<f32> = u_xlat37;
          u_xlat37 = vec3<f32>(x_5815.x, x_5816.y, x_5815.y);
          let x_5818 : i32 = u_xlati84;
          let x_5820 : vec4<f32> = x_3517.x_AdditionalLightsCookieAtlasUVRects[x_5818];
          let x_5822 : vec3<f32> = u_xlat37;
          let x_5825 : i32 = u_xlati84;
          let x_5827 : vec4<f32> = x_3517.x_AdditionalLightsCookieAtlasUVRects[x_5825];
          let x_5829 : vec2<f32> = ((vec2<f32>(x_5820.x, x_5820.y) * vec2<f32>(x_5822.x, x_5822.z)) + vec2<f32>(x_5827.z, x_5827.w));
          let x_5830 : vec4<f32> = u_xlat11;
          u_xlat11 = vec4<f32>(x_5829.x, x_5830.y, x_5829.y, x_5830.w);
        }
      }
      let x_5837 : vec4<f32> = u_xlat11;
      let x_5839 : vec4<f32> = textureSampleLevel(x_AdditionalLightsCookieAtlasTexture, sampler_LinearClamp, vec2<f32>(x_5837.x, x_5837.z), 0.0f);
      u_xlat11 = x_5839;
      let x_5841 : bool = u_xlatb3.w;
      if (x_5841) {
        let x_5846 : f32 = u_xlat11.w;
        x_5842 = x_5846;
      } else {
        let x_5849 : f32 = u_xlat11.x;
        x_5842 = x_5849;
      }
      let x_5850 : f32 = x_5842;
      u_xlat88 = x_5850;
      let x_5852 : bool = u_xlatb3.x;
      if (x_5852) {
        let x_5856 : vec4<f32> = u_xlat11;
        x_5853 = vec3<f32>(x_5856.x, x_5856.y, x_5856.z);
      } else {
        let x_5859 : f32 = u_xlat88;
        x_5853 = vec3<f32>(x_5859, x_5859, x_5859);
      }
      let x_5861 : vec3<f32> = x_5853;
      let x_5862 : vec4<f32> = u_xlat11;
      u_xlat11 = vec4<f32>(x_5861.x, x_5861.y, x_5861.z, x_5862.w);
    } else {
      u_xlat11.x = 1.0f;
      u_xlat11.y = 1.0f;
      u_xlat11.z = 1.0f;
    }
    let x_5868 : vec4<f32> = u_xlat11;
    let x_5870 : i32 = u_xlati84;
    let x_5872 : vec4<f32> = x_4007.x_AdditionalLightsColor[x_5870];
    let x_5874 : vec3<f32> = (vec3<f32>(x_5868.x, x_5868.y, x_5868.z) * vec3<f32>(x_5872.x, x_5872.y, x_5872.z));
    let x_5875 : vec4<f32> = u_xlat11;
    u_xlat11 = vec4<f32>(x_5874.x, x_5874.y, x_5874.z, x_5875.w);
    let x_5877 : f32 = u_xlat85;
    let x_5878 : f32 = u_xlat87;
    u_xlat84 = (x_5877 * x_5878);
    let x_5880 : vec4<f32> = u_xlat5;
    let x_5882 : vec4<f32> = u_xlat10;
    u_xlat85 = dot(vec3<f32>(x_5880.x, x_5880.y, x_5880.z), vec3<f32>(x_5882.x, x_5882.y, x_5882.z));
    let x_5885 : f32 = u_xlat85;
    u_xlat85 = clamp(x_5885, 0.0f, 1.0f);
    let x_5887 : f32 = u_xlat84;
    let x_5888 : f32 = u_xlat85;
    u_xlat84 = (x_5887 * x_5888);
    let x_5890 : f32 = u_xlat84;
    let x_5892 : vec4<f32> = u_xlat11;
    let x_5894 : vec3<f32> = (vec3<f32>(x_5890, x_5890, x_5890) * vec3<f32>(x_5892.x, x_5892.y, x_5892.z));
    let x_5895 : vec4<f32> = u_xlat11;
    u_xlat11 = vec4<f32>(x_5894.x, x_5894.y, x_5894.z, x_5895.w);
    let x_5897 : vec4<f32> = u_xlat9;
    let x_5899 : f32 = u_xlat86;
    let x_5902 : vec3<f32> = u_xlat4;
    let x_5903 : vec3<f32> = ((vec3<f32>(x_5897.x, x_5897.y, x_5897.z) * vec3<f32>(x_5899, x_5899, x_5899)) + x_5902);
    let x_5904 : vec4<f32> = u_xlat9;
    u_xlat9 = vec4<f32>(x_5903.x, x_5903.y, x_5903.z, x_5904.w);
    let x_5906 : vec4<f32> = u_xlat9;
    let x_5908 : vec4<f32> = u_xlat9;
    u_xlat84 = dot(vec3<f32>(x_5906.x, x_5906.y, x_5906.z), vec3<f32>(x_5908.x, x_5908.y, x_5908.z));
    let x_5911 : f32 = u_xlat84;
    u_xlat84 = max(x_5911, 1.17549435e-38f);
    let x_5913 : f32 = u_xlat84;
    u_xlat84 = inverseSqrt(x_5913);
    let x_5915 : f32 = u_xlat84;
    let x_5917 : vec4<f32> = u_xlat9;
    let x_5919 : vec3<f32> = (vec3<f32>(x_5915, x_5915, x_5915) * vec3<f32>(x_5917.x, x_5917.y, x_5917.z));
    let x_5920 : vec4<f32> = u_xlat9;
    u_xlat9 = vec4<f32>(x_5919.x, x_5919.y, x_5919.z, x_5920.w);
    let x_5922 : vec4<f32> = u_xlat5;
    let x_5924 : vec4<f32> = u_xlat9;
    u_xlat84 = dot(vec3<f32>(x_5922.x, x_5922.y, x_5922.z), vec3<f32>(x_5924.x, x_5924.y, x_5924.z));
    let x_5927 : f32 = u_xlat84;
    u_xlat84 = clamp(x_5927, 0.0f, 1.0f);
    let x_5929 : vec4<f32> = u_xlat10;
    let x_5931 : vec4<f32> = u_xlat9;
    u_xlat85 = dot(vec3<f32>(x_5929.x, x_5929.y, x_5929.z), vec3<f32>(x_5931.x, x_5931.y, x_5931.z));
    let x_5934 : f32 = u_xlat85;
    u_xlat85 = clamp(x_5934, 0.0f, 1.0f);
    let x_5936 : f32 = u_xlat84;
    let x_5937 : f32 = u_xlat84;
    u_xlat84 = (x_5936 * x_5937);
    let x_5939 : f32 = u_xlat84;
    let x_5941 : f32 = u_xlat52.x;
    u_xlat84 = ((x_5939 * x_5941) + 1.00001001358032226562f);
    let x_5944 : f32 = u_xlat85;
    let x_5945 : f32 = u_xlat85;
    u_xlat85 = (x_5944 * x_5945);
    let x_5947 : f32 = u_xlat84;
    let x_5948 : f32 = u_xlat84;
    u_xlat84 = (x_5947 * x_5948);
    let x_5950 : f32 = u_xlat85;
    u_xlat85 = max(x_5950, 0.10000000149011611938f);
    let x_5952 : f32 = u_xlat84;
    let x_5953 : f32 = u_xlat85;
    u_xlat84 = (x_5952 * x_5953);
    let x_5955 : f32 = u_xlat82;
    let x_5956 : f32 = u_xlat84;
    u_xlat84 = (x_5955 * x_5956);
    let x_5959 : f32 = u_xlat55.x;
    let x_5960 : f32 = u_xlat84;
    u_xlat84 = (x_5959 / x_5960);
    let x_5962 : f32 = u_xlat84;
    let x_5965 : vec3<f32> = u_xlat7;
    let x_5966 : vec3<f32> = ((vec3<f32>(x_5962, x_5962, x_5962) * vec3<f32>(0.03999999910593032837f, 0.03999999910593032837f, 0.03999999910593032837f)) + x_5965);
    let x_5967 : vec4<f32> = u_xlat9;
    u_xlat9 = vec4<f32>(x_5966.x, x_5966.y, x_5966.z, x_5967.w);
    let x_5969 : vec4<f32> = u_xlat9;
    let x_5971 : vec4<f32> = u_xlat11;
    let x_5974 : vec4<f32> = u_xlat8;
    let x_5976 : vec3<f32> = ((vec3<f32>(x_5969.x, x_5969.y, x_5969.z) * vec3<f32>(x_5971.x, x_5971.y, x_5971.z)) + vec3<f32>(x_5974.x, x_5974.y, x_5974.z));
    let x_5977 : vec4<f32> = u_xlat8;
    u_xlat8 = vec4<f32>(x_5976.x, x_5976.y, x_5976.z, x_5977.w);

    continuing {
      let x_5979 : u32 = u_xlatu_loop_1;
      u_xlatu_loop_1 = (x_5979 + bitcast<u32>(1i));
    }
  }
  let x_5981 : vec4<f32> = u_xlat6;
  let x_5983 : f32 = u_xlat83;
  let x_5986 : vec3<f32> = u_xlat28;
  let x_5987 : vec3<f32> = ((vec3<f32>(x_5981.x, x_5981.y, x_5981.z) * vec3<f32>(x_5983, x_5983, x_5983)) + x_5986);
  let x_5988 : vec4<f32> = u_xlat0;
  u_xlat0 = vec4<f32>(x_5987.x, x_5988.y, x_5987.y, x_5987.z);
  let x_5990 : vec4<f32> = u_xlat8;
  let x_5992 : vec4<f32> = u_xlat0;
  let x_5994 : vec3<f32> = (vec3<f32>(x_5990.x, x_5990.y, x_5990.z) + vec3<f32>(x_5992.x, x_5992.z, x_5992.w));
  let x_5995 : vec4<f32> = u_xlat0;
  u_xlat0 = vec4<f32>(x_5994.x, x_5995.y, x_5994.y, x_5994.z);
  let x_5997 : vec4<f32> = vs_INTERP6;
  let x_5999 : vec3<f32> = u_xlat1;
  let x_6001 : vec4<f32> = u_xlat0;
  let x_6003 : vec3<f32> = ((vec3<f32>(x_5997.w, x_5997.w, x_5997.w) * x_5999) + vec3<f32>(x_6001.x, x_6001.z, x_6001.w));
  let x_6004 : vec4<f32> = u_xlat0;
  u_xlat0 = vec4<f32>(x_6003.x, x_6004.y, x_6003.y, x_6003.z);
  let x_6007 : f32 = u_xlat26.x;
  let x_6009 : f32 = u_xlat26.x;
  u_xlat26.x = (x_6007 * -(x_6009));
  let x_6014 : f32 = u_xlat26.x;
  u_xlat26.x = exp2(x_6014);
  let x_6017 : vec4<f32> = u_xlat0;
  let x_6020 : vec4<f32> = x_149.unity_FogColor;
  let x_6023 : vec3<f32> = (vec3<f32>(x_6017.x, x_6017.z, x_6017.w) + -(vec3<f32>(x_6020.x, x_6020.y, x_6020.z)));
  let x_6024 : vec4<f32> = u_xlat0;
  u_xlat0 = vec4<f32>(x_6023.x, x_6024.y, x_6023.y, x_6023.z);
  let x_6028 : vec3<f32> = u_xlat26;
  let x_6030 : vec4<f32> = u_xlat0;
  let x_6034 : vec4<f32> = x_149.unity_FogColor;
  let x_6036 : vec3<f32> = ((vec3<f32>(x_6028.x, x_6028.x, x_6028.x) * vec3<f32>(x_6030.x, x_6030.z, x_6030.w)) + vec3<f32>(x_6034.x, x_6034.y, x_6034.z));
  let x_6037 : vec4<f32> = SV_Target0;
  SV_Target0 = vec4<f32>(x_6036.x, x_6036.y, x_6036.z, x_6037.w);
  let x_6039 : bool = u_xlatb29;
  let x_6040 : f32 = u_xlat79;
  SV_Target0.w = select(1.0f, x_6040, x_6039);
  return;
}

struct main_out {
  @location(0)
  SV_Target0_1 : vec4<f32>,
}

@fragment
fn main(@location(4) vs_INTERP9_param : vec3<f32>, @location(0) vs_INTERP4_param : vec4<f32>, @location(3) vs_INTERP8_param : vec3<f32>, @location(1) vs_INTERP5_param : vec4<f32>, @location(2) vs_INTERP6_param : vec4<f32>, @builtin(position) gl_FragCoord_param : vec4<f32>) -> main_out {
  vs_INTERP9 = vs_INTERP9_param;
  vs_INTERP4 = vs_INTERP4_param;
  vs_INTERP8 = vs_INTERP8_param;
  vs_INTERP5 = vs_INTERP5_param;
  vs_INTERP6 = vs_INTERP6_param;
  gl_FragCoord = gl_FragCoord_param;
  main_1();
  return main_out(SV_Target0);
}


