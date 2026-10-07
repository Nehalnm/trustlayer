import ProjectSidebar from "@/components/ProjectSidebar";

type ProjectLayoutProps = {
  children: React.ReactNode;
  params: Promise<{
    id: string;
  }>;
};

export default async function ProjectLayout({
  children,
  params,
}: ProjectLayoutProps) {
  const { id } = await params;

  return (
    <div className="min-h-screen bg-[#f6f5f2] text-slate-950">
      <div className="flex min-h-screen">
        <ProjectSidebar projectId={id} />

        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
