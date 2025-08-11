import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

interface FieldSelectorProps {
    availableFields: string[];
    onSelect: (field: string) => void;
    placeholder?: string;
    className?: string;
    triggerClassName?: string;
}

export function FieldSelector({ 
    availableFields, 
    onSelect, 
    placeholder = "Add field",
    className = "",
    triggerClassName = "h-6 w-full cursor-pointer"
}: FieldSelectorProps) {
    if (availableFields.length === 0) {
        return null;
    }

    return (
        <Select onValueChange={onSelect}>
            <SelectTrigger className={`${triggerClassName} ${className}`}>
                <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
                {availableFields.map((field) => (
                    <SelectItem key={field} value={field}>
                        {field}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}