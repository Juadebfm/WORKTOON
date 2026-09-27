export function LoadingMark({ label = "Loading" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="size-2 animate-pulse rounded-full bg-current" />
      {label}
    </span>
  );
}
