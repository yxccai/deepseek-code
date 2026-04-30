/**
 * DeepSeek Whale — replaces Claude's Clawd mascot with DeepSeek's whale icon.
 * Uses DeepSeek brand blue (#4F6BED) as the primary color.
 */

import { c as _c } from "react/compiler-runtime";
import * as React from 'react';
import { Box, Text } from '../../ink.js';

export type ClawdPose = 'default' | 'arms-up' | 'look-left' | 'look-right';

type Props = {
  pose?: ClawdPose;
};

/**
 * DeepSeek whale ASCII art.
 * A simple whale design using box-drawing and block characters.
 * All poses end up 11 cols wide, 3 rows tall (matching the original Clawd layout).
 */
type Segments = {
  r1L: string;  // row 1 left
  r1R: string;  // row 1 right
  r2L: string;  // row 2 left
  r2R: string;  // row 2 right
  r3: string;   // row 3 (bottom)
};

const POSES: Record<ClawdPose, Segments> = {
  default: {
    r1L: '  ▄███▄',
    r1R: ' ▄▄ ',
    r2L: '▄██████',
    r2R: '▄██▄',
    r3: ' ▀████▀ ▀██▀',
  },
  'look-left': {
    r1L: ' ▄████ ',
    r1R: ' ▄▄ ',
    r2L: '███████',
    r2R: '▄██▄',
    r3: ' ▀████ ▀██▀',
  },
  'look-right': {
    r1L: '  ▄███▄',
    r1R: '▄▄▄ ',
    r2L: '▄██████',
    r2R: '▄██▄',
    r3: ' ▀████▀ ▀██▀',
  },
  'arms-up': {
    r1L: ' ▄████ ',
    r1R: ' ▄▄▄ ',
    r2L: '███████',
    r2R: '▄███▄',
    r3: ' ▀████  ▀▀▀ ',
  },
};

export function Clawd(t0: Props | undefined) {
  const $ = _c(26);
  const { pose = 'default' } = t0 || {};
  const p = POSES[pose];

  let t3;
  if ($[4] !== p.r1L) {
    t3 = <Text color="deepseek_blue">{p.r1L}</Text>;
    $[4] = p.r1L;
    $[5] = t3;
  } else { t3 = $[5]; }

  let t4;
  if ($[6] !== p.r1R) {
    t4 = <Text color="deepseek_blue">{p.r1R}</Text>;
    $[6] = p.r1R;
    $[7] = t4;
  } else { t4 = $[7]; }

  let t6;
  if ($[10] !== t3 || $[11] !== t4) {
    t6 = <Text>{t3}{t4}</Text>;
    $[10] = t3;
    $[11] = t4;
    $[12] = t6;
  } else { t6 = $[12]; }

  let t7;
  if ($[14] !== p.r2L) {
    t7 = <Text color="deepseek_blue">{p.r2L}</Text>;
    $[14] = p.r2L;
    $[15] = t7;
  } else { t7 = $[15]; }

  let t8;
  if ($[16] === Symbol.for("react.memo_cache_sentinel")) {
    t8 = <Text color="deepseek_blue" backgroundColor="">█████</Text>;
    $[16] = t8;
  } else { t8 = $[16]; }

  let t9;
  if ($[17] !== p.r2R) {
    t9 = <Text color="deepseek_blue">{p.r2R}</Text>;
    $[17] = p.r2R;
    $[18] = t9;
  } else { t9 = $[18]; }

  let t10;
  if ($[19] !== t7 || $[20] !== t9) {
    t10 = <Text>{t7}{t8}{t9}</Text>;
    $[19] = t7;
    $[20] = t9;
    $[21] = t10;
  } else { t10 = $[21]; }

  let t11;
  if ($[22] === Symbol.for("react.memo_cache_sentinel")) {
    t11 = <Text color="deepseek_blue">{p.r3}</Text>;
    $[22] = t11;
  } else { t11 = $[22]; }

  let t12;
  if ($[23] !== t10 || $[24] !== t6) {
    t12 = <Box flexDirection="column">{t6}{t10}{t11}</Box>;
    $[23] = t10;
    $[24] = t6;
    $[25] = t12;
  } else { t12 = $[25]; }

  return t12;
}

export default Clawd;
