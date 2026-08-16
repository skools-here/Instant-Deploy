import * as k8s from "@kubernetes/client-node";

// Setup Kubernetes configuration
const kc = new k8s.KubeConfig();
let k8sAppsApi: k8s.AppsV1Api | null = null;
let k8sCoreApi: k8s.CoreV1Api | null = null;
let isMockMode = false;

try {
  kc.loadFromDefault();
  k8sAppsApi = kc.makeApiClient(k8s.AppsV1Api);
  k8sCoreApi = kc.makeApiClient(k8s.CoreV1Api);
  console.log("Kubernetes client successfully initialized from default kubeconfig.");
} catch (error) {
  console.warn("Failed to load Kubernetes configuration. Falling back to MOCK mode.");
  isMockMode = true;
}

const namespace = "default";

// Global storage for mock deployments in development to survive Next.js API hot-reloading
const globalForK8sMock = global as unknown as {
  mockDeployments: Record<
    string,
    {
      name: string;
      image: string;
      replicas: number;
      createdAt: string;
      scaleHistory: { timestamp: string; replicas: number }[];
    }
  >;
};

if (!globalForK8sMock.mockDeployments) {
  globalForK8sMock.mockDeployments = {};
}

const mockStore = globalForK8sMock.mockDeployments;

export interface PodStatus {
  name: string;
  status: string; // "Running", "Pending", "Failed"
  restartCount: number;
  age: string;
}

export interface DeploymentStatus {
  replicas: number;
  availableReplicas: number;
  readyReplicas: number;
  status: "PENDING" | "RUNNING" | "FAILED";
  pods: PodStatus[];
}

/**
 * Creates a Kubernetes Deployment and ClusterIP Service.
 */
export async function createDeployment(
  name: string,
  image: string,
  replicas: number
): Promise<{ serviceName: string }> {
  const sanitizedName = name.toLowerCase().replace(/[^a-z0-9-]/g, "-");

  if (isMockMode || !k8sAppsApi || !k8sCoreApi) {
    mockStore[sanitizedName] = {
      name: sanitizedName,
      image,
      replicas,
      createdAt: new Date().toISOString(),
      scaleHistory: [{ timestamp: new Date().toISOString(), replicas }],
    };
    return { serviceName: `${sanitizedName}-service` };
  }

  // 1. Define deployment manifest
  const deploymentBody: k8s.V1Deployment = {
    apiVersion: "apps/v1",
    kind: "Deployment",
    metadata: {
      name: sanitizedName,
      namespace,
      labels: { app: sanitizedName },
    },
    spec: {
      replicas,
      selector: { matchLabels: { app: sanitizedName } },
      template: {
        metadata: { labels: { app: sanitizedName } },
        spec: {
          containers: [
            {
              name: sanitizedName,
              image: image,
              ports: [{ containerPort: 80 }],
              env: [
                { name: "PORT", value: "80" },
                { name: "NODE_ENV", value: "production" }
              ],
            },
          ],
        },
      },
    },
  };

  // 2. Define service manifest
  const serviceBody: k8s.V1Service = {
    apiVersion: "v1",
    kind: "Service",
    metadata: {
      name: `${sanitizedName}-service`,
      namespace,
      labels: { app: sanitizedName },
    },
    spec: {
      type: "ClusterIP",
      selector: { app: sanitizedName },
      ports: [
        {
          port: 80,
          targetPort: 80 as any,
        },
      ],
    },
  };

  try {
    await k8sAppsApi.createNamespacedDeployment({ namespace, body: deploymentBody });
    await k8sCoreApi.createNamespacedService({ namespace, body: serviceBody });
    return { serviceName: `${sanitizedName}-service` };
  } catch (error: any) {
    console.error("Kubernetes Error in createDeployment:", error);
    throw new Error(
      error.response?.body?.message ||
        error.message ||
        "Failed to create Kubernetes resources"
    );
  }
}

/**
 * Deletes a Kubernetes Deployment and Service.
 */
export async function deleteDeployment(name: string): Promise<void> {
  const sanitizedName = name.toLowerCase();

  if (isMockMode || !k8sAppsApi || !k8sCoreApi) {
    delete mockStore[sanitizedName];
    return;
  }

  try {
    // Delete Deployment
    await k8sAppsApi.deleteNamespacedDeployment({ name: sanitizedName, namespace }).catch((err) => {
      if (err.response?.statusCode !== 404) throw err;
    });

    // Delete Service
    await k8sCoreApi.deleteNamespacedService({ name: `${sanitizedName}-service`, namespace }).catch((err) => {
      if (err.response?.statusCode !== 404) throw err;
    });
  } catch (error: any) {
    console.error("Kubernetes Error in deleteDeployment:", error);
    throw new Error(
      error.response?.body?.message ||
        error.message ||
        "Failed to delete Kubernetes resources"
    );
  }
}

/**
 * Scales a Kubernetes Deployment.
 */
export async function scaleDeployment(name: string, replicas: number): Promise<void> {
  const sanitizedName = name.toLowerCase();

  if (isMockMode || !k8sAppsApi) {
    if (mockStore[sanitizedName]) {
      mockStore[sanitizedName].replicas = replicas;
      mockStore[sanitizedName].scaleHistory.push({
        timestamp: new Date().toISOString(),
        replicas,
      });
    }
    return;
  }

  try {
    const deployment = await k8sAppsApi.readNamespacedDeployment({ name: sanitizedName, namespace });
    if (deployment.spec) {
      deployment.spec.replicas = replicas;
      await k8sAppsApi.replaceNamespacedDeployment({ name: sanitizedName, namespace, body: deployment });
    }
  } catch (error: any) {
    console.error("Kubernetes Error in scaleDeployment:", error);
    throw new Error(
      error.response?.body?.message ||
        error.message ||
        "Failed to scale Kubernetes deployment"
    );
  }
}

/**
 * Gets deployment status, pod phases, and restart statistics.
 */
export async function getDeploymentStatus(name: string): Promise<DeploymentStatus> {
  const sanitizedName = name.toLowerCase();

  if (isMockMode || !k8sAppsApi || !k8sCoreApi) {
    const mock = mockStore[sanitizedName];
    if (!mock) {
      return {
        replicas: 0,
        availableReplicas: 0,
        readyReplicas: 0,
        status: "FAILED",
        pods: [],
      };
    }

    // Simulate pod load phases based on creation time
    const ageSeconds = (Date.now() - new Date(mock.createdAt).getTime()) / 1000;
    const isReady = ageSeconds > 10; // Takes 10s to transition from Pending to Running in mock

    const pods: PodStatus[] = Array.from({ length: mock.replicas }).map((_, i) => ({
      name: `${mock.name}-pod-${i + 1}-${Math.random().toString(36).substring(2, 7)}`,
      status: isReady ? "Running" : "Pending",
      restartCount: 0,
      age: mock.createdAt,
    }));

    return {
      replicas: mock.replicas,
      availableReplicas: isReady ? mock.replicas : 0,
      readyReplicas: isReady ? mock.replicas : 0,
      status: isReady ? "RUNNING" : "PENDING",
      pods,
    };
  }

  try {
    // 1. Get deployment resource details
    const deploy = await k8sAppsApi.readNamespacedDeployment({ name: sanitizedName, namespace });

    const replicas = deploy.spec?.replicas ?? 0;
    const availableReplicas = deploy.status?.availableReplicas ?? 0;
    const readyReplicas = deploy.status?.readyReplicas ?? 0;

    let status: "PENDING" | "RUNNING" | "FAILED" = "PENDING";
    if (availableReplicas > 0) {
      status = availableReplicas === replicas ? "RUNNING" : "PENDING";
    }

    // 2. Fetch associated pods
    const podsResponse = await k8sCoreApi.listNamespacedPod({
      namespace,
      labelSelector: `app=${sanitizedName}`,
    });

    const pods: PodStatus[] = (podsResponse.items || []).map((pod) => {
      const restartCount =
        pod.status?.containerStatuses?.reduce(
          (acc, cur) => acc + (cur.restartCount ?? 0),
          0
        ) ?? 0;

      return {
        name: pod.metadata?.name || "unknown",
        status: pod.status?.phase || "Unknown",
        restartCount,
        age: pod.metadata?.creationTimestamp
          ? new Date(pod.metadata.creationTimestamp).toISOString()
          : new Date().toISOString(),
      };
    });

    return {
      replicas,
      availableReplicas,
      readyReplicas,
      status,
      pods,
    };
  } catch (error: any) {
    console.error("Kubernetes Error in getDeploymentStatus:", error);
    // Graceful fallback to MOCK if config is lost or error occurs
    return {
      replicas: 0,
      availableReplicas: 0,
      readyReplicas: 0,
      status: "FAILED",
      pods: [],
    };
  }
}

/**
 * Retrieves logs from the first pod matching the deployment name.
 */
export async function getPodLogs(name: string): Promise<string> {
  const sanitizedName = name.toLowerCase();

  if (isMockMode || !k8sCoreApi) {
    const mock = mockStore[sanitizedName];
    if (!mock) return "No deployment logs found.";

    const now = new Date().toISOString();
    if (mock.image.includes("nginx")) {
      return `[${now}] Starting nginx version 1.25.1
[${now}] [notice] 1#1: using the "epoll" event method
[${now}] [notice] 1#1: nginx/1.25.1
[${now}] [notice] 1#1: built by gcc 12.2.0 (Debian 12.2.0-14) 
[${now}] [notice] 1#1: OS: Linux 5.15.49-linuxkit
[${now}] [notice] 1#1: getrlimit(RLIMIT_NOFILE): 1048576:1048576
[${now}] [notice] 1#1: start worker processes
[${now}] [notice] 1#1: start worker process 29
[${now}] [notice] 1#1: start worker process 30
[${now}] [info] 127.0.0.1 - - "GET / HTTP/1.1" 200 615 "-" "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0" "-"
[${now}] [info] 127.0.0.1 - - "GET /favicon.ico HTTP/1.1" 404 153 "http://localhost/" "Mozilla/5.0" "-"`;
    }

    if (mock.image.includes("redis")) {
      return `[${now}] 1:C 02 Jun 2026 14:00:00.000 # oO0OoO0OoO0Oo Redis is starting oO0OoO0OoO0Oo
[${now}] 1:C 02 Jun 2026 14:00:00.000 # Redis version=7.2.0, bits=64, commit=00000000, modified=0, pid=1, just started
[${now}] 1:C 02 Jun 2026 14:00:00.000 # Warning: no config file specified, using the default config. In order to specify a config file use redis-server /path/to/redis.conf
[${now}] 1:M 02 Jun 2026 14:00:00.001 * Running mode=standalone, port=6379.
[${now}] 1:M 02 Jun 2026 14:00:00.001 # Server initialized
[${now}] 1:M 02 Jun 2026 14:00:00.001 * Ready to accept connections tcp`;
    }

    return `[${now}] Starting application in production mode...
[${now}] Initializing environment variables configuration
[${now}] Connection successful to postgresql://postgres:***@localhost:5432/instantdeploy
[${now}] Server listening on port 80 (PID: 1)
[${now}] [api-request] GET /api/health - 200 OK (0.84ms)
[${now}] [worker-process] Synced kubernetes configurations successfully`;
  }

  try {
    const podsResponse = await k8sCoreApi.listNamespacedPod({
      namespace,
      labelSelector: `app=${sanitizedName}`,
    });

    const pods = podsResponse.items || [];
    if (pods.length === 0) {
      return "Pending: Waiting for active pods to initialize...";
    }

    const podName = pods[0].metadata?.name;
    if (!podName) {
      return "Pod name is undefined";
    }

    const logsResponse = await k8sCoreApi.readNamespacedPodLog({ name: podName, namespace });
    return logsResponse;
  } catch (error: any) {
    console.error("Kubernetes Error in getPodLogs:", error);
    return `Error fetching pods logs: ${error.message || error}`;
  }
}
