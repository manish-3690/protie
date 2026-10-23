import React from 'react';
import { Sequence } from 'remotion';
import { Scene1 } from './Scene1';
import { Scene2 } from './Scene2';
import { Scene3 } from './Scene3';
import { colors } from '../theme';

export const ProtiePromo: React.FC = () => {
  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{
        backgroundColor: colors.background,
        backgroundImage: `
          radial-gradient(circle at 15% 15%, rgba(242, 187, 75, 0.18) 0%, transparent 45%),
          radial-gradient(circle at 85% 85%, rgba(217, 121, 53, 0.15) 0%, transparent 50%)
        `,
      }}
    >
      {/* Scene 1 (0-3s, frames 0-90): Mascot pops in, "Hit your protein goal" fades in */}
      <Sequence from={0} durationInFrames={90} name="Scene 1 - Mascot Pop In">
        <Scene1 />
      </Sequence>

      {/* Scene 2 (3-7s, frames 90-210): Protein meter 0-100%, counter 0-150g, mascot reacts */}
      <Sequence from={90} durationInFrames={120} name="Scene 2 - Protein Meter">
        <Scene2 />
      </Sequence>

      {/* Scene 3 (7-10s, frames 210-300): "Protie" logo & "Track protein. Feel good." outro */}
      <Sequence from={210} durationInFrames={90} name="Scene 3 - Outro">
        <Scene3 />
      </Sequence>
    </div>
  );
};

export default ProtiePromo;
