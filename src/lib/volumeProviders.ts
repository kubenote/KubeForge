export interface VolumeSpec {
  name: string
  csi: {
    driver: string
    volumeAttributes: Record<string, string>
    nodePublishSecretRef?: {
      name: string
      namespace?: string
    }
  }
}

export interface VolumeMountSpec {
  name: string
  mountPath: string
  readOnly?: boolean
}

interface BucketConfig {
  provider: string
  [key: string]: unknown
}

interface BucketNodeData {
  volumeName: string
  mountPath: string
  readOnly: boolean
  bucket: {
    provider: string
    config: BucketConfig
  }
}

const PROVIDER_CSI_DRIVERS: Record<string, string> = {
  'aws-s3': 's3.csi.aws.com',
  'oci': 'objectstorage.csi.oraclecloud.com',
  'gcs': 'gcs.csi.ofek.dev',
  'azure-blob': 'blob.csi.azure.com',
  'minio': 's3.csi.aws.com',
}

function getVolumeAttributes(config: BucketConfig): Record<string, string> {
  const attrs: Record<string, string> = {}

  switch (config.provider) {
    case 'aws-s3':
      attrs.bucketName = config.bucketName as string
      if (config.region) attrs.region = config.region as string
      break
    case 'oci':
      attrs.bucketName = config.bucketName as string
      if (config.namespace) attrs.namespace = config.namespace as string
      if (config.compartmentId) attrs.compartmentId = config.compartmentId as string
      break
    case 'gcs':
      attrs.bucketName = config.bucketName as string
      if (config.projectId) attrs.projectId = config.projectId as string
      break
    case 'azure-blob':
      if (config.containerName) attrs.containerName = config.containerName as string
      if (config.storageAccount) attrs.storageAccountName = config.storageAccount as string
      break
    case 'minio':
      attrs.bucketName = config.bucketName as string
      if (config.endpoint) attrs.endpoint = config.endpoint as string
      break
  }

  return attrs
}

export function buildVolumeSpec(data: BucketNodeData): VolumeSpec {
  const config = data.bucket.config
  const driver = PROVIDER_CSI_DRIVERS[config.provider] || 's3.csi.aws.com'

  const spec: VolumeSpec = {
    name: data.volumeName,
    csi: {
      driver,
      volumeAttributes: getVolumeAttributes(config),
    },
  }

  if (config.secretName) {
    spec.csi.nodePublishSecretRef = {
      name: config.secretName as string,
    }
    if (config.secretNamespace) {
      spec.csi.nodePublishSecretRef.namespace = config.secretNamespace as string
    }
  }

  return spec
}

export function buildVolumeMountSpec(data: BucketNodeData): VolumeMountSpec {
  const spec: VolumeMountSpec = {
    name: data.volumeName,
    mountPath: data.mountPath,
  }

  if (data.readOnly) {
    spec.readOnly = true
  }

  return spec
}
