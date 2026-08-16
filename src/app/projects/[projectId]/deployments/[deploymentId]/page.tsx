import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import DeploymentDetailsClient from "./DeploymentDetailsClient";

export default async function DeploymentDetailPage({
  params,
}: {
  params: Promise<{ projectId: string; deploymentId: string }>;
}) {
  const { projectId, deploymentId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/");
  }

  // Verify project and deployment ownership
  const deployment = await prisma.deployment.findFirst({
    where: {
      id: deploymentId,
      projectId,
      project: { userId: session.user.id },
    },
    include: {
      project: true,
    },
  });

  if (!deployment) {
    notFound();
  }

  return <DeploymentDetailsClient deployment={deployment} />;
}
