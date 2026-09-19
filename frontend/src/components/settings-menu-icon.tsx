import type { SVGProps } from "react";

type SettingsMenuIconProps = SVGProps<SVGSVGElement> & {
  name: "profile" | "system" | "notifications" | "help" | "about";
};

const ICON_PATHS = {
  profile: (
    <>
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5.5 19.2c.7-3 3-4.6 6.5-4.6s5.8 1.6 6.5 4.6" />
      <path d="M4.5 4.5h15v15h-15z" opacity=".35" />
    </>
  ),
  system: (
    <>
      <path d="M12 3.5v3M12 17.5v3M3.5 12h3M17.5 12h3M6 6l2.1 2.1M15.9 15.9 18 18M18 6l-2.1 2.1M8.1 15.9 6 18" />
      <circle cx="12" cy="12" r="4.2" />
    </>
  ),
  notifications: (
    <>
      <path d="M6.5 16.8h11l-1.2-1.7V11a4.3 4.3 0 0 0-8.6 0v4.1z" />
      <path d="M10 19h4M12 3v1.2" />
      <circle cx="18.3" cy="5.4" r="1.7" fill="currentColor" stroke="none" />
    </>
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M9.8 9.3a2.3 2.3 0 1 1 3.9 1.7c-.9.8-1.7 1.2-1.7 2.5" />
      <path d="M12 16.7h.01" />
    </>
  ),
  about: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 10.8v5M12 7.7h.01" />
    </>
  ),
} as const;

const ICON_TONE = {
  profile: "bg-primary/10 text-primary",
  system: "bg-secondary/15 text-[#b86a00]",
  notifications: "bg-[#eeeafd] text-[#6853c7]",
  help: "bg-[#e3f5f1] text-[#147d6d]",
  about: "bg-muted text-muted-foreground",
} as const;

export function SettingsMenuIcon({ name, className = "", ...props }: SettingsMenuIconProps) {
  return (
    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${ICON_TONE[name]} ${className}`}>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-[18px] w-[18px]"
        aria-hidden="true"
        {...props}
      >
        {ICON_PATHS[name]}
      </svg>
    </span>
  );
}
