import type { SVGProps } from "react";

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

const FACES = [
  { brows: "", eyes: "M11.9 13.6h.01M20.1 13.6h.01", mouth: "M10.7 19.1q5.3 5.4 10.6 0" },
  { brows: "", eyes: "M11.9 13.6h.01M20.1 13.6h.01", mouth: "M11.3 20.5q4.7 3.2 9.4 0" },
  { brows: "", eyes: "M11.9 13.6h.01M20.1 13.6h.01", mouth: "M11.3 21.2h9.4" },
  { brows: "M9.7 12.4 13.3 11.1M22.3 12.4 18.7 11.1", eyes: "M11.9 14.6h.01M20.1 14.6h.01", mouth: "M11.4 22.3q4.6-3.4 9.2 0" },
  { brows: "M9.7 12.4 13.3 11.1M22.3 12.4 18.7 11.1", eyes: "M11.9 14.6h.01M20.1 14.6h.01", mouth: "M11.1 23.3q4.9-5.2 9.8 0" },
  { brows: "M9.5 12.8 13.5 10.9M22.5 12.8 18.5 10.9", eyes: "M10.6 15q1.3-1.4 2.6 0M19.4 15q1.3-1.4 2.6 0", mouth: "M12.1 21.7a3.9 3.3 0 1 0 7.8 0a3.9 3.3 0 1 0-7.8 0", open: true },
];

/** One face construction across the scale: only brows, eyes and mouth change. Filled green → red. */
export function Face({ level, color }: { level: number; color: string }) {
  const f = FACES[level];
  return (
    <svg width="40" height="40" viewBox="0 0 32 32" fill="none" stroke="#2b2723" strokeWidth="1.9" aria-hidden="true">
      <circle cx="16" cy="16" r="13.5" fill={color} />
      {f.brows && <path d={f.brows} />}
      <path d={f.eyes} strokeWidth={f.open ? 1.9 : 2.8} />
      <path d={f.mouth} fill={f.open ? "#2b2723" : "none"} />
    </svg>
  );
}

export const LockIcon = (p: P) => (
  <Svg size={18} {...p}>
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </Svg>
);

export const InfoIcon = (p: P) => (
  <Svg size={18} {...p}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-4M12 8h.01" />
  </Svg>
);

export const ChevronLeftIcon = (p: P) => (
  <Svg size={18} strokeWidth={2.6} {...p}>
    <path d="m15 18-6-6 6-6" />
  </Svg>
);

export const CloseIcon = (p: P) => (
  <Svg size={20} strokeWidth={2.6} {...p}>
    <path d="M18 6 6 18M6 6l12 12" />
  </Svg>
);
