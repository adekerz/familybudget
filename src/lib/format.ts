import { parseLocalDate } from './dates';

export function formatMoney(amount: number): string {
  const sign = amount < 0 ? '-' : '';
  const abs = Math.abs(amount);
  const formatted = abs.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${sign}${formatted} \u20B8`;
}

export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length !== 11) return phone;
  return `+${digits[0]} ${digits.slice(1, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 9)} ${digits.slice(9, 11)}`;
}

export function formatDate(dateStr: string): string {
  // parseLocalDate избегает UTC-смещения при парсинге ISO-дат
  const date = parseLocalDate(dateStr);
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

export function formatDateFull(dateStr: string): string {
  const date = parseLocalDate(dateStr);
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function parseMoney(input: string): number {
  // Сначала заменяем десятичную запятую на точку (до удаления разделителей),
  // затем удаляем символ валюты, пробелы и разделители тысяч.
  const clean = input
    .replace(/[₸]/g, '')      // убрать символ валюты
    .trim()
    .replace(/\s/g, '')       // убрать пробелы (разделители тысяч)
    .replace(',', '.');       // десятичная запятая → точка
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : Math.round(num);
}
