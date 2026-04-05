export const BANKS = [
  { id: 'kaspi',   name: 'Kaspi',       color: '#E31E24', bgColor: 'bg-red-100',    textColor: 'text-red-700',    icon: '🔴' },
  { id: 'halyk',   name: 'Halyk Bank',  color: '#009B4E', bgColor: 'bg-green-100',  textColor: 'text-green-700',  icon: '🟢' },
  { id: 'freedom', name: 'Freedom Bank',color: '#0066CC', bgColor: 'bg-blue-100',   textColor: 'text-blue-700',   icon: '🔵' },
  { id: 'forte',   name: 'ForteBank',   color: '#FF6B00', bgColor: 'bg-orange-100', textColor: 'text-orange-700', icon: '🟠' },
  { id: 'other',   name: 'Другой',      color: '#6B7280', bgColor: 'bg-gray-100',   textColor: 'text-gray-700',   icon: '⚪' },
] as const;

export type BankId = typeof BANKS[number]['id'];

export function getBankById(id: string) {
  return BANKS.find(b => b.id === id) ?? BANKS[4];
}
