interface TelegramIconProps {
  className?: string;
}

export function TelegramIcon({ className }: TelegramIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm4.63 6.82-1.54 7.28c-.12.53-.42.66-.86.41l-2.38-1.76-1.15 1.1a.6.6 0 0 1-.48.23l.17-2.4 4.36-3.94c.19-.17-.04-.26-.29-.1l-5.4 3.4-2.33-.73c-.5-.16-.51-.5.1-.74l9.13-3.52c.42-.15.8.1.67.77Z" />
    </svg>
  );
}
