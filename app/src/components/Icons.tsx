import type { ReactElement, SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 21, strokeWidth = 2.4, children, ...rest }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} aria-hidden="true" {...rest}>
      {children}
    </svg>
  );
}

export const HomeIcon = (p: P) => (
  <Svg {...p}>
    <path d="M15 21v-7h-6v7" />
    <path d="M3 10.2a2 2 0 0 1 .7-1.5l7-6a2 2 0 0 1 2.6 0l7 6a2 2 0 0 1 .7 1.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
  </Svg>
);

export const CalendarIcon = (p: P) => (
  <Svg {...p}>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </Svg>
);

export const PillIcon = (p: P) => (
  <Svg {...p}>
    <path d="M10.5 20.5 20 11a5 5 0 0 0-7-7l-9.5 9.5a5 5 0 0 0 7 7Z" />
    <path d="m8.5 8.5 7 7" />
  </Svg>
);

export const HelpIcon = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M9.5 9.5a2.5 2.5 0 1 1 3.4 2.3c-.6.3-.9.8-.9 1.5v.4M12 17h.01" />
  </Svg>
);

export const AlertIcon = (p: P) => (
  <Svg strokeWidth={2.6} {...p}>
    <path d="M12 3 2 20h20L12 3z" />
    <path d="M12 9v5M12 17h.01" />
  </Svg>
);

export const SlidersIcon = (p: P) => (
  <Svg size={18} {...p}>
    <path d="M21 4h-7M10 4H3M21 12h-9M8 12H3M21 20h-5M12 20H3M14 2v4M8 10v4M16 18v4" />
  </Svg>
);

export const ClockIcon = (p: P) => (
  <Svg size={18} strokeWidth={2.6} {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Svg>
);

export const PhoneIcon = (p: P) => (
  <Svg size={20} strokeWidth={2.4} {...p}>
    <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" />
  </Svg>
);

/** One face construction across the scale: only the mouth and brows change. */
const FACE_PARTS: ReactElement[] = [
  <>
    <circle cx="11.9" cy="13.6" r="1.25" fill="currentColor" stroke="none" />
    <circle cx="20.1" cy="13.6" r="1.25" fill="currentColor" stroke="none" />
    <path d="M10.7 19.1q5.3 5.4 10.6 0" />
  </>,
  <>
    <circle cx="11.9" cy="13.6" r="1.25" fill="currentColor" stroke="none" />
    <circle cx="20.1" cy="13.6" r="1.25" fill="currentColor" stroke="none" />
    <path d="M11.3 20.5q4.7 3.2 9.4 0" />
  </>,
  <>
    <circle cx="11.9" cy="13.6" r="1.25" fill="currentColor" stroke="none" />
    <circle cx="20.1" cy="13.6" r="1.25" fill="currentColor" stroke="none" />
    <path d="M11.3 21.2h9.4" />
  </>,
  <>
    <path d="M9.7 12.4 13.3 11.1M22.3 12.4 18.7 11.1" />
    <circle cx="11.9" cy="14.6" r="1.25" fill="currentColor" stroke="none" />
    <circle cx="20.1" cy="14.6" r="1.25" fill="currentColor" stroke="none" />
    <path d="M11.4 22.3q4.6-3.4 9.2 0" />
  </>,
  <>
    <path d="M9.7 12.4 13.3 11.1M22.3 12.4 18.7 11.1" />
    <circle cx="11.9" cy="14.6" r="1.25" fill="currentColor" stroke="none" />
    <circle cx="20.1" cy="14.6" r="1.25" fill="currentColor" stroke="none" />
    <path d="M11.1 23.3q4.9-5.2 9.8 0" />
  </>,
  <>
    <path d="M9.5 12.8 13.5 10.9M22.5 12.8 18.5 10.9" />
    <path d="M10.6 15q1.3-1.4 2.6 0M19.4 15q1.3-1.4 2.6 0" />
    <ellipse cx="16" cy="21.7" rx="3.9" ry="3.3" />
  </>,
];

export function Face({ level }: { level: number }) {
  return (
    <svg width="30" height="30" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
      <circle cx="16" cy="16" r="13" />
      {FACE_PARTS[level]}
    </svg>
  );
}
