// Builds Kubernetes spec fragments from integration node data.
// Each builder receives item.config (the normalized, flat config object)
// and returns the K8s objects to inject into the target node.

// ============================================================
// 1. Secret References → env[].valueFrom.secretKeyRef or envFrom[].secretRef
// ============================================================
export function buildSecretEnvFrom(config: Record<string, unknown>) {
  return {
    secretRef: {
      name: config.secretName as string,
    },
  }
}

// ============================================================
// 2. Container Registries → imagePullSecrets[]
// ============================================================
export function buildImagePullSecret(config: Record<string, unknown>) {
  return {
    name: config.secret_name as string,
  }
}

// ============================================================
// 3. ConfigMap References → envFrom[].configMapRef or volumes[]+volumeMounts[]
// ============================================================
export function buildConfigMapEnvFrom(config: Record<string, unknown>) {
  return {
    configMapRef: {
      name: config.configMapName as string,
    },
  }
}

export function buildConfigMapVolume(config: Record<string, unknown>, slug?: string) {
  const volumeName = slug || (config.configMapName as string)
  return {
    volume: {
      name: volumeName,
      configMap: {
        name: config.configMapName as string,
      },
    },
    volumeMount: {
      name: volumeName,
      mountPath: (config.mountPath || '/etc/config') as string,
      readOnly: true,
    },
  }
}

// ============================================================
// 4. Ingress Domains → full Ingress resource
// ============================================================
export function buildIngressSpec(config: Record<string, unknown>) {
  const domain = config.domain as string
  const tlsSecret = (config.tls_secret_name || null) as string | null
  const ingressClass = (config.ingress_class || 'nginx') as string
  const serviceName = (config.serviceName || 'CHANGE_ME') as string
  const servicePort = (config.servicePort || 80) as number

  const spec: Record<string, unknown> = {
    ingressClassName: ingressClass,
    rules: [
      {
        host: domain,
        http: {
          paths: [
            {
              path: '/',
              pathType: 'Prefix',
              backend: {
                service: {
                  name: serviceName,
                  port: { number: servicePort },
                },
              },
            },
          ],
        },
      },
    ],
  }

  if (tlsSecret) {
    spec.tls = [
      {
        hosts: [domain],
        secretName: tlsSecret,
      },
    ]
  }

  return spec
}

// ============================================================
// 5. Database Connections → env[] entries
// ============================================================
export function buildDatabaseEnvVars(config: Record<string, unknown>) {
  const prefix = ((config.envPrefix as string) || 'DB').toUpperCase()
  const envVars: Array<Record<string, unknown>> = []

  if (config.host) {
    envVars.push({ name: `${prefix}_HOST`, value: config.host as string })
  }
  if (config.port) {
    envVars.push({ name: `${prefix}_PORT`, value: String(config.port) })
  }
  if (config.database) {
    envVars.push({ name: `${prefix}_NAME`, value: config.database as string })
  }
  if (config.secretName) {
    envVars.push({
      name: `${prefix}_USER`,
      valueFrom: { secretKeyRef: { name: config.secretName as string, key: 'username' } },
    })
    envVars.push({
      name: `${prefix}_PASSWORD`,
      valueFrom: { secretKeyRef: { name: config.secretName as string, key: 'password' } },
    })
  }

  return envVars
}

// ============================================================
// 6. Message Queues → env[] entries
// ============================================================
export function buildQueueEnvVars(config: Record<string, unknown>) {
  const provider = config.provider as string
  const prefix = ((config.envPrefix as string) || 'QUEUE').toUpperCase()
  const envVars: Array<Record<string, unknown>> = []

  switch (provider) {
    case 'sqs':
      if (config.queueUrl) envVars.push({ name: `${prefix}_URL`, value: config.queueUrl as string })
      if (config.region) envVars.push({ name: `${prefix}_REGION`, value: config.region as string })
      break
    case 'rabbitmq':
      if (config.host) envVars.push({ name: `${prefix}_HOST`, value: config.host as string })
      if (config.port) envVars.push({ name: `${prefix}_PORT`, value: String(config.port) })
      if (config.vhost) envVars.push({ name: `${prefix}_VHOST`, value: config.vhost as string })
      break
    case 'kafka':
      if (config.brokers) envVars.push({ name: `${prefix}_BROKERS`, value: config.brokers as string })
      break
    case 'nats':
      if (config.url) envVars.push({ name: `${prefix}_URL`, value: config.url as string })
      break
    case 'oci-streaming':
      if (config.endpoint) envVars.push({ name: `${prefix}_ENDPOINT`, value: config.endpoint as string })
      if (config.streamOcid) envVars.push({ name: `${prefix}_STREAM_OCID`, value: config.streamOcid as string })
      break
  }

  if (config.secretName) {
    envVars.push({
      name: `${prefix}_USER`,
      valueFrom: { secretKeyRef: { name: config.secretName as string, key: 'username' } },
    })
    envVars.push({
      name: `${prefix}_PASSWORD`,
      valueFrom: { secretKeyRef: { name: config.secretName as string, key: 'password' } },
    })
  }

  return envVars
}

// ============================================================
// 7. Logging Sidecars → container + shared volume
// ============================================================
export function buildLoggingSidecar(config: Record<string, unknown>, slug?: string) {
  const sidecarName = slug || 'logging-sidecar'
  const logPath = (config.logPath || '/var/log/app') as string

  const container: Record<string, unknown> = {
    name: sidecarName,
    image: config.image as string,
    volumeMounts: [
      { name: `${sidecarName}-logs`, mountPath: logPath, readOnly: true },
    ],
  }

  if (config.configMapName) {
    container.volumeMounts = [
      ...(container.volumeMounts as Array<Record<string, unknown>>),
      { name: `${sidecarName}-config`, mountPath: '/fluent-bit/etc', readOnly: true },
    ]
  }

  const volumes: Array<Record<string, unknown>> = [
    { name: `${sidecarName}-logs`, emptyDir: {} },
  ]

  if (config.configMapName) {
    volumes.push({
      name: `${sidecarName}-config`,
      configMap: { name: config.configMapName as string },
    })
  }

  // The app container also needs a volumeMount for the shared log volume
  const appVolumeMount = {
    name: `${sidecarName}-logs`,
    mountPath: logPath,
  }

  return { container, volumes, appVolumeMount }
}

// ============================================================
// 8. Monitoring → annotations
// ============================================================
export function buildMonitoringAnnotations(config: Record<string, unknown>) {
  return {
    'prometheus.io/scrape': 'true',
    'prometheus.io/port': String(config.scrapePort || '9090'),
    'prometheus.io/path': (config.scrapePath || '/metrics') as string,
    'prometheus.io/scheme': (config.scheme || 'http') as string,
  }
}

// ============================================================
// 9. Service Accounts → serviceAccountName + annotations
// ============================================================
export function buildServiceAccountSpec(config: Record<string, unknown>) {
  const provider = config.provider as string
  const saName = config.serviceAccountName as string

  const annotations: Record<string, string> = {}

  switch (provider) {
    case 'aws-irsa':
      if (config.roleArn) annotations['eks.amazonaws.com/role-arn'] = config.roleArn as string
      break
    case 'gcp-workload-identity':
      if (config.gcpServiceAccount) annotations['iam.gke.io/gcp-service-account'] = config.gcpServiceAccount as string
      break
    case 'oci-instance-principal':
      if (config.compartmentOcid) annotations['oci.oraclecloud.com/compartment-id'] = config.compartmentOcid as string
      break
  }

  return { serviceAccountName: saName, annotations }
}
