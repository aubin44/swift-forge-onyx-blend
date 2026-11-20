export function Mark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="7" fill="currentColor" />
      <path d="M16 4.6 29 27.4H3Z" fill="#C65D12" />
      <path d="M5.8 22.2 10.2 16.8 13.1 19.4 16 12.6 19 18.6 22.4 15.4 26.2 21.4V27.4H5.8Z" fill="#F4F0E6" />
    </svg>
  );
}
