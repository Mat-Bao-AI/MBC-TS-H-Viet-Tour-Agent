import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const iconClass = "h-4 w-4 shrink-0";

export function LinkIcon(props: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={iconClass} aria-hidden="true" {...props}><path d="M10 13.8a4 4 0 0 0 5.8.2l2.1-2.1a4 4 0 0 0-5.7-5.7l-1.2 1.2" /><path d="M14 10.2a4 4 0 0 0-5.8-.2l-2.1 2.1a4 4 0 0 0 5.7 5.7l1.2-1.2" /></svg>;
}

export function QrIcon(props: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={iconClass} aria-hidden="true" {...props}><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4z" /><path d="M14 14h2M18 14h2M14 18h2M18 18h2M17 16h3" /></svg>;
}

export function EyeIcon(props: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={iconClass} aria-hidden="true" {...props}><path d="M2.5 12s3.4-5 9.5-5 9.5 5 9.5 5-3.4 5-9.5 5-9.5-5-9.5-5z" /><circle cx="12" cy="12" r="2.3" /></svg>;
}

export function ListIcon(props: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={iconClass} aria-hidden="true" {...props}><rect x="4" y="3.5" width="16" height="17" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></svg>;
}

export function ChartIcon(props: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={iconClass} aria-hidden="true" {...props}><path d="M5 19V10M12 19V5M19 19v-7" /><path d="M3.5 19.5h17" /></svg>;
}

export function CloseIcon(props: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-5 w-5" aria-hidden="true" {...props}><path d="m6 6 12 12M18 6 6 18" /></svg>;
}
