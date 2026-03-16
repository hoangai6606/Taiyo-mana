interface StatusBadgeProps {
  label: string;
  colorClass: string;
  dot?: boolean;
}

export function StatusBadge({ label, colorClass, dot = false }: StatusBadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${colorClass}`}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />}
      {label}
    </span>
  );
}
