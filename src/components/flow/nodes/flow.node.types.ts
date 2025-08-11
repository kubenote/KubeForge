
export type ValueType = 'string' | 'number' | 'integer' | 'array' | 'boolean' | 'object' | 'objectRef';

export const typeColors: Record<ValueType, string> = {
    string: "text-green-500 !border-green-500",
    number: "text-blue-500 !border-blue-500",
    integer: "text-blue-500 !border-blue-500",
    array: "text-purple-500 !border-purple-500",
    boolean: "text-red-500 !border-red-500",
    object: "text-orange-500 !border-orange-500",
    objectRef: "text-orange-800 !border-orange-800",
};

// Helper function to safely get type colors
export function getTypeColor(valueType: string): string {
    return typeColors[valueType as ValueType] || typeColors.string;
}

