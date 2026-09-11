import React from 'react';
import Svg, {Path, Rect, Circle, Line, Polyline, Polygon} from 'react-native-svg';

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

export const ClockIcon: React.FC<IconProps> = ({size = 20, color = '#0F172A'}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Circle cx={12} cy={12} r={10} />
    <Polyline points="12 6 12 12 16 14" />
  </Svg>
);

export const UsersIcon: React.FC<IconProps> = ({size = 20, color = '#0F172A'}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <Circle cx={9} cy={7} r={4} />
    <Path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <Path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </Svg>
);

export const TvIcon: React.FC<IconProps> = ({size = 20, color = '#0F172A'}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Rect width={20} height={15} x={2} y={7} rx={2} ry={2} />
    <Polyline points="17 2 12 7 7 2" />
  </Svg>
);

export const ShieldCheckIcon: React.FC<IconProps> = ({size = 20, color = '#0F172A'}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <Path d="m9 12 2 2 4-4" />
  </Svg>
);

export const ChevronRightIcon: React.FC<IconProps> = ({size = 20, color = '#0F172A'}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <Polyline points="9 18 15 12 9 6" />
  </Svg>
);

export const Volume2Icon: React.FC<IconProps> = ({size = 20, color = '#0F172A'}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    <Path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
    <Path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
  </Svg>
);

export const QrCodeIcon: React.FC<IconProps> = ({size = 20, color = '#0F172A'}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Rect width={5} height={5} x={3} y={3} rx={1} />
    <Rect width={5} height={5} x={16} y={3} rx={1} />
    <Rect width={5} height={5} x={3} y={16} rx={1} />
    <Path d="M21 16h-3a2 2 0 0 0-2 2v3" />
  </Svg>
);

export const SunIcon: React.FC<IconProps> = ({size = 20, color = '#0F172A'}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Circle cx={12} cy={12} r={5} />
    <Line x1={12} y1={1} x2={12} y2={3} />
    <Line x1={12} y1={21} x2={12} y2={23} />
    <Line x1={4.22} y1={4.22} x2={5.64} y2={5.64} />
    <Line x1={18.36} y1={18.36} x2={19.78} y2={19.78} />
    <Line x1={1} y1={12} x2={3} y2={12} />
    <Line x1={21} y1={12} x2={23} y2={12} />
    <Line x1={4.22} y1={19.78} x2={5.64} y2={18.36} />
    <Line x1={18.36} y1={5.64} x2={19.78} y2={4.22} />
  </Svg>
);

export const MoonIcon: React.FC<IconProps> = ({size = 20, color = '#0F172A'}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </Svg>
);

export const SettingsIcon: React.FC<IconProps> = ({size = 20, color = '#0F172A'}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Circle cx={12} cy={12} r={3} />
    <Path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </Svg>
);

export const LogOutIcon: React.FC<IconProps> = ({size = 20, color = '#0F172A'}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <Polyline points="16 17 21 12 16 7" />
    <Line x1={21} y1={12} x2={9} y2={12} />
  </Svg>
);

export const AlertTriangleIcon: React.FC<IconProps> = ({size = 20, color = '#D97706'}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
    <Line x1={12} y1={9} x2={12} y2={13} />
    <Line x1={12} y1={17} x2={12.01} y2={17} />
  </Svg>
);

export const CheckIcon: React.FC<IconProps> = ({size = 20, color = '#16A34A'}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <Polyline points="20 6 9 17 4 12" />
  </Svg>
);

export const PhoneIcon: React.FC<IconProps> = ({size = 20, color = '#0F172A'}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Rect width={14} height={20} x={5} y={2} rx={2} ry={2} />
    <Path d="M12 18h.01" />
  </Svg>
);
