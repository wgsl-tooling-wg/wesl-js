// WESL conditional compilation
@if(DEBUG) fn debug_fn() {}
@elif(MOBILE) fn mobile_fn() {}
@else fn fallback_fn() {}

@if(A && B) const x = 1;
@if(!DEBUG || VERBOSE) var y: f32 = 2.0;
@if((A || B) && C) fn complex() {}

// Complex condition expression
@if(true || (!foo && !!false)) fn test() {}

// Conditional struct members
struct Config {
  @if(DIMENSIONS_2) pos: vec2<f32>,
  @else pos: vec3<f32>,
  @if(HAS_COLOR) color: vec4<f32>,
}

// Conditional statements
fn main() {
  @if(A) var x = 1;
  @else var x = 2;

  @if(MOBILE) {
    let scale = 0.5;
  }
}

// Note: conditional imports (@if import) not yet supported by wesl parser
