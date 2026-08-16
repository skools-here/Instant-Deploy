import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ProjectDetailsClient from "./ProjectDetailsClient";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/");
  }

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      userId: session.user.id,
    },
  });

  if (!project) {
    notFound();
  }

  return <ProjectDetailsClient project={project} />;
}
