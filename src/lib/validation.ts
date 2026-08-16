import { z } from "zod";

// Validates public image formats:
// - nginx:latest
// - redis:latest
// - docker.io/user/app:latest (or tag)
// - ghcr.io/user/app:latest (or tag)
const publicImageSchema = z.string().refine((val) => {
  if (val === "nginx:latest" || val === "redis:latest") return true;
  if (val.startsWith("docker.io/") || val.startsWith("ghcr.io/")) {
    const parts = val.split("/");
    if (parts.length === 3) {
      const appAndTag = parts[2].split(":");
      if (appAndTag.length === 2 && appAndTag[1] === "latest") {
        return true;
      }
    }
  }
  return false;
}, {
  message: "Unsupported image format. Allowed: nginx:latest, redis:latest, docker.io/user/app:latest, or ghcr.io/user/app:latest",
});

export const projectSchema = z.object({
  name: z
    .string()
    .min(3, "Project name must be at least 3 characters")
    .max(30, "Project name must be 30 characters or less")
    .regex(/^[a-z0-9-]+$/, "Only lowercase letters, numbers, and hyphens allowed"),
  description: z.string().max(100, "Description must be 100 characters or less").optional(),
});

export const deploymentSchema = z.object({
  name: z
    .string()
    .min(3, "Deployment name must be at least 3 characters")
    .max(30, "Deployment name must be 30 characters or less")
    .regex(/^[a-z0-9-]+$/, "Only lowercase letters, numbers, and hyphens allowed"),
  imageName: publicImageSchema,
  replicas: z.coerce
    .number()
    .int()
    .min(1, "Must have at least 1 replica")
    .max(10, "Scaling is capped at 10 replicas in development"),
  port: z.coerce.number().int().min(1).max(65535).default(80),
});
