import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDeploymentStatus, scaleDeployment, deleteDeployment } from "@/lib/k8s";
import { z } from "zod";

const scaleSchema = z.object({
  replicas: z.coerce.number().int().min(1).max(10),
});

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
    // 1. Verify project ownership and fetch deployment
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

    // 2. Fetch live status from Kubernetes helper
    const k8sStatus = await getDeploymentStatus(deployment.name);

    // 3. Return combined status
    return Response.json({
      ...deployment,
      liveStatus: k8sStatus,
    });
  } catch (error: any) {
    return Response.json({ error: error.message || "Failed to fetch deployment status" }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ projectId: string; deploymentId: string }> }
) {
  const { projectId, deploymentId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Verify ownership and get deployment
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

    // 2. Validate input body
    const body = await req.json();
    const { replicas } = scaleSchema.parse(body);

    // 3. Call Kubernetes to scale
    await scaleDeployment(deployment.name, replicas);

    // 4. Update replicas in PostgreSQL
    const updated = await prisma.deployment.update({
      where: { id: deploymentId },
      data: { replicas },
    });

    return Response.json(updated);
  } catch (error: any) {
    if (error.name === "ZodError") {
      return Response.json({ error: error.issues[0].message }, { status: 400 });
    }
    return Response.json({ error: error.message || "Failed to scale deployment" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ projectId: string; deploymentId: string }> }
) {
  const { projectId, deploymentId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Verify ownership and fetch deployment
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

    // 2. Call Kubernetes to delete the deployment & service resources
    try {
      await deleteDeployment(deployment.name);
    } catch (k8sErr: any) {
      console.warn("Kubernetes deletion warning (resources might not have existed):", k8sErr);
    }

    // 3. Delete deployment record from PostgreSQL database
    await prisma.deployment.delete({
      where: { id: deploymentId },
    });

    return Response.json({ message: "Deployment deleted successfully" });
  } catch (error: any) {
    return Response.json({ error: error.message || "Failed to delete deployment" }, { status: 500 });
  }
}
