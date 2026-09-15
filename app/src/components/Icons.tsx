import React from 'react';
import Svg, {Path, Rect, Circle, Polyline} from 'react-native-svg';

export interface IconProps {
  size?: number;
  color?: string;
}

export const StethoscopeIcon: React.FC<IconProps> = ({size = 20, color = '#0F172A'}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M11 2v2" />
    <Path d="M5 2v2" />
    <Path d="M5 3H4a2 2 0 0 0-2 2v4a6 6 0 0 0 12 0V5a2 2 0 0 0-2-2h-1" />
    <Path d="M8 15a6 6 0 0 0 12 0v-3" />
    <Circle cx={20} cy={10} r={2} />
  </Svg>
);

export const PhoneIcon: React.FC<IconProps> = ({size = 20, color = '#0F172A'}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Rect width={14} height={20} x={5} y={2} rx={2} ry={2} />
    <Path d="M12 18h.01" />
  </Svg>
);

export const TvIcon: React.FC<IconProps> = ({size = 20, color = '#0F172A'}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Rect width={20} height={15} x={2} y={7} rx={2} ry={2} />
    <Polyline points="17 2 12 7 7 2" />
  </Svg>
);

export const AlertTriangleIcon: React.FC<IconProps> = ({size = 20, color = '#D97706'}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
    <Path d="M12 9v4" />
    <Path d="M12 17h.01" />
  </Svg>
);

