import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPodLogs } from "@/lib/k8s";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ projectId: string; deploymentId: string }> }
) {
  const { projectId, deploymentId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Verify deployment ownership
    const deployment = await prisma.deployment.findFirst({
      where: {
        id: deploymentId,
        projectId,
        project: { userId: session.user.id },
      },
    });

    if (!deployment) {
      return Response.json({ error: "Deployment not found or access denied" }, { status: 404 });
    }

    // 2. Fetch pod logs
    const logs = await getPodLogs(deployment.name);
    return Response.json({ logs });
  } catch (error: any) {
    return Response.json({ error: error.message || "Failed to fetch logs" }, { status: 500 });
  }
}
