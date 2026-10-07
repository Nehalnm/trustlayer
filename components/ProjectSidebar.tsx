"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type ProjectSidebarProps = {
  projectId: string;
};

export default function ProjectSidebar({ projectId }: ProjectSidebarProps) {
  const pathname = usePathname();

  const links = [
    {
      label: "Overview",
      href: `/project/${projectId}`,
    },
    {
      label: "Contract",
      href: `/project/${projectId}/contract`,
    },
    {
      label: "Payments",
      href: `/project/${projectId}/payments`,
    },
    {
      label: "Activity",
      href: `/project/${projectId}/activity`,
    },
  ];

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 bg-[#101827] text-white lg:flex lg:flex-col">
        <div className="border-b border-slate-800 px-6 py-6">
          <Link href="/" className="text-xl font-semibold tracking-tight">
            TrustLayer
          </Link>

          <p className="mt-1 text-xs text-slate-400">Work before money.</p>
        </div>

        <nav className="flex-1 px-3 py-6">
          <p className="px-3 pb-3 text-[11px] font-medium uppercase tracking-wider text-slate-500">
            Workspace
          </p>

          <div className="space-y-1">
            {links.map((link) => {
              const active =
                link.label === "Overview"
                  ? pathname === link.href
                  : pathname.startsWith(link.href);

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`block px-3 py-2.5 text-sm transition ${
                    active
                      ? "bg-[#1d2a3d] font-medium text-white"
                      : "text-slate-400 hover:bg-[#172337] hover:text-white"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="border-t border-slate-800 px-6 py-5">
          <p className="text-xs text-slate-500">Workspace</p>
          <p className="mt-1 text-sm font-medium">Freelancer</p>
        </div>
      </aside>

      {/* Mobile navigation */}
      <div className="border-b border-slate-200 bg-[#101827] text-white lg:hidden">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-lg font-semibold tracking-tight">
              TrustLayer
            </Link>

            <span className="text-xs text-slate-400">Workspace</span>
          </div>

          <nav className="mt-4 flex gap-1 overflow-x-auto pb-1">
            {links.map((link) => {
              const active =
                link.label === "Overview"
                  ? pathname === link.href
                  : pathname.startsWith(link.href);

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`whitespace-nowrap px-3 py-2 text-sm transition ${
                    active
                      ? "bg-white text-slate-950"
                      : "text-slate-400 hover:bg-[#1d2a3d] hover:text-white"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </>
  );
}
