import React, { forwardRef, useImperativeHandle } from 'react';
import yaml from 'js-yaml';
import dynamic from 'next/dynamic';
import '@/lib/monaco-config';
import { yamlUrls } from '@/lib/apiUrls';
const Editor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

export interface MonacoComponentRef {
  downloadYaml: () => void;
  uploadYamlToServer: () => Promise<string>;
}

interface MonacoComponentProps {
  jsonData: unknown;
  isK8s?: boolean;
}

const MonacoComponent = forwardRef<MonacoComponentRef, MonacoComponentProps>(function MonacoComponent({ jsonData, isK8s = false }, ref) {
  let yamlText = '';

  try {
    if (isK8s) {
      // If it's an array, dump each item separately and join with ---
      if (Array.isArray(jsonData)) {
        yamlText = jsonData.map((doc) => yaml.dump(doc)).join('\n---\n');
      } else {
        yamlText = yaml.dump(jsonData);
      }
    } else {
      yamlText = yaml.dump(jsonData);
    }
  } catch (e) {
    yamlText = '# Error converting JSON to YAML:\n' + (e instanceof Error ? e.message : String(e));
  }

  useImperativeHandle(ref, () => ({
    downloadYaml: () => {
      const blob = new Blob([yamlText], { type: 'text/yaml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'exported_data.yaml';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
    uploadYamlToServer: async () => {
      const res = await fetch(yamlUrls.upload(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ yamlContent: yamlText }),
      });

      const result = await res.json();
      if (res.ok) {
        return result.url;
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    }
  }));

  return (
    <Editor
      height="700px"
      defaultLanguage="yaml"
      value={yamlText}
      options={{
        readOnly: true,
        wordWrap: 'on',
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
      }}
    />
  );
});

export default MonacoComponent;
