// Custom movement icons ported verbatim from the Session Generator design
// mockup (gen/icons.jsx) so Move / Stretch / Both match the design exactly.
// 24px grid, 1.9 stroke, rounded caps, inherits color like the lucide icons.
import Svg, { Path } from 'react-native-svg';

type IconProps = { size?: number; color?: string; strokeWidth?: number };

export function MoveIcon({ size = 24, color = '#000', strokeWidth = 1.9 }: IconProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="M6 4v16M3 8v8M18 4v16M21 8v8M6 12h12" />
    </Svg>
  );
}

export function StretchIcon({ size = 24, color = '#000', strokeWidth = 1.9 }: IconProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="M4 12h16" />
      <Path d="M4 12l3-3M4 12l3 3M20 12l-3-3M20 12l-3 3" />
    </Svg>
  );
}

export function BothIcon({ size = 24, color = '#000', strokeWidth = 1.9 }: IconProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="M13 2 3 14h7l-1 8 10-12h-7z" />
    </Svg>
  );
}
