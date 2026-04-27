interface SteamIconProps {
  className?: string;
}

export function SteamIcon({ className }: SteamIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 2a10 10 0 0 0-9.96 9.16l5.39 2.23a2.73 2.73 0 0 1 1.54-.47h.08l2.36-3.43v-.04A3.67 3.67 0 1 1 15.09 13h-.07l-3.37 2.4a2.75 2.75 0 0 1-5.28 1.12l-3.84-1.58A10 10 0 1 0 12 2Zm-4.73 15.06-1.23-.5a2.08 2.08 0 1 0 1.15-2.8l1.27.52a1.53 1.53 0 1 1-1.2 2.78Zm7.82-2.58a2.45 2.45 0 1 1 2.45-2.45 2.45 2.45 0 0 1-2.45 2.45Zm0-4.28a1.83 1.83 0 1 0 1.83 1.83 1.83 1.83 0 0 0-1.83-1.83Z" />
    </svg>
  );
}
