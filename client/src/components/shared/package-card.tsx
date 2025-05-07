import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export type Package = {
  name: string;
  display: string;
  price: number;
  points: number;
  perks: string[];
};

interface PackageCardProps {
  pkg: Package;
  isSelected: boolean;
  onSelect: () => void;
  anySelected: boolean;
}

export function PackageCard({ pkg, isSelected, onSelect, anySelected }: PackageCardProps) {
  return (
    <div className="w-full px-4">
      <Card
        className={`w-full h-[700px] cursor-pointer transition-all relative overflow-visible
          ${isSelected
            ? 'border-[#43EB3E] ring-2 ring-[#43EB3E] shadow-[0_0_10px_rgba(67,235,62,0.3)]'
            : anySelected
              ? 'opacity-80 hover:opacity-100'
              : 'hover:border-primary'
          }`}
        onClick={onSelect}
      >
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex justify-between items-center text-lg">
            {pkg.display}
            {isSelected && (
              <Check className="h-5 w-5 text-[#43EB3E]" />
            )}
          </CardTitle>
          <CardDescription className="text-base">R{pkg.price}/month</CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <div className="space-y-2">
            <ul className="space-y-2">
              {pkg.perks.map((perk, index) => (
                <li key={index} className="flex items-start text-sm">
                  <Badge variant="outline" className="mr-2 shrink-0">✓</Badge>
                  <span>{perk}</span>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
        <div className="absolute bottom-6 left-6 right-6">
          <Button
            className={`w-full ${isSelected ? 'bg-[#43EB3E] hover:bg-[#43EB3E]' : ''}`}
            variant={isSelected ? "default" : "outline"}
          >
            {isSelected ? "Current Package" : "Select Package"}
          </Button>
        </div>
      </Card>
    </div>
  );
}

// Define packages array here to be available to both Products and Profile pages
export const packages = [
  {
    name: "OPPORTUNITY",
    display: "Opportunity",
    price: 350,
    points: 2500,
    perks: [
      "Activation Points: 2,500",
      "EMS Assist",
      "Legal Assist",
      "Repatriation Cover",
      "Celebrate Life",
      "24/7 Nurse On-Call"
    ]
  },
  {
    name: "MOMENTUM",
    display: "Momentum",
    price: 450,
    points: 5000,
    perks: [
      "Activation Points: 5,000",
      "Funeral Cover: R5,000",
      "Funeral Assist",
      "EMS Assist",
      "Legal Assist",
      "Repatriation Cover",
      "Celebrate Life",
      "24/7 Nurse On-Call"
    ]
  },
  {
    name: "PROSPER",
    display: "Prosper",
    price: 550,
    points: 7500,
    perks: [
      "Activation Points: 7,500",
      "Funeral Cover: R10,000",
      "Accidental Death Cover: R20,000",
      "Funeral Assist",
      "Family Income Benefit: R5,000 x6",
      "EMS Assist",
      "Legal Assist",
      "Repatriation Cover",
      "Celebrate Life",
      "24/7 Nurse On-Call",
      "Virtual GP Assistant",
      "Medical Second Opinion"
    ]
  },
  {
    name: "PRESTIGE",
    display: "Prestige",
    price: 695,
    points: 10000,
    perks: [
      "Activation Points: 10,000",
      "Funeral Cover: R15,000",
      "Accidental Death Cover: R50,000",
      "Funeral Assist",
      "Family Income Benefit: R5,000 x6",
      "EMS Assist",
      "Legal Assist",
      "Repatriation Cover",
      "Celebrate Life",
      "24/7 Nurse On-Call",
      "Virtual GP Assistant",
      "Medical Second Opinion",
      "Crime Victim Assist",
      "Assault & Trauma Assist",
      "Emergency Medical Services"
    ]
  },
  {
    name: "PINNACLE",
    display: "Pinnacle",
    price: 825,
    points: 12500,
    perks: [
      "Activation Points: 12,500",
      "Funeral Cover: R20,000",
      "Accidental Death Cover: R100,000",
      "Funeral Assist",
      "Family Income Benefit: R5,000 x6",
      "EMS Assist",
      "Legal Assist",
      "Lawyer Assist",
      "Repatriation Cover",
      "Celebrate Life",
      "24/7 Nurse On-Call",
      "Virtual GP Assistant",
      "Medical Second Opinion",
      "Crime Victim Assist",
      "Assault & Trauma Assist",
      "Emergency Medical Services"
    ]
  }
];