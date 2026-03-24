import {
  Home, Zap, ShoppingCart, Truck, Activity, Smartphone,
  Coffee, UtensilsCrossed, Shirt, Film, Dumbbell, Gift, MoreHorizontal,
  Landmark, Shield, Target, DollarSign, Car, Apple, Wifi,
  Plane, Laptop, GraduationCap, Heart, Globe, Sofa, Camera,
  type LucideProps,
} from 'lucide-react';
import { createElement, type ComponentType } from 'react';

export type IconName = string;

const ICON_MAP: Record<string, ComponentType<LucideProps>> = {
  Home, Zap, ShoppingCart, Truck, Activity, Smartphone,
  Coffee, UtensilsCrossed, Shirt, Film, Dumbbell, Gift, MoreHorizontal,
  Landmark, Shield, Target, DollarSign, Car, Apple, Wifi,
  Plane, Laptop, GraduationCap, Heart, Globe, Sofa, Camera,
};

interface IconProps extends LucideProps {
  name: string;
}

export function Icon({ name, size = 16, strokeWidth = 2, ...props }: IconProps) {
  const Comp = ICON_MAP[name] ?? DollarSign;
  return createElement(Comp, { size, strokeWidth, ...props });
}

export const GOAL_ICON_NAMES: string[] = [
  'Target', 'Car', 'Plane', 'Home', 'Smartphone', 'Laptop',
  'GraduationCap', 'Heart', 'Globe', 'Sofa', 'Camera', 'Dumbbell',
  'Gift', 'Film', 'DollarSign',
];

export const GOAL_COLORS: string[] = [
  '#2274A5', '#15664E', '#7A5210', '#9B2525',
  '#185C85', '#3D5A80', '#4A3F30', '#6B5B40',
];
