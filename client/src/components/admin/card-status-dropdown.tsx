import React from "react";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from "@/components/ui/select";
import { Check, Truck, CreditCard } from "lucide-react";

type CardStatus = "NOT_DELIVERED" | "OUT_FOR_DELIVERY" | "DELIVERED";

interface CardStatusDropdownProps {
  value: CardStatus;
  onChange: (status: CardStatus) => void;
  disabled?: boolean;
}

const statusOptions = [
  { value: "NOT_DELIVERED", label: "Not Delivered" },
  { value: "OUT_FOR_DELIVERY", label: "Out for Delivery" },
  { value: "DELIVERED", label: "Delivered" }
];

export function CardStatusDropdown({
  value,
  onChange,
  disabled = false
}: CardStatusDropdownProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "DELIVERED":
        return <Check className="h-4 w-4 text-green-500 mr-2" />;
      case "OUT_FOR_DELIVERY":
        return <Truck className="h-4 w-4 text-amber-500 mr-2" />;
      case "NOT_DELIVERED":
      default:
        return <CreditCard className="h-4 w-4 text-gray-500 mr-2" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "DELIVERED":
        return "bg-green-100 text-green-800";
      case "OUT_FOR_DELIVERY":
        return "bg-amber-100 text-amber-800";
      case "NOT_DELIVERED":
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Select
      value={value}
      onValueChange={(val) => onChange(val as CardStatus)}
      disabled={disabled}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select card status">
          <div className="flex items-center">
            {getStatusIcon(value)}
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(value)}`}>
              {statusOptions.find(option => option.value === value)?.label}
            </span>
          </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {statusOptions.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            <div className="flex items-center">
              {getStatusIcon(option.value)}
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(option.value)}`}>
                {option.label}
              </span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}