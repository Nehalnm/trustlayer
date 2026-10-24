export type ProjectParticipants = { created_by: string | null; freelancer_id: string | null };

export function projectRole(project: ProjectParticipants, userId: string): "CLIENT" | "FREELANCER" | null {
  if (project.created_by === userId) return "CLIENT";
  if (project.freelancer_id === userId) return "FREELANCER";
  return null;
}

export function canSubmitWork(project: ProjectParticipants, userId: string) {
  // Preserve existing single-account demos until a freelancer is assigned.
  return project.freelancer_id ? project.freelancer_id === userId : project.created_by === userId;
}
