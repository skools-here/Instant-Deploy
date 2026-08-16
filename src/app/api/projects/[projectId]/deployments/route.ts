import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deploymentSchema } from "@/lib/validation";
import { createDeployment } from "@/lib/k8s";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Verify project belongs to user
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: session.user.id },
    });

    if (!project) {
      return Response.json({ error: "Project not found or access denied" }, { status: 404 });
    }

    const deployments = await prisma.deployment.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
    });

    return Response.json(deployments);
  } catch (error: any) {
    return Response.json({ error: error.message || "Failed to fetch deployments" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Verify project ownership
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: session.user.id },
    });

    if (!project) {
      return Response.json({ error: "Project not found or access denied" }, { status: 404 });
    }

    // 2. Validate request
    const body = await req.json();
    const validated = deploymentSchema.parse(body);

    // 3. Check for deployment name uniqueness globally in the database
    const existing = await prisma.deployment.findUnique({
      where: { name: validated.name },
    });

    if (existing) {
      return Response.json({ error: "Deployment name must be globally unique" }, { status: 400 });
    }

    // 4. Create record in PostgreSQL
    const deployment = await prisma.deployment.create({
      data: {
        name: validated.name,
        imageName: validated.imageName,
        replicas: validated.replicas,
        port: validated.port,
        status: "PENDING",
        projectId,
      },
    });

    try {
      // 5. Trigger Kubernetes client deployment creation
      const { serviceName } = await createDeployment(
        validated.name,
        validated.imageName,
        validated.replicas
      );

      // 6. Update deployment record with service info and success status
      const updatedDeployment = await prisma.deployment.update({
        where: { id: deployment.id },
        data: {
          serviceName,
          status: "RUNNING",
        },
      });

      return Response.json(updatedDeployment, { status: 201 });
    } catch (k8sErr: any) {
      console.error("Kubernetes creation failed, marking deployment as FAILED:", k8sErr);
      // Mark deployment status as FAILED in database
      const failedDeployment = await prisma.deployment.update({
        where: { id: deployment.id },
        data: {
          status: "FAILED",
        },
      });
      return Response.json(
        {
          error: `Kubernetes deployment failed: ${k8sErr.message || k8sErr}`,
          deployment: failedDeployment,
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    if (error.name === "ZodError") {
      return Response.json({ error: error.issues[0].message }, { status: 400 });
    }
    return Response.json({ error: error.message || "Failed to create deployment" }, { status: 500 });
  }
}
