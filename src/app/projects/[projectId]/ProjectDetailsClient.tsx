"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Navbar from "@/components/Navbar";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ChevronLeft,
  Cpu,
  Plus,
  Loader2,
  Terminal,
  Activity,
  ServerCrash,
} from "lucide-react";
import Link from "next/link";

interface Project {
  id: string;
  name: string;
  description?: string | null;
  createdAt: string | Date;
}

interface Deployment {
  id: string;
  name: string;
  imageName: string;
  replicas: number;
  status: string;
  serviceName?: string | null;
  createdAt: string | Date;
}

interface ProjectDetailsClientProps {
  project: Project;
}

export default function ProjectDetailsClient({ project }: ProjectDetailsClientProps) {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [imageName, setImageName] = useState("");
  const [replicas, setReplicas] = useState(1);
  const [formError, setFormError] = useState("");

  // Image Presets for premium DX
  const imagePresets = [
    "nginx:latest",
    "redis:latest",
    "docker.io/library/alpine:latest",
    "ghcr.io/user/app:latest",
  ];

  // Fetch deployments inside project
  const { data: deployments, isLoading } = useQuery<Deployment[]>({
    queryKey: ["deployments", project.id],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${project.id}/deployments`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to fetch deployments");
      }
      return res.json();
    },
    refetchInterval: 5000, // Poll every 5 seconds in project details view
  });

  // Create Deployment mutation
  const createDeploymentMutation = useMutation({
    mutationFn: async (newDeployment: {
      name: string;
      imageName: string;
      replicas: number;
    }) => {
      const res = await fetch(`/api/projects/${project.id}/deployments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newDeployment),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create deployment");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deployments", project.id] });
      toast.success("Deployment initiated successfully!");
      setIsDialogOpen(false);
      setName("");
      setImageName("");
      setReplicas(1);
      setFormError("");
    },
    onError: (error: any) => {
      setFormError(error.message);
      toast.error(error.message || "Failed to deploy image");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!name.trim()) {
      setFormError("Deployment name is required");
      return;
    }

    if (name.length < 3) {
      setFormError("Deployment name must be at least 3 characters");
      return;
    }

    if (!/^[a-z0-9-]+$/.test(name)) {
      setFormError("Deployment name must contain only lowercase letters, numbers, and dashes");
      return;
    }

    if (!imageName.trim()) {
      setFormError("Image name is required");
      return;
    }

    // Validate image preset schema matches: nginx:latest, redis:latest, or registries
    const isImageValid =
      imageName === "nginx:latest" ||
      imageName === "redis:latest" ||
      imageName === "docker.io/library/alpine:latest" ||
      ((imageName.startsWith("docker.io/") || imageName.startsWith("ghcr.io/")) &&
        imageName.split("/").length === 3 &&
        imageName.split("/")[2].split(":").length === 2 &&
        imageName.split("/")[2].split(":")[1] === "latest");

    if (!isImageValid) {
      setFormError(
        "Unsupported image. Allowed: nginx:latest, redis:latest, docker.io/library/alpine:latest, or registry format (e.g. ghcr.io/user/app:latest)"
      );
      return;
    }

    if (replicas < 1 || replicas > 10) {
      setFormError("Replicas count must be between 1 and 10");
      return;
    }

    createDeploymentMutation.mutate({ name, imageName, replicas });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "RUNNING":
        return <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Running</Badge>;
      case "PENDING":
        return <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse">Pending</Badge>;
      case "FAILED":
        return <Badge className="bg-rose-500/10 text-rose-400 border-rose-500/20">Failed</Badge>;
      default:
        return <Badge className="bg-zinc-500/10 text-zinc-400 border-zinc-500/20">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col">
      <Navbar />

      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Back Link and Header */}
        <div className="space-y-4">
          <Link
            href="/projects"
            className="inline-flex items-center text-xs font-mono text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Projects
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                {project.name}
              </h1>
              <p className="text-zinc-400 text-sm mt-1">
                {project.description || "Workspace for your deployments."}
              </p>
            </div>

            {/* Deploy Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger render={<Button className="bg-violet-600 hover:bg-violet-700 text-white flex items-center space-x-1.5" />}>
                <Plus className="h-4 w-4" />
                <span>Deploy Container</span>
              </DialogTrigger>
              <DialogContent className="bg-zinc-950 border-zinc-900 text-zinc-100 sm:max-w-[450px]">
                <DialogHeader>
                  <DialogTitle className="text-white">New Deployment</DialogTitle>
                  <DialogDescription className="text-zinc-500 text-xs">
                    Deploy a public container image to your Kubernetes cluster.
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-3">
                  {/* Name */}
                  <div className="space-y-1.5">
                    <Label htmlFor="deploy-name" className="text-zinc-300 text-xs">Deployment Name</Label>
                    <Input
                      id="deploy-name"
                      value={name}
                      onChange={(e) => setName(e.target.value.toLowerCase())}
                      placeholder="frontend-web"
                      className="bg-zinc-900 border-zinc-800 text-white focus-visible:ring-violet-500 h-9 text-sm"
                    />
                  </div>

                  {/* Image input and presets */}
                  <div className="space-y-2">
                    <Label htmlFor="image-name" className="text-zinc-300 text-xs">Docker Image URL</Label>
                    <Input
                      id="image-name"
                      value={imageName}
                      onChange={(e) => setImageName(e.target.value)}
                      placeholder="nginx:latest or docker.io/user/app:latest"
                      className="bg-zinc-900 border-zinc-800 text-white focus-visible:ring-violet-500 h-9 text-sm"
                    />
                    
                    {/* Presets Chips */}
                    <div className="space-y-1">
                      <span className="text-[10px] text-zinc-500 font-mono">Quick templates:</span>
                      <div className="flex flex-wrap gap-1">
                        {imagePresets.map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setImageName(preset)}
                            className={`text-[9px] font-mono px-2 py-0.5 rounded border transition-colors ${
                              imageName === preset
                                ? "bg-violet-950 border-violet-500 text-violet-400"
                                : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700"
                            }`}
                          >
                            {preset.replace("docker.io/library/", "")}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Replicas count slider or number */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="replicas" className="text-zinc-300 text-xs">Replicas</Label>
                      <span className="text-xs text-violet-400 font-mono font-medium">{replicas} pods</span>
                    </div>
                    <Input
                      id="replicas"
                      type="number"
                      min={1}
                      max={10}
                      value={replicas}
                      onChange={(e) => setReplicas(Number(e.target.value))}
                      className="bg-zinc-900 border-zinc-800 text-white focus-visible:ring-violet-500 h-9 text-sm"
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
                      className="text-zinc-400 hover:text-white hover:bg-zinc-900 h-9"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createDeploymentMutation.isPending}
                      className="bg-violet-600 hover:bg-violet-700 text-white h-9"
                    >
                      {createDeploymentMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Deploying...
                        </>
                      ) : (
                        "Launch"
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Deployments Listing */}
        <Card className="bg-zinc-950 border-zinc-900">
          <CardHeader>
            <CardTitle className="text-lg text-white">Active Deployments</CardTitle>
          </CardHeader>
          <CardContent className="px-0 sm:px-6">
            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 text-violet-500 animate-spin" />
              </div>
            ) : !deployments || deployments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                <Cpu className="h-8 w-8 text-zinc-700" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-zinc-300">No active workloads</p>
                  <p className="text-xs text-zinc-500 max-w-xs">
                    Deploy a public image like Nginx or Redis to trigger container startup.
                  </p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="border-zinc-900">
                    <TableRow className="border-zinc-900 hover:bg-transparent">
                      <TableHead className="text-zinc-500 font-mono text-xs uppercase">Deployment</TableHead>
                      <TableHead className="text-zinc-500 font-mono text-xs uppercase">Docker Image</TableHead>
                      <TableHead className="text-zinc-500 font-mono text-xs uppercase text-center">Replicas</TableHead>
                      <TableHead className="text-zinc-500 font-mono text-xs uppercase">Status</TableHead>
                      <TableHead className="text-zinc-500 font-mono text-xs uppercase">Service Endpoint</TableHead>
                      <TableHead className="text-zinc-500 font-mono text-xs uppercase text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deployments.map((deployment) => (
                      <TableRow key={deployment.id} className="border-zinc-900 hover:bg-zinc-900/30">
                        <TableCell className="font-semibold text-white flex items-center space-x-2">
                          <Activity className="h-3.5 w-3.5 text-violet-500/70" />
                          <span>{deployment.name}</span>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-zinc-400">
                          {deployment.imageName}
                        </TableCell>
                        <TableCell className="text-center font-mono text-white">
                          {deployment.replicas}
                        </TableCell>
                        <TableCell>{getStatusBadge(deployment.status)}</TableCell>
                        <TableCell className="font-mono text-xs text-zinc-500">
                          {deployment.serviceName ? (
                            <span className="text-indigo-400 bg-indigo-950/20 px-2 py-0.5 rounded border border-indigo-950">
                              {deployment.serviceName}.default.svc.cluster.local
                            </span>
                          ) : (
                            <span className="text-zinc-600">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Link
                            href={`/projects/${project.id}/deployments/${deployment.id}`}
                            className={buttonVariants({
                              variant: "outline",
                              size: "sm",
                              className: "border-zinc-800 hover:bg-zinc-900 text-zinc-300",
                            })}
                          >
                            Manage
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
