import React from "react";
import { Check, Truck, CreditCard } from "lucide-react";

type CardStatus = "NOT_DELIVERED" | "OUT_FOR_DELIVERY" | "DELIVERED";

interface CardStatusLabelProps {
  status: CardStatus;
}

export function CardStatusLabel({ status }: CardStatusLabelProps) {
  const getStatusIcon = () => {
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

  const getStatusLabel = () => {
    switch (status) {
      case "DELIVERED":
        return "Delivered";
      case "OUT_FOR_DELIVERY":
        return "Out for Delivery";
      case "NOT_DELIVERED":
      default:
        return "Not Delivered";
    }
  };

  const getStatusColor = () => {
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
    <div className="flex items-center">
      {getStatusIcon()}
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor()}`}>
        {getStatusLabel()}
      </span>
    </div>
  );
}