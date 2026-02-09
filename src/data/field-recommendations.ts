export interface KindRecommendations {
    recommended: Record<string, string>
    common: string[]
}

/**
 * Top-level field recommendations per kind.
 * Keys are lowercase kind names.
 */
export const FIELD_RECOMMENDATIONS: Record<string, KindRecommendations> = {
    deployment: {
        recommended: {
            metadata: 'Labels and namespace identify and organize your deployment. Namespace isolation prevents cross-team conflicts.',
            spec: 'The spec defines replicas, update strategy, and the pod template — the core of what your deployment runs.',
        },
        common: ['apiVersion', 'kind'],
    },
    service: {
        recommended: {
            metadata: 'Service names become DNS entries in the cluster. Labels and namespace determine discoverability.',
            spec: 'Defines the selector, ports, and service type. The selector must match pod labels to route traffic correctly.',
        },
        common: ['apiVersion', 'kind'],
    },
    pod: {
        recommended: {
            metadata: 'Pod metadata provides identity and labeling. Labels enable service discovery and scheduling constraints.',
            spec: 'Defines containers, volumes, and scheduling. This is the fundamental unit of execution in Kubernetes.',
        },
        common: ['apiVersion', 'kind'],
    },
    statefulset: {
        recommended: {
            metadata: 'StatefulSet names determine stable pod identities (name-0, name-1, etc.). Namespace prevents collisions.',
            spec: 'Defines replicas, volume claim templates, and update strategy. Pods get stable storage and ordered deployment.',
        },
        common: ['apiVersion', 'kind'],
    },
    daemonset: {
        recommended: {
            metadata: 'DaemonSet metadata controls which nodes run the pod. Labels enable monitoring and log collection targeting.',
            spec: 'Defines the pod template and update strategy. Runs one pod per matching node automatically.',
        },
        common: ['apiVersion', 'kind'],
    },
    configmap: {
        recommended: {
            metadata: 'ConfigMap names are referenced by pods. Namespace scoping prevents accidental cross-environment data sharing.',
        },
        common: ['apiVersion', 'kind', 'data'],
    },
    secret: {
        recommended: {
            metadata: 'Secret names are referenced by pods and service accounts. Namespace isolation is critical for security.',
        },
        common: ['apiVersion', 'kind', 'data', 'type'],
    },
    ingress: {
        recommended: {
            metadata: 'Ingress annotations configure the controller (TLS, rate limiting, rewrites). Different controllers use different annotations.',
            spec: 'Defines routing rules, TLS configuration, and the default backend. Maps external traffic to internal services.',
        },
        common: ['apiVersion', 'kind'],
    },
    cronjob: {
        recommended: {
            metadata: 'CronJob names appear in spawned Job names. Clear naming helps track scheduled workload execution.',
            spec: 'Defines the schedule, concurrency policy, and job template. Controls when and how jobs are created.',
        },
        common: ['apiVersion', 'kind'],
    },
    job: {
        recommended: {
            metadata: 'Job names identify batch workloads. Labels help track completion and debug failures.',
            spec: 'Defines parallelism, completions, and the pod template. Controls how the batch workload executes.',
        },
        common: ['apiVersion', 'kind'],
    },
    persistentvolumeclaim: {
        recommended: {
            metadata: 'PVC names are referenced by pods for volume mounts. Namespace determines which pods can access the storage.',
            spec: 'Defines storage class, access modes, and size. Determines what kind of storage is provisioned.',
        },
        common: ['apiVersion', 'kind'],
    },
    horizontalpodautoscaler: {
        recommended: {
            metadata: 'HPA names identify the autoscaling policy. Labels help organize autoscaling across deployments.',
            spec: 'Defines min/max replicas, target CPU/memory, and the scale target. Controls automatic pod scaling.',
        },
        common: ['apiVersion', 'kind'],
    },
    namespace: {
        recommended: {
            metadata: 'Namespace names define isolation boundaries. Labels enable policy enforcement and resource quota targeting.',
        },
        common: ['apiVersion', 'kind'],
    },
    serviceaccount: {
        recommended: {
            metadata: 'ServiceAccount names are referenced by pods. Namespace determines which pods can use this identity.',
        },
        common: ['apiVersion', 'kind'],
    },
    role: {
        recommended: {
            metadata: 'Role names are referenced by RoleBindings. Namespace limits the scope of permissions granted.',
        },
        common: ['apiVersion', 'kind', 'rules'],
    },
    rolebinding: {
        recommended: {
            metadata: 'RoleBinding names identify the permission grant. Namespace limits where the binding applies.',
        },
        common: ['apiVersion', 'kind', 'roleRef', 'subjects'],
    },
    clusterrole: {
        recommended: {
            metadata: 'ClusterRole names are referenced by ClusterRoleBindings. These permissions apply cluster-wide.',
        },
        common: ['apiVersion', 'kind', 'rules'],
    },
    clusterrolebinding: {
        recommended: {
            metadata: 'ClusterRoleBinding names identify cluster-wide permission grants. Be cautious — these affect all namespaces.',
        },
        common: ['apiVersion', 'kind', 'roleRef', 'subjects'],
    },
    networkpolicy: {
        recommended: {
            metadata: 'NetworkPolicy names identify traffic rules. Labels and namespace determine which pods are affected.',
            spec: 'Defines ingress/egress rules and pod selectors. Controls network traffic between pods and external endpoints.',
        },
        common: ['apiVersion', 'kind'],
    },
}

/**
 * Nested field recommendations keyed by "kind.parentPath".
 * Used when classifying fields inside ObjectRefNodes.
 * A special "*" kind prefix applies to all kinds (shared metadata fields, etc.).
 */
export const NESTED_FIELD_RECOMMENDATIONS: Record<string, KindRecommendations> = {
    // ── Shared metadata fields (apply to all kinds) ──
    '*.metadata': {
        recommended: {
            namespace: 'Without a namespace, resources land in "default". Explicit namespaces prevent accidental cross-environment deployments.',
            labels: 'Labels are the primary mechanism for selecting and grouping resources. Services, HPAs, and network policies all rely on label selectors.',
        },
        common: ['name', 'annotations'],
    },

    // ── Deployment ──
    'deployment.spec': {
        recommended: {
            replicas: 'Controls how many pod instances run. Set this to match your availability requirements.',
            selector: 'The selector determines which pods belong to this deployment. Must match the template labels exactly.',
            template: 'The pod template defines what each replica runs — containers, volumes, and scheduling rules.',
            strategy: 'The update strategy (RollingUpdate or Recreate) controls how new versions are rolled out with minimal downtime.',
        },
        common: ['minReadySeconds', 'revisionHistoryLimit', 'progressDeadlineSeconds'],
    },
    'deployment.spec.template': {
        recommended: {
            metadata: 'Template metadata must include labels that match the selector. These labels are how the deployment finds its pods.',
            spec: 'The pod spec defines containers, volumes, security context, and scheduling. This is the core of your workload.',
        },
        common: [],
    },
    'deployment.spec.template.spec': {
        recommended: {
            containers: 'The containers array defines what runs in each pod. At least one container is required.',
            serviceAccountName: 'Assigns a specific identity to pods. Without this, pods use the "default" service account which may have too many or too few permissions.',
        },
        common: ['volumes', 'imagePullSecrets', 'nodeSelector', 'tolerations', 'affinity', 'restartPolicy'],
    },

    // ── Service ──
    'service.spec': {
        recommended: {
            selector: 'The selector determines which pods receive traffic. Must match pod labels exactly or no endpoints will be created.',
            ports: 'Defines which ports are exposed and how they map to container ports. At least one port is required.',
            type: 'The service type (ClusterIP, NodePort, LoadBalancer) controls how the service is exposed. ClusterIP is the default for internal traffic.',
        },
        common: ['clusterIP', 'sessionAffinity', 'externalTrafficPolicy'],
    },

    // ── StatefulSet ──
    'statefulset.spec': {
        recommended: {
            replicas: 'Controls the number of stateful pod replicas. Each gets a stable hostname and persistent storage.',
            selector: 'Must match template labels. Changing this after creation requires deleting and recreating the StatefulSet.',
            template: 'Defines the pod template. Each pod gets a stable identity (name-0, name-1, etc.).',
            serviceName: 'The headless service that provides DNS entries for each pod. Required for stable network identities.',
            volumeClaimTemplates: 'Defines persistent volume claims for each pod. Each replica gets its own dedicated storage.',
        },
        common: ['updateStrategy', 'podManagementPolicy', 'minReadySeconds', 'revisionHistoryLimit'],
    },
    'statefulset.spec.template': {
        recommended: {
            metadata: 'Template labels must match the selector. These labels provide stable identity for each pod.',
            spec: 'The pod spec defines containers, volumes, and scheduling for each stateful replica.',
        },
        common: [],
    },
    'statefulset.spec.template.spec': {
        recommended: {
            containers: 'At least one container is required. Stateful workloads typically need careful resource and volume configuration.',
            serviceAccountName: 'Assigns identity for RBAC. Stateful workloads often need specific permissions for storage operations.',
        },
        common: ['volumes', 'imagePullSecrets', 'nodeSelector', 'tolerations', 'affinity', 'restartPolicy'],
    },

    // ── DaemonSet ──
    'daemonset.spec': {
        recommended: {
            selector: 'Determines which pods belong to this DaemonSet. Must match template labels.',
            template: 'The pod template runs on every matching node. DaemonSets are ideal for logging, monitoring, and networking agents.',
        },
        common: ['updateStrategy', 'minReadySeconds', 'revisionHistoryLimit'],
    },
    'daemonset.spec.template': {
        recommended: {
            metadata: 'Template labels must match the selector.',
            spec: 'Defines the pod spec for each node. DaemonSet pods often need host networking or privileged access.',
        },
        common: [],
    },
    'daemonset.spec.template.spec': {
        recommended: {
            containers: 'The containers that run on every node. DaemonSet containers typically collect logs, metrics, or manage networking.',
            serviceAccountName: 'DaemonSet pods often need elevated permissions for host-level operations.',
        },
        common: ['volumes', 'hostNetwork', 'nodeSelector', 'tolerations', 'affinity', 'restartPolicy'],
    },

    // ── CronJob ──
    'cronjob.spec': {
        recommended: {
            schedule: 'Cron expression defining when jobs run. Format: "minute hour day month weekday" (e.g., "0 2 * * *" for daily at 2 AM).',
            jobTemplate: 'The job template defines what runs on each scheduled execution.',
            concurrencyPolicy: 'Controls overlap behavior (Allow, Forbid, Replace). Prevents resource waste from overlapping jobs.',
        },
        common: ['startingDeadlineSeconds', 'successfulJobsHistoryLimit', 'failedJobsHistoryLimit', 'suspend'],
    },

    // ── Job ──
    'job.spec': {
        recommended: {
            template: 'The pod template defines what the job runs. Jobs create pods that run to completion.',
        },
        common: ['completions', 'parallelism', 'backoffLimit', 'activeDeadlineSeconds', 'ttlSecondsAfterFinished'],
    },

    // ── Ingress ──
    'ingress.spec': {
        recommended: {
            rules: 'Defines host and path-based routing rules. Maps external URLs to internal services.',
            tls: 'TLS configuration for HTTPS. References a Secret containing the certificate and key.',
        },
        common: ['ingressClassName', 'defaultBackend'],
    },

    // ── PersistentVolumeClaim ──
    'persistentvolumeclaim.spec': {
        recommended: {
            accessModes: 'Defines how the volume can be accessed (ReadWriteOnce, ReadOnlyMany, ReadWriteMany). Must match workload requirements.',
            resources: 'Specifies the storage size request. The cluster provisions at least this much storage.',
        },
        common: ['storageClassName', 'volumeMode', 'volumeName'],
    },

    // ── HorizontalPodAutoscaler ──
    'horizontalpodautoscaler.spec': {
        recommended: {
            scaleTargetRef: 'References the Deployment or StatefulSet to scale. Must match the target resource exactly.',
            minReplicas: 'Minimum number of replicas to maintain. Prevents scaling to zero during low traffic.',
            maxReplicas: 'Maximum number of replicas. Prevents runaway scaling and unexpected costs.',
            metrics: 'Defines the scaling triggers (CPU, memory, custom metrics). Controls when pods are added or removed.',
        },
        common: ['behavior'],
    },

    // ── NetworkPolicy ──
    'networkpolicy.spec': {
        recommended: {
            podSelector: 'Selects which pods this policy applies to. An empty selector applies to all pods in the namespace.',
            policyTypes: 'Specifies whether the policy applies to Ingress, Egress, or both.',
        },
        common: ['ingress', 'egress'],
    },

    // ── Role / ClusterRole ──
    '*.rules': {
        recommended: {},
        common: ['apiGroups', 'resources', 'verbs', 'resourceNames'],
    },

    // ── RoleBinding / ClusterRoleBinding ──
    '*.roleRef': {
        recommended: {
            apiGroup: 'The API group of the role being referenced (usually "rbac.authorization.k8s.io").',
            kind: 'Whether this references a Role or ClusterRole.',
            name: 'The name of the Role or ClusterRole to bind.',
        },
        common: [],
    },
}
