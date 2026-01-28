import { Node, Edge } from '@xyflow/react';

export interface Template {
    id: string;
    name: string;
    description: string;
    category: 'workloads' | 'networking' | 'storage' | 'configuration';
    nodes: Node[];
    edges: Edge[];
}

export interface TemplateCategory {
    id: string;
    name: string;
    templates: Template[];
}

/**
 * Pre-built templates for common Kubernetes patterns
 * Node IDs use TEMPLATE_* prefix to be replaced with unique IDs on apply
 */
export const templates: Template[] = [
    // Workloads
    {
        id: 'basic-deployment',
        name: 'Basic Deployment',
        description: 'A simple Deployment with one container',
        category: 'workloads',
        nodes: [
            {
                id: 'TEMPLATE_deployment',
                type: 'KindNode',
                position: { x: 0, y: 0 },
                data: {
                    type: 'deployment',
                    kind: 'Deployment',
                    apiVersion: 'apps/v1',
                    values: {
                        apiVersion: 'apps/v1',
                        kind: 'Deployment',
                        metadata: '#ref-TEMPLATE_deployment_metadata',
                        spec: '#ref-TEMPLATE_deployment_spec',
                    },
                },
            },
            {
                id: 'TEMPLATE_deployment_metadata',
                type: 'ObjectRefNode',
                position: { x: -350, y: 0 },
                data: {
                    kind: 'Deployment',
                    objectRef: 'metadata',
                    values: {
                        name: 'my-app',
                        labels: {
                            app: 'my-app',
                        },
                    },
                },
            },
            {
                id: 'TEMPLATE_deployment_spec',
                type: 'ObjectRefNode',
                position: { x: -350, y: 200 },
                data: {
                    kind: 'Deployment',
                    objectRef: 'spec',
                    values: {
                        replicas: 1,
                        selector: {
                            matchLabels: {
                                app: 'my-app',
                            },
                        },
                        template: {
                            metadata: {
                                labels: {
                                    app: 'my-app',
                                },
                            },
                            spec: {
                                containers: [
                                    {
                                        name: 'my-app',
                                        image: 'nginx:latest',
                                        ports: [
                                            {
                                                containerPort: 80,
                                            },
                                        ],
                                    },
                                ],
                            },
                        },
                    },
                },
            },
        ],
        edges: [
            {
                id: 'TEMPLATE_edge_1',
                source: 'TEMPLATE_deployment_metadata',
                target: 'TEMPLATE_deployment',
                sourceHandle: 'source-metadata',
                targetHandle: 'target-metadata-objectRef',
            },
            {
                id: 'TEMPLATE_edge_2',
                source: 'TEMPLATE_deployment_spec',
                target: 'TEMPLATE_deployment',
                sourceHandle: 'source-spec',
                targetHandle: 'target-spec-objectRef',
            },
        ],
    },
    {
        id: 'deployment-with-service',
        name: 'Deployment + Service',
        description: 'A Deployment with a ClusterIP Service to expose it',
        category: 'workloads',
        nodes: [
            {
                id: 'TEMPLATE_deployment',
                type: 'KindNode',
                position: { x: 0, y: 0 },
                data: {
                    type: 'deployment',
                    kind: 'Deployment',
                    apiVersion: 'apps/v1',
                    values: {
                        apiVersion: 'apps/v1',
                        kind: 'Deployment',
                        metadata: '#ref-TEMPLATE_deployment_metadata',
                        spec: '#ref-TEMPLATE_deployment_spec',
                    },
                },
            },
            {
                id: 'TEMPLATE_deployment_metadata',
                type: 'ObjectRefNode',
                position: { x: -350, y: 0 },
                data: {
                    kind: 'Deployment',
                    objectRef: 'metadata',
                    values: {
                        name: 'my-app',
                    },
                },
            },
            {
                id: 'TEMPLATE_deployment_spec',
                type: 'ObjectRefNode',
                position: { x: -350, y: 150 },
                data: {
                    kind: 'Deployment',
                    objectRef: 'spec',
                    values: {
                        replicas: 2,
                        selector: {
                            matchLabels: {
                                app: 'my-app',
                            },
                        },
                        template: {
                            metadata: {
                                labels: {
                                    app: 'my-app',
                                },
                            },
                            spec: {
                                containers: [
                                    {
                                        name: 'my-app',
                                        image: 'nginx:latest',
                                        ports: [
                                            {
                                                containerPort: 80,
                                            },
                                        ],
                                    },
                                ],
                            },
                        },
                    },
                },
            },
            {
                id: 'TEMPLATE_service',
                type: 'KindNode',
                position: { x: 0, y: 400 },
                data: {
                    type: 'service',
                    kind: 'Service',
                    apiVersion: 'v1',
                    values: {
                        apiVersion: 'v1',
                        kind: 'Service',
                        metadata: '#ref-TEMPLATE_service_metadata',
                        spec: '#ref-TEMPLATE_service_spec',
                    },
                },
            },
            {
                id: 'TEMPLATE_service_metadata',
                type: 'ObjectRefNode',
                position: { x: -350, y: 400 },
                data: {
                    kind: 'Service',
                    objectRef: 'metadata',
                    values: {
                        name: 'my-app-svc',
                    },
                },
            },
            {
                id: 'TEMPLATE_service_spec',
                type: 'ObjectRefNode',
                position: { x: -350, y: 550 },
                data: {
                    kind: 'Service',
                    objectRef: 'spec',
                    values: {
                        selector: {
                            app: 'my-app',
                        },
                        ports: [
                            {
                                port: 80,
                                targetPort: 80,
                            },
                        ],
                        type: 'ClusterIP',
                    },
                },
            },
        ],
        edges: [
            {
                id: 'TEMPLATE_edge_1',
                source: 'TEMPLATE_deployment_metadata',
                target: 'TEMPLATE_deployment',
                sourceHandle: 'source-metadata',
                targetHandle: 'target-metadata-objectRef',
            },
            {
                id: 'TEMPLATE_edge_2',
                source: 'TEMPLATE_deployment_spec',
                target: 'TEMPLATE_deployment',
                sourceHandle: 'source-spec',
                targetHandle: 'target-spec-objectRef',
            },
            {
                id: 'TEMPLATE_edge_3',
                source: 'TEMPLATE_service_metadata',
                target: 'TEMPLATE_service',
                sourceHandle: 'source-metadata',
                targetHandle: 'target-metadata-objectRef',
            },
            {
                id: 'TEMPLATE_edge_4',
                source: 'TEMPLATE_service_spec',
                target: 'TEMPLATE_service',
                sourceHandle: 'source-spec',
                targetHandle: 'target-spec-objectRef',
            },
        ],
    },
    {
        id: 'cronjob',
        name: 'CronJob',
        description: 'A scheduled job that runs periodically',
        category: 'workloads',
        nodes: [
            {
                id: 'TEMPLATE_cronjob',
                type: 'KindNode',
                position: { x: 0, y: 0 },
                data: {
                    type: 'cronjob',
                    kind: 'CronJob',
                    apiVersion: 'batch/v1',
                    values: {
                        apiVersion: 'batch/v1',
                        kind: 'CronJob',
                        metadata: '#ref-TEMPLATE_cronjob_metadata',
                        spec: '#ref-TEMPLATE_cronjob_spec',
                    },
                },
            },
            {
                id: 'TEMPLATE_cronjob_metadata',
                type: 'ObjectRefNode',
                position: { x: -350, y: 0 },
                data: {
                    kind: 'CronJob',
                    objectRef: 'metadata',
                    values: {
                        name: 'my-cronjob',
                    },
                },
            },
            {
                id: 'TEMPLATE_cronjob_spec',
                type: 'ObjectRefNode',
                position: { x: -350, y: 150 },
                data: {
                    kind: 'CronJob',
                    objectRef: 'spec',
                    values: {
                        schedule: '*/5 * * * *',
                        jobTemplate: {
                            spec: {
                                template: {
                                    spec: {
                                        containers: [
                                            {
                                                name: 'hello',
                                                image: 'busybox:latest',
                                                command: ['/bin/sh', '-c', 'echo Hello from CronJob'],
                                            },
                                        ],
                                        restartPolicy: 'OnFailure',
                                    },
                                },
                            },
                        },
                    },
                },
            },
        ],
        edges: [
            {
                id: 'TEMPLATE_edge_1',
                source: 'TEMPLATE_cronjob_metadata',
                target: 'TEMPLATE_cronjob',
                sourceHandle: 'source-metadata',
                targetHandle: 'target-metadata-objectRef',
            },
            {
                id: 'TEMPLATE_edge_2',
                source: 'TEMPLATE_cronjob_spec',
                target: 'TEMPLATE_cronjob',
                sourceHandle: 'source-spec',
                targetHandle: 'target-spec-objectRef',
            },
        ],
    },
    // Configuration
    {
        id: 'configmap',
        name: 'ConfigMap',
        description: 'A ConfigMap for storing configuration data',
        category: 'configuration',
        nodes: [
            {
                id: 'TEMPLATE_configmap',
                type: 'KindNode',
                position: { x: 0, y: 0 },
                data: {
                    type: 'configmap',
                    kind: 'ConfigMap',
                    apiVersion: 'v1',
                    values: {
                        apiVersion: 'v1',
                        kind: 'ConfigMap',
                        metadata: '#ref-TEMPLATE_configmap_metadata',
                        data: '#ref-TEMPLATE_configmap_data',
                    },
                },
            },
            {
                id: 'TEMPLATE_configmap_metadata',
                type: 'ObjectRefNode',
                position: { x: -350, y: 0 },
                data: {
                    kind: 'ConfigMap',
                    objectRef: 'metadata',
                    values: {
                        name: 'my-config',
                    },
                },
            },
            {
                id: 'TEMPLATE_configmap_data',
                type: 'ObjectRefNode',
                position: { x: -350, y: 150 },
                data: {
                    kind: 'ConfigMap',
                    objectRef: 'data',
                    values: {
                        'config.json': '{"key": "value"}',
                    },
                },
            },
        ],
        edges: [
            {
                id: 'TEMPLATE_edge_1',
                source: 'TEMPLATE_configmap_metadata',
                target: 'TEMPLATE_configmap',
                sourceHandle: 'source-metadata',
                targetHandle: 'target-metadata-objectRef',
            },
            {
                id: 'TEMPLATE_edge_2',
                source: 'TEMPLATE_configmap_data',
                target: 'TEMPLATE_configmap',
                sourceHandle: 'source-data',
                targetHandle: 'target-data-objectRef',
            },
        ],
    },
    {
        id: 'secret',
        name: 'Secret',
        description: 'A Secret for storing sensitive data',
        category: 'configuration',
        nodes: [
            {
                id: 'TEMPLATE_secret',
                type: 'KindNode',
                position: { x: 0, y: 0 },
                data: {
                    type: 'secret',
                    kind: 'Secret',
                    apiVersion: 'v1',
                    values: {
                        apiVersion: 'v1',
                        kind: 'Secret',
                        metadata: '#ref-TEMPLATE_secret_metadata',
                        type: 'Opaque',
                        stringData: '#ref-TEMPLATE_secret_data',
                    },
                },
            },
            {
                id: 'TEMPLATE_secret_metadata',
                type: 'ObjectRefNode',
                position: { x: -350, y: 0 },
                data: {
                    kind: 'Secret',
                    objectRef: 'metadata',
                    values: {
                        name: 'my-secret',
                    },
                },
            },
            {
                id: 'TEMPLATE_secret_data',
                type: 'ObjectRefNode',
                position: { x: -350, y: 150 },
                data: {
                    kind: 'Secret',
                    objectRef: 'stringData',
                    values: {
                        'username': 'admin',
                        'password': 'changeme',
                    },
                },
            },
        ],
        edges: [
            {
                id: 'TEMPLATE_edge_1',
                source: 'TEMPLATE_secret_metadata',
                target: 'TEMPLATE_secret',
                sourceHandle: 'source-metadata',
                targetHandle: 'target-metadata-objectRef',
            },
            {
                id: 'TEMPLATE_edge_2',
                source: 'TEMPLATE_secret_data',
                target: 'TEMPLATE_secret',
                sourceHandle: 'source-stringData',
                targetHandle: 'target-stringData-objectRef',
            },
        ],
    },
    // Networking
    {
        id: 'ingress',
        name: 'Ingress',
        description: 'An Ingress for HTTP routing',
        category: 'networking',
        nodes: [
            {
                id: 'TEMPLATE_ingress',
                type: 'KindNode',
                position: { x: 0, y: 0 },
                data: {
                    type: 'ingress',
                    kind: 'Ingress',
                    apiVersion: 'networking.k8s.io/v1',
                    values: {
                        apiVersion: 'networking.k8s.io/v1',
                        kind: 'Ingress',
                        metadata: '#ref-TEMPLATE_ingress_metadata',
                        spec: '#ref-TEMPLATE_ingress_spec',
                    },
                },
            },
            {
                id: 'TEMPLATE_ingress_metadata',
                type: 'ObjectRefNode',
                position: { x: -350, y: 0 },
                data: {
                    kind: 'Ingress',
                    objectRef: 'metadata',
                    values: {
                        name: 'my-ingress',
                    },
                },
            },
            {
                id: 'TEMPLATE_ingress_spec',
                type: 'ObjectRefNode',
                position: { x: -350, y: 150 },
                data: {
                    kind: 'Ingress',
                    objectRef: 'spec',
                    values: {
                        rules: [
                            {
                                host: 'example.com',
                                http: {
                                    paths: [
                                        {
                                            path: '/',
                                            pathType: 'Prefix',
                                            backend: {
                                                service: {
                                                    name: 'my-service',
                                                    port: {
                                                        number: 80,
                                                    },
                                                },
                                            },
                                        },
                                    ],
                                },
                            },
                        ],
                    },
                },
            },
        ],
        edges: [
            {
                id: 'TEMPLATE_edge_1',
                source: 'TEMPLATE_ingress_metadata',
                target: 'TEMPLATE_ingress',
                sourceHandle: 'source-metadata',
                targetHandle: 'target-metadata-objectRef',
            },
            {
                id: 'TEMPLATE_edge_2',
                source: 'TEMPLATE_ingress_spec',
                target: 'TEMPLATE_ingress',
                sourceHandle: 'source-spec',
                targetHandle: 'target-spec-objectRef',
            },
        ],
    },
    // Storage
    {
        id: 'pvc',
        name: 'PersistentVolumeClaim',
        description: 'A PVC for requesting storage',
        category: 'storage',
        nodes: [
            {
                id: 'TEMPLATE_pvc',
                type: 'KindNode',
                position: { x: 0, y: 0 },
                data: {
                    type: 'persistentvolumeclaim',
                    kind: 'PersistentVolumeClaim',
                    apiVersion: 'v1',
                    values: {
                        apiVersion: 'v1',
                        kind: 'PersistentVolumeClaim',
                        metadata: '#ref-TEMPLATE_pvc_metadata',
                        spec: '#ref-TEMPLATE_pvc_spec',
                    },
                },
            },
            {
                id: 'TEMPLATE_pvc_metadata',
                type: 'ObjectRefNode',
                position: { x: -350, y: 0 },
                data: {
                    kind: 'PersistentVolumeClaim',
                    objectRef: 'metadata',
                    values: {
                        name: 'my-pvc',
                    },
                },
            },
            {
                id: 'TEMPLATE_pvc_spec',
                type: 'ObjectRefNode',
                position: { x: -350, y: 150 },
                data: {
                    kind: 'PersistentVolumeClaim',
                    objectRef: 'spec',
                    values: {
                        accessModes: ['ReadWriteOnce'],
                        resources: {
                            requests: {
                                storage: '1Gi',
                            },
                        },
                    },
                },
            },
        ],
        edges: [
            {
                id: 'TEMPLATE_edge_1',
                source: 'TEMPLATE_pvc_metadata',
                target: 'TEMPLATE_pvc',
                sourceHandle: 'source-metadata',
                targetHandle: 'target-metadata-objectRef',
            },
            {
                id: 'TEMPLATE_edge_2',
                source: 'TEMPLATE_pvc_spec',
                target: 'TEMPLATE_pvc',
                sourceHandle: 'source-spec',
                targetHandle: 'target-spec-objectRef',
            },
        ],
    },
];

/**
 * Get templates grouped by category
 */
export function getTemplatesByCategory(): TemplateCategory[] {
    const categories: Record<string, TemplateCategory> = {
        workloads: { id: 'workloads', name: 'Workloads', templates: [] },
        networking: { id: 'networking', name: 'Networking', templates: [] },
        storage: { id: 'storage', name: 'Storage', templates: [] },
        configuration: { id: 'configuration', name: 'Configuration', templates: [] },
    };

    templates.forEach((template) => {
        categories[template.category].templates.push(template);
    });

    return Object.values(categories).filter((cat) => cat.templates.length > 0);
}
