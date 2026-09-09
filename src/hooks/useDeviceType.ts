import { useEffect, useState } from 'react';
import { SizeValue } from '../types';

export type DeviceType = 'mobile' | 'tablet' | 'desktop';

const MOBILE_MAX = 640;   // هم‌راستا با breakpoint sm در tailwind.config
const TABLET_MAX = 1024;  // هم‌راستا با breakpoint lg در tailwind.config

export function useDeviceType(): DeviceType {
  const getType = (): DeviceType => {
    if (typeof window === 'undefined') return 'desktop';
    const w = window.innerWidth;
    if (w < MOBILE_MAX) return 'mobile';
    if (w < TABLET_MAX) return 'tablet';
    return 'desktop';
  };

  const [device, setDevice] = useState<DeviceType>(getType);

  useEffect(() => {
    const onResize = () => setDevice(getType());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return device;
}

export function sizeToCss(size?: SizeValue | null, fallback = '48px'): string {
  if (!size || typeof size.value !== 'number' || isNaN(size.value)) return fallback;
  return `${size.value}${size.unit || 'px'}`;
}
