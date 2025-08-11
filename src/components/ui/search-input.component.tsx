import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface SearchInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    showIcon?: boolean;
}

export function SearchInput({ 
    value, 
    onChange, 
    placeholder = "Search...", 
    className = "",
    showIcon = true 
}: SearchInputProps) {
    return (
        <div className={`relative ${className}`}>
            {showIcon && (
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            )}
            <Input
                type="text"
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className={showIcon ? "pl-10" : ""}
            />
        </div>
    );
}