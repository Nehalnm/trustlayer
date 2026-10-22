import Link from "next/link";

export function BrandMark({ className = "h-9 w-9" }: { className?: string }) {
  return <span className={`inline-flex shrink-0 items-center justify-center rounded-xl border border-blue-400/25 bg-blue-500/10 ${className}`}>
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
      <path d="m12 3 8 4.5-8 4.5-8-4.5L12 3Z" stroke="#8baaff" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="m4 12 8 4.5 8-4.5M4 16.5l8 4.5 8-4.5" stroke="#69e6b7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </span>;
}

export default function Brand() {
  return <Link href="/" className="inline-flex items-center gap-2.5" aria-label="TrustLayer home">
    <BrandMark />
    <span className="text-xl font-semibold tracking-[-0.055em] text-white">trust<span className="text-slate-400">layer</span><span className="text-emerald-300">.</span></span>
  </Link>;
}
