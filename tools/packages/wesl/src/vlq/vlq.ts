/*!
Copyright (c) 2017-2021 [these people](https://github.com/Rich-Harris/vlq/graphs/contributors)

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/
// Copied from https://github.com/Rich-Harris/vlq and adjusted

const char_to_integer: Record<string, number> = {};
const integer_to_char: Record<number, string> = {};

"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/="
  .split("")
  .forEach((char, i) => {
    char_to_integer[char] = i;
    integer_to_char[i] = char;
  });

export function decodeVlq(string: string) {
  const result: number[] = [];

  let shift = 0;
  let value = 0;

  for (let i = 0; i < string.length; i += 1) {
    let integer = char_to_integer[string[i]];

    if (integer === undefined) {
      throw new Error("Invalid character (" + string[i] + ")");
    }

    const has_continuation_bit = integer & 32;

    integer &= 31;
    value += integer << shift;

    if (has_continuation_bit) {
      shift += 5;
    } else {
      const should_negate = value & 1;
      value >>>= 1;

      if (should_negate) {
        result.push(value === 0 ? -0x80000000 : -value);
      } else {
        result.push(value);
      }

      // reset
      value = shift = 0;
    }
  }

  return result;
}

export function encodeVlq(value: number | number[]) {
  if (typeof value === "number") {
    return encode_integer(value);
  }

  let result = "";
  for (let i = 0; i < value.length; i += 1) {
    result += encode_integer(value[i]);
  }

  return result;
}

function encode_integer(num: number) {
  let result = "";

  if (num < 0) {
    num = (-num << 1) | 1;
  } else {
    num <<= 1;
  }

  do {
    let clamped = num & 31;
    num >>>= 5;

    if (num > 0) {
      clamped |= 32;
    }

    result += integer_to_char[clamped];
  } while (num > 0);

  return result;
}
