import {
  House, Lightning, ShoppingCart, Truck, Pulse, DeviceMobile,
  Coffee, ForkKnife, TShirt, FilmStrip, Barbell, Gift, DotsThree,
  Bank, Shield, Target, CurrencyDollar, Car, AppleLogo, WifiHigh,
  Airplane, Laptop, GraduationCap, Heart, Globe, Couch, Camera,
  Lock, ArrowsClockwise, Receipt,
  type Icon as PhosphorIcon,
} from '@phosphor-icons/react';
import { createElement, type ComponentType } from 'react';

export type IconName = string;

type PhosphorIconComponent = ComponentType<React.ComponentProps<PhosphorIcon>>;

const ICON_MAP: Record<string, PhosphorIconComponent> = {
  House, Lightning, ShoppingCart, Truck, Pulse, DeviceMobile,
  Coffee, ForkKnife, TShirt, FilmStrip, Barbell, Gift, DotsThree,
  Bank, Shield, Target, CurrencyDollar, Car, AppleLogo, WifiHigh,
  Airplane, Laptop, GraduationCap, Heart, Globe, Couch, Camera,
  Lock, ArrowsClockwise, Receipt,
};

interface IconProps {
  name: string;
  size?: number;
  weight?: 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone';
  className?: string;
  strokeWidth?: number; // ignored, kept for compatibility
}

export function Icon({ name, size = 16, weight = 'regular', strokeWidth: _sw, ...props }: IconProps) {
  const Comp = ICON_MAP[name] ?? CurrencyDollar;
  return createElement(Comp, { size, weight, ...props });
}

export const FIXED_ICON_NAMES: string[] = [
  'House', 'Lightning', 'WifiHigh', 'DeviceMobile', 'Car', 'Shield',
  'Heart', 'GraduationCap', 'Lock', 'ArrowsClockwise', 'Receipt', 'Bank',
];

export const GOAL_ICON_NAMES: string[] = [
  'Target', 'Car', 'Airplane', 'House', 'DeviceMobile', 'Laptop',
  'GraduationCap', 'Heart', 'Globe', 'Couch', 'Camera', 'Barbell',
  'Gift', 'FilmStrip', 'CurrencyDollar',
];

export const GOAL_COLORS: string[] = [
  '#2274A5', '#15664E', '#7A5210', '#9B2525',
  '#185C85', '#3D5A80', '#4A3F30', '#6B5B40',
];
