// data/k8sIcons.tsx
import {
    LayersIcon,
    DatabaseIcon,
    RepeatIcon,
    CopyIcon,
    BriefcaseIcon,
    ClockIcon,
    PackageIcon,
    LockIcon,
    TrendingUpIcon,
    SlidersIcon,
    InfoIcon,
    NetworkIcon,
    KeyIcon,
    BoxIcon
} from "lucide-react";

export const k8sIcons = {
    "Core Workloads": [
        { name: "deployment", icon: <BoxIcon /> },
        { name: "statefulset", icon: <BoxIcon /> },
        { name: "daemonset", icon: <BoxIcon /> },
        { name: "replicaset", icon: <BoxIcon /> },
        { name: "job", icon: <BoxIcon /> },
        { name: "cronjob", icon: <BoxIcon /> },
        { name: "pod", icon: <BoxIcon /> }
    ],
    "Networking & Access": [
        { name: "service", icon: <NetworkIcon /> },
        { name: "ingress", icon: <NetworkIcon /> },
        { name: "networkpolicy", icon: <NetworkIcon /> }
    ],
    "Configuration & Secrets": [
        { name: "configmap", icon: <LockIcon /> },
        { name: "secret", icon: <LockIcon /> },
        { name: "persistentvolumeclaim", icon: <LockIcon /> }
    ],
    "RBAC (Security & Access Control)": [
        { name: "role", icon: <KeyIcon /> },
        { name: "clusterrole", icon: <KeyIcon /> },
        { name: "rolebinding", icon: <KeyIcon /> },
        { name: "clusterrolebinding", icon: <KeyIcon /> },
        { name: "serviceaccount", icon: <KeyIcon /> }
    ],
    "Autoscaling": [
        { name: "horizontalpodautoscaler", icon: <TrendingUpIcon /> }
    ],
    "Others often seen": [
        { name: "namespace", icon: <SlidersIcon /> },
        { name: "resourcequota", icon: <SlidersIcon /> },
        { name: "limitrange", icon: <SlidersIcon /> }
    ]
};
