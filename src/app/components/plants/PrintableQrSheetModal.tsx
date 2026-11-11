import React, { useRef } from "react";
import { DbPlant } from "../../../lib/supabase";
import { PlantQrCard } from "./PlantQrCard";
import { Button } from "../ui/button";
import { Printer, X, FileText, CheckCircle2 } from "lucide-react";

interface PrintableQrSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  plants: DbPlant[];
  title?: string;
  subtitle?: string;
}

export const PrintableQrSheetModal: React.FC<PrintableQrSheetModalProps> = ({
  isOpen,
  onClose,
  plants,
  title = "Printable Plant QR Code Tags",
  subtitle = "Permanent waterproof pot and stake labels for KindBuds Ltd",
}) => {
  const printContainerRef = useRef<HTMLDivElement>(null);

  if (!isOpen || plants.length === 0) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm print:p-0 print:bg-white print:static">
      <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] flex flex-col shadow-2xl border print:max-h-none print:max-w-none print:shadow-none print:border-0 print:w-full">
        {/* Header - Hidden on Print */}
        <div className="p-5 border-b flex items-center justify-between print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-100 text-green-700 flex items-center justify-center">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">{title}</h2>
              <p className="text-sm text-slate-500">
                {subtitle} ({plants.length} plant{plants.length > 1 ? "s" : ""})
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handlePrint}
              className="bg-green-700 hover:bg-green-800 text-white flex items-center gap-2"
            >
              <Printer className="w-4 h-4" /> Print Labels
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5 text-slate-500" />
            </Button>
          </div>
        </div>

        {/* Informational banner - Hidden on Print */}
        <div className="px-6 py-3 bg-amber-50 border-b border-amber-200 text-amber-900 text-xs flex items-center gap-2 print:hidden">
          <CheckCircle2 className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span>
            <strong>Fixed Permanent Codes:</strong> These QR codes encode immutable Plant Tag IDs. As plants transition through stages, toppings, and harvest, these physical QR labels never expire or change.
          </span>
        </div>

        {/* Printable Area */}
        <div
          ref={printContainerRef}
          className="p-6 overflow-y-auto flex-1 print:p-0 print:overflow-visible"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 print:grid-cols-3 print:gap-4">
            {plants.map((plant) => (
              <div key={plant.id} className="print:break-inside-avoid">
                <PlantQrCard plant={plant} size={130} />
              </div>
            ))}
          </div>
        </div>

        {/* Footer - Hidden on Print */}
        <div className="p-4 border-t bg-slate-50 flex items-center justify-between print:hidden">
          <span className="text-xs text-slate-500">
            Total {plants.length} QR tag{plants.length > 1 ? "s" : ""} ready to print on standard plant labels
          </span>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

