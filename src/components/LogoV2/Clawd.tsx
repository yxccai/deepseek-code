/**
 * DeepSeek Whale — replaces Claude's Clawd mascot.
 * Blue whale with eye (●), water spout, and tail flukes.
 * Brand blue #4F6BED.
 */

import * as React from 'react';
import { Box, Text } from '../../ink.js';

export type ClawdPose = 'default' | 'arms-up' | 'look-left' | 'look-right';
type Props = { pose?: ClawdPose };

// Row segments: [left-part, eye?, right-part]
// Numbers in comments show the segment approach
const ROWS: Array<{ left: string; eye?: string; right: string }> = [
  { left: '         ╱│╲           ' , right: '' },
  { left: '        ╱ │ ╲          ' , right: '' },
  { left: '   ▄████████████████████', right: '███' },
  { left: ' ▄██████████████████████' , right: '████' },
  { left: ' ██████ '                , eye: '●', right: ' ██████████████████████' },
  { left: ' ███████████████████████' , right: '███████' },
  { left: '  ▀█████████████████████' , right: '██████████    ▄▄' },
  { left: '    ▀███████████████████' , right: '██████████  ▄▀▀▀' },
  { left: '      ▀▀████████████████' , right: '██████████▄█' },
  { left: '           ▀▀▀▀▀▀▀▀▀▀▀▀' , right: '▀▀▀▀▀▀▀▀▀▀' },
];

export function Clawd(_props: Props | undefined) {
  return (
    <Box flexDirection="column">
      {ROWS.map((row, i) => (
        <Text key={i}>
          <Text color="deepseek_blue">{row.left}</Text>
          {row.eye && <Text color="white">{row.eye}</Text>}
          <Text color="deepseek_blue">{row.right}</Text>
        </Text>
      ))}
    </Box>
  );
}

export default Clawd;
