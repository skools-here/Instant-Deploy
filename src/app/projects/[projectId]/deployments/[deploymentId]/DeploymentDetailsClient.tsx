"use client";

import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
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
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ChevronLeft,
  Loader2,
  Terminal,
  Activity,
  Layers,
  Trash2,
  RefreshCw,
  Search,
  ArrowRight,
  ShieldCheck,
  Pause,
  Play,
  ArrowDownToLine,
} from "lucide-react";
import Link from "next/link";

interface Pod {
  name: string;
  status: string;
  restartCount: number;
  age: string;
}

interface LiveStatus {
  replicas: number;
  availableReplicas: number;
  readyReplicas: number;
  status: "PENDING" | "RUNNING" | "FAILED";
  pods: Pod[];
}

interface Deployment {
  id: string;
  name: string;
  imageName: string;
  replicas: number;
  status: string;
  serviceName?: string | null;
  port: number;
  createdAt: string | Date;
  projectId: string;
  project: {
    name: string;
  };
  liveStatus?: LiveStatus;
}

interface DeploymentDetailsClientProps {
  deployment: Deployment;
}

export default function DeploymentDetailsClient({
  deployment: initialDeployment,
}: DeploymentDetailsClientProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const logsEndRef = useRef<HTMLDivElement>(null);

  // States
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [logFilter, setLogFilter] = useState("");
  const [autoScroll, setAutoScroll] = useState(true);
  const [isLogsPaused, setIsLogsPaused] = useState(false);

  // Fetch deployment configuration and live pod statuses
  const { data: deployment, isLoading } = useQuery<Deployment>({
    queryKey: ["deployment", initialDeployment.id],
    queryFn: async () => {
      const res = await fetch(
        `/api/projects/${initialDeployment.projectId}/deployments/${initialDeployment.id}`
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to fetch deployment details");
      }
      return res.json();
    },
    initialData: initialDeployment,
    refetchInterval: 3000, // Poll every 3 seconds
  });

  // Fetch deployment pod logs
  const { data: logsData, isFetching: isFetchingLogs } = useQuery<{ logs: string }>({
    queryKey: ["deployment-logs", initialDeployment.id],
    queryFn: async () => {
      const res = await fetch(
        `/api/projects/${initialDeployment.projectId}/deployments/${initialDeployment.id}/logs`
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to fetch logs");
      }
      return res.json();
    },
    refetchInterval: isLogsPaused ? false : 3000, // Poll logs every 3 seconds unless paused
  });

  // Scale deployment mutation
  const scaleMutation = useMutation({
    mutationFn: async (newReplicas: number) => {
      const res = await fetch(
        `/api/projects/${initialDeployment.projectId}/deployments/${initialDeployment.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ replicas: newReplicas }),
        }
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to scale deployment");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["deployment", initialDeployment.id], (old: any) => ({
        ...old,
        replicas: data.replicas,
      }));
      queryClient.invalidateQueries({ queryKey: ["deployment", initialDeployment.id] });
      toast.success(`Scaled to ${data.replicas} replicas`);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to scale deployment");
    },
  });

  // Delete deployment mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(
        `/api/projects/${initialDeployment.projectId}/deployments/${initialDeployment.id}`,
        {
          method: "DELETE",
        }
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete deployment");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Deployment deleted successfully");
      router.push(`/projects/${initialDeployment.projectId}`);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete deployment");
    },
  });

  // Auto-scroll logs to bottom
  useEffect(() => {
    if (autoScroll && !isLogsPaused) {
      logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [logsData, autoScroll, isLogsPaused]);

  const handleScale = (direction: "up" | "down") => {
    if (!deployment) return;
    const currentReplicas = deployment.replicas;
    const target = direction === "up" ? currentReplicas + 1 : currentReplicas - 1;

    if (target < 1) {
      toast.error("Deployment requires at least 1 replica");
      return;
    }
    if (target > 10) {
      toast.error("Scaling capped at 10 replicas in development");
      return;
    }

    scaleMutation.mutate(target);
  };

  const getFilteredLogs = () => {
    const rawLogs = logsData?.logs || "Waiting for active pods to initialize logs...";
    if (!logFilter) return rawLogs;

    return rawLogs
      .split("\n")
      .filter((line) => line.toLowerCase().includes(logFilter.toLowerCase()))
      .join("\n");
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

      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href={`/projects/${initialDeployment.projectId}`}
            className="inline-flex items-center text-xs font-mono text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to {deployment?.project?.name || "Project"}
          </Link>
        </div>

        {/* Dashboard Title Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 pb-4 border-b border-zinc-900">
          <div className="space-y-1">
            <div className="flex items-center space-x-2.5">
              <h1 className="text-2xl font-bold text-white tracking-tight">{deployment?.name}</h1>
              {deployment && getStatusBadge(deployment.liveStatus?.status || deployment.status)}
            </div>
            <p className="text-zinc-500 text-xs font-mono">
              Image: <span className="text-zinc-300">{deployment?.imageName}</span>
            </p>
          </div>

          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => queryClient.invalidateQueries({ queryKey: ["deployment", initialDeployment.id] })}
              className="border-zinc-800 hover:bg-zinc-900 text-zinc-400 hover:text-white"
            >
              <RefreshCw className="h-4 w-4 mr-1.5" />
              <span>Refresh Status</span>
            </Button>
            
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setIsDeleteDialogOpen(true)}
              className="bg-rose-950/20 text-rose-400 hover:bg-rose-600 hover:text-white border border-rose-900/50"
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              <span>Delete Deployment</span>
            </Button>
          </div>
        </div>

        {/* Console layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Controls Column */}
          <div className="space-y-6 lg:col-span-1">
            {/* Instance Resource Card */}
            <Card className="bg-zinc-950 border-zinc-900 shadow-xl">
              <CardHeader>
                <CardTitle className="text-sm font-semibold text-white">Scaling & Resources</CardTitle>
                <CardDescription className="text-xs text-zinc-500">Configure active node replicas.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                
                {/* Replicas Scale Counter */}
                <div className="flex flex-col items-center justify-center p-4 bg-zinc-900/40 border border-zinc-900 rounded-xl space-y-4">
                  <div className="text-zinc-500 font-mono text-[10px] uppercase">Allocated Container Pods</div>
                  <div className="flex items-center space-x-6">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleScale("down")}
                      disabled={scaleMutation.isPending || (deployment?.replicas || 1) <= 1}
                      className="h-10 w-10 border-zinc-800 bg-zinc-900 text-white hover:bg-zinc-800 active:scale-95 transition-all text-lg font-bold"
                    >
                      -
                    </Button>
                    <span className="text-4xl font-extrabold text-white font-mono min-w-[40px] text-center">
                      {scaleMutation.isPending ? (
                        <Loader2 className="h-8 w-8 text-violet-500 animate-spin mx-auto" />
                      ) : (
                        deployment?.replicas
                      )}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleScale("up")}
                      disabled={scaleMutation.isPending || (deployment?.replicas || 1) >= 10}
                      className="h-10 w-10 border-zinc-800 bg-zinc-900 text-white hover:bg-zinc-800 active:scale-95 transition-all text-lg font-bold"
                    >
                      +
                    </Button>
                  </div>
                  <p className="text-[10px] text-zinc-500 font-sans text-center">
                    Updating scaling configurations automatically updates the replica spec in Kubernetes.
                  </p>
                </div>

                {/* Networking Detail Info */}
                <div className="space-y-3 font-mono text-xs">
                  <div className="flex justify-between border-b border-zinc-900 pb-2">
                    <span className="text-zinc-500">Internal DNS</span>
                    <span className="text-zinc-300 font-semibold truncate max-w-[200px]">
                      {deployment?.serviceName || "Pending"}.default.svc
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-zinc-900 pb-2">
                    <span className="text-zinc-500">Service Port</span>
                    <span className="text-zinc-300 font-semibold">{deployment?.port || 80} → 80</span>
                  </div>
                  <div className="flex justify-between border-b border-zinc-900 pb-2">
                    <span className="text-zinc-500">Created At</span>
                    <span className="text-zinc-300">
                      {deployment ? new Date(deployment.createdAt).toLocaleDateString() : ""}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pods List Details */}
            <Card className="bg-zinc-950 border-zinc-900 shadow-xl">
              <CardHeader>
                <CardTitle className="text-sm font-semibold text-white">Container Workloads</CardTitle>
                <CardDescription className="text-xs text-zinc-500">
                  Kubernetes Pod resources status summary ({deployment?.liveStatus?.pods?.length || 0} active).
                </CardDescription>
              </CardHeader>
              <CardContent className="px-0 sm:px-6">
                {!deployment?.liveStatus?.pods || deployment.liveStatus.pods.length === 0 ? (
                  <div className="text-center py-6 text-xs text-zinc-500">
                    No active pods running. Workload might be scaling or initializing.
                  </div>
                ) : (
                  <div className="space-y-3 px-4 sm:px-0">
                    {deployment.liveStatus.pods.map((pod) => (
                      <div
                        key={pod.name}
                        className="flex items-center justify-between p-2.5 rounded-lg border border-zinc-900 bg-zinc-900/20"
                      >
                        <div className="space-y-0.5 truncate max-w-[170px] sm:max-w-none">
                          <div className="text-xs font-semibold text-zinc-300 font-mono truncate">{pod.name}</div>
                          <div className="text-[10px] text-zinc-500 font-mono">
                            Restarts: <span className="text-zinc-400">{pod.restartCount}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span
                            className={`inline-block h-2 w-2 rounded-full ${
                              pod.status === "Running"
                                ? "bg-emerald-500 animate-pulse"
                                : pod.status === "Pending"
                                ? "bg-amber-500 animate-bounce"
                                : "bg-rose-500"
                            }`}
                          />
                          <span className="text-xs font-medium text-zinc-300">{pod.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Logs Terminal Column */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="bg-zinc-950 border-zinc-900 shadow-xl h-full flex flex-col">
              
              {/* Console Header Bar */}
              <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0 pb-3 border-b border-zinc-900 bg-zinc-950">
                <div>
                  <CardTitle className="text-sm font-semibold text-white flex items-center space-x-2">
                    <Terminal className="h-4 w-4 text-violet-500" />
                    <span>Real-time Pod Console Logs</span>
                  </CardTitle>
                </div>

                <div className="flex items-center space-x-2">
                  {/* Search input */}
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-500" />
                    <input
                      type="text"
                      placeholder="Filter logs..."
                      value={logFilter}
                      onChange={(e) => setLogFilter(e.target.value)}
                      className="pl-8 pr-3 py-1.5 h-8 w-[140px] sm:w-[180px] bg-zinc-900 border border-zinc-800 rounded-md text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-violet-500 font-mono"
                    />
                  </div>

                  {/* Pause Button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsLogsPaused(!isLogsPaused)}
                    className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-900"
                    title={isLogsPaused ? "Resume Logs Stream" : "Pause Logs Stream"}
                  >
                    {isLogsPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </CardHeader>

              {/* Console Body Terminal screen */}
              <CardContent className="p-0 flex-grow flex flex-col bg-black">
                <div className="p-4 flex-grow overflow-y-auto max-h-[420px] min-h-[300px] font-mono text-[11px] leading-relaxed text-zinc-300 whitespace-pre-wrap select-text scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                  {getFilteredLogs() ? (
                    getFilteredLogs()
                  ) : (
                    <span className="text-zinc-600 italic">No matching logs found...</span>
                  )}
                  <div ref={logsEndRef} />
                </div>
              </CardContent>

              {/* Console Footer controls */}
              <CardFooter className="py-2.5 border-t border-zinc-900 bg-zinc-950 flex items-center justify-between text-[10px] text-zinc-500 font-mono">
                <div className="flex items-center space-x-2">
                  <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span>
                    {isLogsPaused
                      ? "Streaming paused"
                      : isFetchingLogs
                      ? "Updating logs stream..."
                      : "Live Connection Established"}
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <label className="flex items-center space-x-1.5 cursor-pointer hover:text-zinc-300">
                    <input
                      type="checkbox"
                      checked={autoScroll}
                      onChange={(e) => setAutoScroll(e.target.checked)}
                      className="rounded border-zinc-800 bg-zinc-900 text-violet-500 focus:ring-violet-500 h-3 w-3"
                    />
                    <span>Auto-scroll</span>
                  </label>
                </div>
              </CardFooter>
            </Card>
          </div>
        </div>

        {/* Delete Workload Dialog Confirmation */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="bg-zinc-950 border-zinc-900 text-zinc-100 max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-white">Delete Workload?</DialogTitle>
              <DialogDescription className="text-zinc-400 text-xs mt-1">
                Are you sure you want to delete <span className="font-semibold text-white">{deployment?.name}</span>? This will permanently terminate Kubernetes pods, remove cluster services, and delete database deployment histories. This action is irreversible.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="pt-4 border-t border-zinc-900 flex space-x-2">
              <Button
                variant="ghost"
                onClick={() => setIsDeleteDialogOpen(false)}
                className="text-zinc-400 hover:text-white hover:bg-zinc-900"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                className="bg-rose-600 hover:bg-rose-700 text-white"
              >
                {deleteMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete Workload"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
