import { RhythmWave } from './RhythmWave';

interface WaveDividerProps {
  className?: string;
}

export const WaveDivider = ({ className = '' }: WaveDividerProps) => (
  <div className={`w-full overflow-hidden ${className}`}>
    <RhythmWave variant="divider" />
  </div>
);
