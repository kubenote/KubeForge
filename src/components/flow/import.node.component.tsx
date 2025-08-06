'use client'

import { useRef, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import yaml from 'js-yaml'
import { useVersion } from '../../providers/VersionProvider'
import { useReactFlow } from '@xyflow/react'
import { FolderArchive } from 'lucide-react'
import { nanoid } from 'nanoid'


interface NodeData {
  kind: string
  apiVersion: string
  [key: string]: any
}


function importYamlToFlowNodes(
  yamlData: NodeData,
  preRefSchemaData: Record<string, any>,
  offset: number = 0
): { nodes: any[]; edges: any[]; error?: string } {
  try {
    const kind = yamlData.kind
    const schema = preRefSchemaData[kind.toLowerCase()]

    if (!schema) {
      const msg = `Schema not found for kind: ${kind}`
      console.warn(msg)
      return { nodes: [], edges: [], error: msg }
    }

    const mainNodeId = nanoid()
    const baseValues: Record<string, any> = {}
    const refNodes: any[] = []
    const edges: any[] = []

    for (const key in schema.properties) {
      const fieldDef = schema.properties[key]

      if ('$ref' in fieldDef && yamlData[key]) {
        const refId = nanoid()

        refNodes.push({
          id: refId,
          type: 'ObjectRefNode',
          position: {
            x: -500 + offset * 100,
            y: 100 + offset * 50,
          },
          data: {
            kindRef: kind,
            objectRef: key,
            values: yamlData[key],
          },
        })

        baseValues[key] = `#ref-${refId}`

        edges.push({
          id: `xy-edge__${nanoid()}`,
          source: refId,
          sourceHandle: `source-${refId}`,
          target: mainNodeId,
          targetHandle: `target-${key}`,
        })
      } else {
        baseValues[key] = yamlData[key]
      }
    }

    const mainNode = {
      id: mainNodeId,
      type: 'ConfigNode',
      position: {
        x: 220 + offset * 100,
        y: 100 + offset * 50,
      },
      data: {
        type: kind,
        kind: kind,
        values: baseValues,
        inline: false,
      },
    }

    return {
      nodes: [mainNode, ...refNodes],
      edges,
    }
  } catch (err) {
    console.error('Error importing YAML to flow nodes:', err)
    return {
      nodes: [],
      edges: [],
      error: (err as Error).message || 'Unknown error during import',
    }
  }
}


function removeNullFields(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(removeNullFields);
  } else if (obj && typeof obj === 'object') {
    const cleaned: any = {};
    for (const key in obj) {
      const value = obj[key];
      if (value !== null) {
        const cleanedValue = removeNullFields(value);
        if (cleanedValue !== null && cleanedValue !== undefined) {
          cleaned[key] = cleanedValue;
        }
      }
    }
    return cleaned;
  }
  return obj;
}

function basicSanitizeYamlTemplates(yaml: string): string {
  return yaml
    .split('\n')
    .map((line) => {
      if (line.includes('{{')) {
        // Remove any existing quote wrapping
        const cleaned = line.replace(/["']+/g, '');
        const idx = cleaned.indexOf('{{');
        return cleaned.slice(0, idx) + '"' + cleaned.slice(idx) + '"';
      }
      return line;
    })
    .join('\n');
}


export default function YamlImportButton() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [parsedYaml, setParsedYaml] = useState<any[]>([])
  const { preRefSchemaData } = useVersion()
  const { setNodes, setEdges } = useReactFlow()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const docs: any[] = []
    let filesLoaded = 0

    Array.from(files).forEach((file) => {
      const reader = new FileReader()
      reader.onload = () => {
        try {
          yaml.loadAll(basicSanitizeYamlTemplates(reader.result), (doc) => {
            if (doc) {
              const cleaned = removeNullFields(doc)
              docs.push(cleaned)
            }
          })
        } catch (err) {
          console.warn(`Invalid YAML in ${file.name}:`, err)
        } finally {
          filesLoaded++
          if (filesLoaded === files.length) {
            setParsedYaml(docs)
            setDialogOpen(true)
          }
        }
      }

      reader.readAsText(file)
    })
  }


  const handleConfirmImport = () => {
    let allNodes: any[] = []
    let allEdges: any[] = []

    parsedYaml.forEach((doc, i) => {
      const { nodes, edges } = importYamlToFlowNodes(doc, preRefSchemaData, i)
      allNodes.push(...nodes)
      allEdges.push(...edges)
    })

    setNodes(allNodes)
    setEdges(allEdges)
    setDialogOpen(false)
  }

  return (
    <>

      <Badge
        variant="secondary"
        className="bg-blue-500 text-white dark:bg-blue-600 h-4 rounded-[3px] px-1 cursor-pointer ml-4 text-[10px] !font-[400]"
        onClick={() => folderInputRef.current?.click()}
      >
        <FolderArchive />
      </Badge>
      <Badge
        variant="secondary"
        className="bg-blue-500 text-white dark:bg-blue-600 h-4 rounded-[3px] px-1 cursor-pointer ml-0 text-[10px] !font-[400]"
        onClick={() => fileInputRef.current?.click()}
      >
        Import
      </Badge>

      {/* Input for files */}
      <input
        type="file"
        accept=".yml,.yaml"
        ref={fileInputRef}
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Input for folders */}
      <input
        type="file"
        accept=".yml,.yaml"
        ref={folderInputRef}
        className="hidden"
        onChange={handleFileChange}
        webkitdirectory=""
        directory=""
        multiple
      />


      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm YAML Import</DialogTitle>
          </DialogHeader>
          <pre className="text-xs max-h-[300px] overflow-auto bg-muted p-2 rounded">
            {JSON.stringify(parsedYaml, null, 2)}
          </pre>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => setDialogOpen(false)} className="text-sm text-gray-500">
              Cancel
            </button>
            <button
              onClick={handleConfirmImport}
              className="text-sm text-white bg-blue-500 hover:bg-blue-600 px-3 py-1 rounded"
            >
              Import
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
