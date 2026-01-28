'use client'

// Extend HTMLInputElement to support directory selection attributes
declare module 'react' {
  interface InputHTMLAttributes<T> extends HTMLAttributes<T> {
    webkitdirectory?: string;
    directory?: string;
  }
}

import { useRef, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import yaml from 'js-yaml'
import { useVersion } from '../../providers/VersionProvider'
import { FolderArchive } from 'lucide-react'
import { nanoid } from 'nanoid'
import { useNodeProvider } from '@/providers/NodeProvider'
import { AddNodeParams } from '@/types'

interface NodeData {
  kind: string
  apiVersion: string
  [key: string]: unknown
}

function importYamlToFlowNodes(
  addNode: (params: AddNodeParams) => void,
  yamlData: NodeData,
) {
  try {
    const kind = yamlData.kind


    const mainNodeId = nanoid()
    const baseValues: Record<string, any> = {}

    for (const key of Object.keys(yamlData)) {
      const value = yamlData[key];
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        const refId = nanoid()

        addNode({
          type: "ObjectRefNode",
          targetNode: mainNodeId,
          data: {
            kind: kind,
            objectRef: key,
            values: yamlData[key] as Record<string, unknown>,
          }
        })
      }

    }

    addNode({
      type: "KindNode",
      id: mainNodeId,
      data: {
        type: kind,
        kind: kind,
        values: yamlData as Record<string, unknown>
      },
    })


  } catch (err) {
    console.error('Error importing YAML to flow nodes:', err)
    return {
      nodes: [],
      edges: [],
      error: (err as Error).message || 'Unknown error during import',
    }
  }
}

function removeNullFields(obj: unknown): unknown {
  if (Array.isArray(obj)) {
    return obj.map(removeNullFields);
  } else if (obj && typeof obj === 'object') {
    const cleaned: Record<string, unknown> = {};
    for (const key in obj as Record<string, unknown>) {
      const value = (obj as Record<string, unknown>)[key];
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
  const { addNode } = useNodeProvider()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const docs: any[] = []
    let filesLoaded = 0

    Array.from(files).forEach((file) => {
      const reader = new FileReader()
      reader.onload = () => {
        try {
          const content = reader.result
          if (typeof content !== 'string') return
          yaml.loadAll(basicSanitizeYamlTemplates(content), (doc) => {
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

    parsedYaml.forEach((doc) => {
      importYamlToFlowNodes(addNode, doc as NodeData)
    })

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
