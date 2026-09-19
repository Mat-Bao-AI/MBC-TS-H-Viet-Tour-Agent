import type { SVGProps } from "react";

export function BackIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true" {...props}>
      <path d="M19 12H5" />
      <path d="m11 6-6 6 6 6" />
    </svg>
  );
}

export function CompassIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-9 w-9 text-primary" aria-hidden="true" {...props}>
      <circle cx="12" cy="12" r="8.5" fill="currentColor" fillOpacity=".1" />
      <path d="m15.8 8.2-2.1 5.5-5.5 2.1 2.1-5.5z" fill="currentColor" fillOpacity=".18" />
      <path d="m15.8 8.2-2.1 5.5-5.5 2.1 2.1-5.5z" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}
