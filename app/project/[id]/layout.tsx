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
    <div className="min-h-screen bg-[#0d0f13] text-slate-100">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <ProjectSidebar projectId={id} />

        <div className="workspace-content min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
