import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Navbar from "@/components/Navbar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  FolderOpen,
  Cpu,
  Layers,
  Activity,
  ArrowRight,
  Plus,
  Terminal,
} from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/");
  }

  // Fetch metrics from DB
  const projectsCount = await prisma.project.count({
    where: { userId: session.user.id },
  });

  const deployments = await prisma.deployment.findMany({
    where: {
      project: { userId: session.user.id },
    },
    include: {
      project: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const runningDeployments = deployments.filter((d) => d.status === "RUNNING");
  const totalReplicas = runningDeployments.reduce((sum, d) => sum + d.replicas, 0);

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
        
        {/* Header Title */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">Dashboard</h1>
            <p className="text-zinc-400 text-sm">Real-time status overview of your container workloads.</p>
          </div>
          <div className="flex space-x-3">
            <Link
              href="/projects"
              className={buttonVariants({
                variant: "default",
                className: "bg-violet-600 hover:bg-violet-700 text-white flex items-center space-x-1.5",
              })}
            >
              <Plus className="h-4 w-4" />
              <span>New Project</span>
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-zinc-950 border-zinc-900">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-mono font-medium text-zinc-400 uppercase">Total Projects</CardTitle>
              <FolderOpen className="h-4 w-4 text-violet-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{projectsCount}</div>
              <p className="text-[10px] text-zinc-500 mt-1">Organized workspaces</p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-950 border-zinc-900">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-mono font-medium text-zinc-400 uppercase">Active Deployments</CardTitle>
              <Cpu className="h-4 w-4 text-indigo-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{deployments.length}</div>
              <p className="text-[10px] text-zinc-500 mt-1">Created container sets</p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-950 border-zinc-900">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-mono font-medium text-zinc-400 uppercase">Running Pods</CardTitle>
              <Activity className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{runningDeployments.length}</div>
              <p className="text-[10px] text-zinc-500 mt-1">Healthy workloads</p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-950 border-zinc-900">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-mono font-medium text-zinc-400 uppercase">Allocated Replicas</CardTitle>
              <Layers className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{totalReplicas}</div>
              <p className="text-[10px] text-zinc-500 mt-1">Total scaled count</p>
            </CardContent>
          </Card>
        </div>

        {/* Deployments Section */}
        <Card className="bg-zinc-950 border-zinc-900">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg text-white">Recent Deployments</CardTitle>
              <CardDescription className="text-xs text-zinc-500">Overview of all active and pending deployments across projects.</CardDescription>
            </div>
            <Link href="/projects" className="text-xs font-mono text-violet-400 hover:text-violet-300 flex items-center space-x-1">
              <span>View Projects</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="px-0 sm:px-6">
            {deployments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                <Terminal className="h-8 w-8 text-zinc-700" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-zinc-300">No deployments found</p>
                  <p className="text-xs text-zinc-500 max-w-xs">Create a project first and initiate a Docker image deployment to see stats.</p>
                </div>
                <Link
                  href="/projects"
                  className={buttonVariants({
                    variant: "outline",
                    size: "sm",
                    className: "border-zinc-800 hover:bg-zinc-900 text-zinc-300",
                  })}
                >
                  Create Project
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="border-zinc-900">
                    <TableRow className="border-zinc-900 hover:bg-transparent">
                      <TableHead className="text-zinc-500 font-mono text-xs uppercase">Deployment</TableHead>
                      <TableHead className="text-zinc-500 font-mono text-xs uppercase">Project</TableHead>
                      <TableHead className="text-zinc-500 font-mono text-xs uppercase">Docker Image</TableHead>
                      <TableHead className="text-zinc-500 font-mono text-xs uppercase text-center">Replicas</TableHead>
                      <TableHead className="text-zinc-500 font-mono text-xs uppercase">Status</TableHead>
                      <TableHead className="text-zinc-500 font-mono text-xs uppercase">Created</TableHead>
                      <TableHead className="text-zinc-500 font-mono text-xs uppercase text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deployments.map((deployment) => (
                      <TableRow key={deployment.id} className="border-zinc-900 hover:bg-zinc-900/30">
                        <TableCell className="font-semibold text-white">{deployment.name}</TableCell>
                        <TableCell className="text-zinc-400 text-sm">
                          <Link href={`/projects/${deployment.projectId}`} className="hover:underline hover:text-violet-400">
                            {deployment.project.name}
                          </Link>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-zinc-400">{deployment.imageName}</TableCell>
                        <TableCell className="text-center font-mono text-white">{deployment.replicas}</TableCell>
                        <TableCell>{getStatusBadge(deployment.status)}</TableCell>
                        <TableCell className="text-zinc-500 text-xs">
                          {new Date(deployment.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Link
                            href={`/projects/${deployment.projectId}/deployments/${deployment.id}`}
                            className={buttonVariants({
                              variant: "ghost",
                              size: "sm",
                              className: "text-zinc-400 hover:text-white hover:bg-zinc-900",
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
