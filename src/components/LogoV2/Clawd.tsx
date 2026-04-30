/**
 * DeepSeek Whale — replaces Claude's Clawd mascot with DeepSeek's whale.
 * Pure block characters, no eyes/tail details, brand blue (#4F6BED).
 */

import * as React from 'react';
import { Box, Text } from '../../ink.js';

export type ClawdPose = 'default' | 'arms-up' | 'look-left' | 'look-right';
type Props = { pose?: ClawdPose };

const WHALE = [
  '    ▄███████████████████████   ',
  '  ▄███████████████████████████ ',
  ' ██████████████████████████████',
  ' ██████████████████████████████',
  '  ▀█████████████████████████████',
  '    ▀███████████████████████████',
  '      ▀▀▀███████████████████████',
  '            ▀▀▀▀████████████████',
  '                  ▀▀▀▀▀▀▀▀▀▀▀▀',
];

export function Clawd(_props: Props | undefined) {
  return (
    <Box flexDirection="column">
      {WHALE.map((row, i) => (
        <Text key={i} color="deepseek_blue">{row}</Text>
      ))}
    </Box>
  );
}

export default Clawd;
