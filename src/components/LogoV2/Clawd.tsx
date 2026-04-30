/**
 * DeepSeek Whale — replaces Claude's Clawd mascot with a larger,
 * more recognizable DeepSeek whale icon. Uses brand blue (#4F6BED).
 *
 * The whale shape is a side-profile showing the head/body on the left
 * and tail flukes on the right. 5 rows tall, ~25 chars wide.
 */

import * as React from 'react';
import { Box, Text } from '../../ink.js';

export type ClawdPose = 'default' | 'arms-up' | 'look-left' | 'look-right';

type Props = {
  pose?: ClawdPose;
};

// 5-row DeepSeek whale using Unicode block characters
// Left portion = head/body, Right portion = tail/spout
const ROWS: Record<string, [string, string]> = {
  0: ['    ▄████████████████▄  ', '      ╭╮'],  // head + spout
  1: ['  ▄███████████████████▄ ', '    ╱  ╰╮'],  // body
  2: [' ███████████████████████', '  ╱    │ '],  // body + dorsal
  3: [' ██████████████████████▌', ' │    ╱  '],  // body + tail start
  4: ['  ▀███████████████████▌ ', '╱   ╱   '],  // body + tail down
  5: ['    ▀▀▀██████████████▌  ', '╱  ╱    '],  // tail curve
  6: ['          ▀▀▀▀██████▌   ', '╱ ╱     '],  // tail
  7: ['               ▀▀▀▀▀▀   ', '╱╱      '],  // tail fluke
};

// Simpler 5-row version for cleaner display
const WHALE_ROWS = [
  '   ▄████████████████▄     ╭╮  ',
  ' ▄███████████████████▄  ╱  ╰╮ ',
  '███████████████████████ ╱    │ ',
  '████████████████████████    ╱  ',
  ' ▀████████████████████▀  ╱──╯  ',
];

const WHALE_ROWS_COMPACT = [
  '   ▄█████████████▄   ╭╮  ',
  ' ▄█████████████████  ╱ ╰╮ ',
  '████████████████████ ╱  │ ',
  '██████████████████▌    ╱  ',
  ' ▀████████████████▀  ╱╯  ',
];

export function Clawd(t0: Props | undefined) {
  const { pose = 'default' } = t0 || {};
  // Use compact rows for default, doesn't vary by pose
  const rows = WHALE_ROWS;

  return (
    <Box flexDirection="column">
      {rows.map((row, i) => (
        <Text key={i} color="deepseek_blue">{row}</Text>
      ))}
    </Box>
  );
}

export default Clawd;
