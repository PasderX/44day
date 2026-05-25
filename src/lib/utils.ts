import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const services = [
  {
    id: 'internet',
    icon: '📡',
    price: '5-15',
    currency: 'AZN',
    link: '#', // Здесь будет ваша ссылка
    popular: true,
  },
  {
    id: 'smm',
    icon: '📈',
    price: '3-50',
    currency: 'AZN',
    link: '#',
    popular: true,
  },
  {
    id: 'keys',
    icon: '🔑',
    price: '10-100',
    currency: 'AZN',
    link: '#',
    popular: false,
  },
  {
    id: 'search',
    icon: '🔍',
    price: '20-50',
    currency: 'AZN',
    link: '#',
    popular: false,
  },
  {
    id: 'recovery',
    icon: '🔓',
    price: '25-100',
    currency: 'AZN',
    link: '#',
    popular: true,
  },
  {
    id: 'vpn',
    icon: '🛡️',
    price: '5-30',
    currency: 'AZN',
    link: '#',
    popular: false,
  },
];
