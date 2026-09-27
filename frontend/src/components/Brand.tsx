import { Link } from "react-router-dom";

export function Brand({ dark = false }: { dark?: boolean }) {
  return (
    <Link
      className={`inline-flex items-center gap-2 text-lg font-extrabold tracking-[-0.05em] ${dark ? "text-white" : "text-[#23232f]"}`}
      to="/"
    >
      <span
        className={`grid size-7 place-items-center rounded-[9px] text-xs tracking-[-0.08em] ${dark ? "bg-[#ececf5] text-[#252633]" : "bg-[#23232f] text-white"}`}
      >
        W
      </span>
      worktoon
    </Link>
  );
}
