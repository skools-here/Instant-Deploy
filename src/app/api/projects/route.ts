import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { projectSchema } from "@/lib/validation";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const projects = await prisma.project.findMany({
      where: { userId: session.user.id },
      include: {
        _count: {
          select: { deployments: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return Response.json(projects);
  } catch (error: any) {
    return Response.json({ error: error.message || "Failed to fetch projects" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const validated = projectSchema.parse(body);

    // Check if project name already exists for this user
    const existing = await prisma.project.findFirst({
      where: {
        name: validated.name,
        userId: session.user.id,
      },
    });

    if (existing) {
      return Response.json({ error: "Project name already exists under your account" }, { status: 400 });
    }

    const project = await prisma.project.create({
      data: {
        name: validated.name,
        description: validated.description,
        userId: session.user.id,
      },
    });

    return Response.json(project, { status: 201 });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return Response.json({ error: error.issues[0].message }, { status: 400 });
    }
    return Response.json({ error: error.message || "Failed to create project" }, { status: 500 });
  }
}
