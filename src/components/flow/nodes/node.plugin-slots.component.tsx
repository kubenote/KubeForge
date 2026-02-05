"use client"

import { Handle, Position, useStore } from "@xyflow/react"
import { memo, useMemo } from "react"
import { shallow } from "zustand/shallow"
import { PluginSlotEntry } from "@/types"
import { PLUGIN_ATTACHMENTS } from "@/lib/pluginAttachments"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"

interface PluginSlotsProps {
  nodeId: string;
  pluginSlots: PluginSlotEntry[];
  containerNames: string[];
  onContainerChange: (sourceNodeId: string, containerName: string) => void;
}

function PluginSlotsComponent({ nodeId, pluginSlots, containerNames, onContainerChange }: PluginSlotsProps) {
  // Look up source node names from the store
  const sourceNodes = useStore(
    (s) => s.nodes.filter((n) => pluginSlots.some((slot) => slot.sourceNodeId === n.id)),
    shallow
  );

  const slots = useMemo(() => {
    return pluginSlots.map((slot) => {
      const attachment = PLUGIN_ATTACHMENTS[slot.sourceNodeType];
      const sourceNode = sourceNodes.find((n) => n.id === slot.sourceNodeId);
      const displayName = (sourceNode?.data as Record<string, unknown>)?.item
        ? ((sourceNode?.data as Record<string, unknown>).item as Record<string, unknown>)?.name as string || attachment?.label || slot.sourceNodeType
        : attachment?.label || slot.sourceNodeType;
      return { ...slot, attachment, displayName };
    });
  }, [pluginSlots, sourceNodes]);

  return (
    <div className="mt-2 pt-2 border-t border-dashed space-y-1.5">
      <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Plugins</div>

      {/* Filled slots */}
      {slots.map((slot) => {
        const color = slot.attachment?.color || 'gray';
        const needsContainer = slot.attachment?.scope === 'container';

        return (
          <div key={slot.sourceNodeId} className="flex items-center gap-1.5 relative text-xs">
            <Handle
              type="target"
              position={Position.Left}
              className={`!w-2 !h-2 !border-2 !border-${color}-500 !bg-white`}
              id={`target-plugin-${nodeId}-${slot.sourceNodeId}`}
              style={{ position: 'relative', top: 'auto', left: 'auto', transform: 'none' }}
            />
            <span className={`text-${color}-500 font-medium`}>{slot.displayName}</span>

            {needsContainer && containerNames.length > 0 && (
              <Select
                value={slot.containerName || ''}
                onValueChange={(val) => onContainerChange(slot.sourceNodeId, val)}
              >
                <SelectTrigger className="h-5 text-[10px] w-28 ml-auto px-1">
                  <SelectValue placeholder="container" />
                </SelectTrigger>
                <SelectContent>
                  {containerNames.map((name) => (
                    <SelectItem key={name} value={name} className="text-xs">
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        );
      })}

      {/* Empty slot for new connections */}
      <div className="flex items-center gap-1.5 relative text-xs text-muted-foreground">
        <Handle
          type="target"
          position={Position.Left}
          className="!w-2 !h-2 !border-2 !border-dashed !border-gray-400 !bg-white animate-[spin-pause_1s_ease-in-out_infinite]"
          id={`target-plugin-${nodeId}-empty`}
          style={{ position: 'relative', top: 'auto', left: 'auto', transform: 'none' }}
        />
        <span className="italic">+ connect plugin</span>
      </div>
    </div>
  );
}

export const PluginSlots = memo(PluginSlotsComponent);
