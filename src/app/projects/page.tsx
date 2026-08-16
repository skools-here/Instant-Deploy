"use client";

import React, { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Navbar from "@/components/Navbar";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Folder, Plus, Loader2, ArrowRight, Layers, Calendar } from "lucide-react";
import Link from "next/link";

interface ProjectCount {
  deployments: number;
}

interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  _count: ProjectCount;
}

export default function ProjectsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Form State
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [formError, setFormError] = useState("");

  // Redirect if not logged in
  React.useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  // Fetch projects list
  const { data: projects, isLoading } = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: async () => {
      const res = await fetch("/api/projects");
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to fetch projects");
      }
      return res.json();
    },
    enabled: status === "authenticated",
  });

  // Create Project mutation
  const createProjectMutation = useMutation({
    mutationFn: async (newProject: { name: string; description: string }) => {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newProject),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to create project");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Project created successfully!");
      setIsDialogOpen(false);
      setName("");
      setDescription("");
      setFormError("");
    },
    onError: (error: any) => {
      setFormError(error.message);
      toast.error(error.message || "Failed to create project");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!name.trim()) {
      setFormError("Project name is required");
      return;
    }

    if (name.length < 3) {
      setFormError("Project name must be at least 3 characters");
      return;
    }

    if (!/^[a-z0-9-]+$/.test(name)) {
      setFormError("Name must contain only lowercase letters, numbers, and dashes");
      return;
    }

    createProjectMutation.mutate({ name, description });
  };

  if (status === "loading" || (status === "authenticated" && isLoading)) {
    return (
      <div className="min-h-screen bg-black text-zinc-100 flex flex-col justify-between">
        <Navbar />
        <div className="flex-grow flex items-center justify-center">
          <Loader2 className="h-8 w-8 text-violet-500 animate-spin" />
        </div>
      </div>
    );
  }

  if (status !== "authenticated") {
    return null;
  }

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col">
      <Navbar />

      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">Projects</h1>
            <p className="text-zinc-400 text-sm">Create and organize environments for your service deployments.</p>
          </div>

          {/* Create Project Modal Trigger */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger render={<Button className="bg-violet-600 hover:bg-violet-700 text-white flex items-center space-x-1.5" />}>
              <Plus className="h-4 w-4" />
              <span>New Project</span>
            </DialogTrigger>
            <DialogContent className="bg-zinc-950 border-zinc-900 text-zinc-100">
              <DialogHeader>
                <DialogTitle className="text-white">Create Project</DialogTitle>
                <DialogDescription className="text-zinc-500">
                  Organize your containers inside a dedicated project environment.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-zinc-300">Project Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value.toLowerCase())}
                    placeholder="my-awesome-app"
                    className="bg-zinc-900 border-zinc-800 text-white focus-visible:ring-violet-500"
                  />
                  <p className="text-[10px] text-zinc-500 font-mono">
                    Lowercase alphanumeric characters and hyphens only.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-zinc-300">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Development environment for API services..."
                    className="bg-zinc-900 border-zinc-800 text-white focus-visible:ring-violet-500"
                    rows={3}
                  />
                </div>

                {formError && (
                  <p className="text-xs text-rose-400 font-medium">{formError}</p>
                )}

                <DialogFooter className="pt-4 border-t border-zinc-900">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsDialogOpen(false)}
                    className="text-zinc-400 hover:text-white hover:bg-zinc-900"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createProjectMutation.isPending}
                    className="bg-violet-600 hover:bg-violet-700 text-white"
                  >
                    {createProjectMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Project"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Projects Grid */}
        {projects && projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 border border-dashed border-zinc-900 rounded-xl bg-zinc-950/20">
            <Folder className="h-10 w-10 text-zinc-700" />
            <div className="space-y-1">
              <p className="text-base font-semibold text-zinc-300 font-sans">No projects found</p>
              <p className="text-xs text-zinc-500 max-w-xs mx-auto">
                Get started by creating a project workspace to host your container deployment pods.
              </p>
            </div>
            <Button
              onClick={() => setIsDialogOpen(true)}
              variant="outline"
              size="sm"
              className="border-zinc-800 hover:bg-zinc-900 text-zinc-300"
            >
              Create first Project
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {projects?.map((project) => (
              <Card
                key={project.id}
                className="bg-zinc-950 border-zinc-900 hover:border-zinc-800 transition-all flex flex-col justify-between group"
              >
                <CardHeader>
                  <div className="flex items-center space-x-2">
                    <Folder className="h-4 w-4 text-violet-500" />
                    <CardTitle className="text-lg font-bold text-white group-hover:text-violet-400 transition-colors">
                      {project.name}
                    </CardTitle>
                  </div>
                  <CardDescription className="text-zinc-400 text-sm line-clamp-2 mt-2">
                    {project.description || "No description provided."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="py-2">
                  <div className="flex items-center space-x-4 text-xs font-mono text-zinc-500">
                    <div className="flex items-center space-x-1">
                      <Layers className="h-3.5 w-3.5" />
                      <span>{project._count?.deployments || 0} Deployments</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{new Date(project.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="border-t border-zinc-900/60 mt-4 pt-4">
                  <Link
                    href={`/projects/${project.id}`}
                    className={buttonVariants({
                      variant: "ghost",
                      className: "w-full text-zinc-400 hover:text-white hover:bg-zinc-900 flex justify-between",
                    })}
                  >
                    <span>Manage Workspace</span>
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
