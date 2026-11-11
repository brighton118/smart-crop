import React from "react";
import { QRCodeSVG } from "qrcode.react";
import { DbPlant } from "../../../lib/supabase";
import { Badge } from "../ui/badge";
import { Sprout, Dna, QrCode } from "lucide-react";

interface PlantQrCardProps {
  plant: DbPlant;
  size?: number;
  showActions?: boolean;
  onPrint?: () => void;
  onSelect?: () => void;
}

export const PlantQrCard: React.FC<PlantQrCardProps> = ({
  plant,
  size = 120,
  showActions = false,
  onPrint,
  onSelect,
}) => {
  const getTypeBadge = () => {
    switch (plant.type) {
      case "MOTHER":
        return <Badge className="bg-purple-600 hover:bg-purple-700 text-white text-xs">🌿 Mother Plant</Badge>;
      case "CLONE":
        return <Badge className="bg-blue-600 hover:bg-blue-700 text-white text-xs">✂️ Sub-Clone</Badge>;
      default:
        return <Badge className="bg-green-600 hover:bg-green-700 text-white text-xs">🌱 Seedling</Badge>;
    }
  };

  return (
    <div
      onClick={onSelect}
      className={`bg-white border-2 border-slate-300 rounded-xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between print:border-black print:shadow-none print:break-inside-avoid print:p-2 print:rounded-none ${
        onSelect ? "cursor-pointer" : ""
      }`}
      style={{ minWidth: "220px", maxWidth: "320px" }}
    >
      {/* Label Header */}
      <div className="flex items-center justify-between border-b pb-2 mb-3 print:border-black">
        <div className="flex items-center gap-1.5">
          <Sprout className="w-4 h-4 text-green-700" />
          <span className="font-extrabold text-xs tracking-wider uppercase text-green-900">KindBuds Ltd</span>
        </div>
        <div>{getTypeBadge()}</div>
      </div>

      {/* QR Code and Tag */}
      <div className="flex flex-col items-center justify-center my-2">
        <div className="p-2 bg-white border border-slate-200 rounded-lg shadow-inner print:border-0 print:p-0">
          <QRCodeSVG
            value={plant.qrCode || plant.tag}
            size={size}
            level="H"
            includeMargin={true}
          />
        </div>
        <div className="mt-2 text-center">
          <span className="font-mono font-black text-sm tracking-widest text-slate-900 uppercase block print:text-base">
            {plant.tag}
          </span>
          <span className="text-xs text-slate-500 font-medium">Permanent Plant Tag</span>
        </div>
      </div>

      {/* Metadata / Details */}
      <div className="mt-3 pt-2 border-t border-dashed border-slate-200 text-xs text-slate-700 space-y-1 print:border-black print:text-[10px]">
        <div className="flex justify-between">
          <span className="text-slate-500">Variety/Strain:</span>
          <span className="font-bold text-slate-900">{plant.variety}</span>
        </div>

        {plant.motherTag && (
          <div className="flex justify-between items-center text-purple-700 font-medium">
            <span className="flex items-center gap-1">
              <Dna className="w-3 h-3" /> Mother Tag:
            </span>
            <span className="font-mono font-bold">{plant.motherTag}</span>
          </div>
        )}

        <div className="flex justify-between">
          <span className="text-slate-500">Location:</span>
          <span className="font-semibold text-slate-800">{plant.field}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-slate-500">Planting Date:</span>
          <span>{plant.plantingDate}</span>
        </div>
      </div>

      {showActions && (
        <div className="mt-4 pt-2 border-t flex gap-2 print:hidden">
          {onPrint && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onPrint();
              }}
              className="flex-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded text-xs font-medium flex items-center justify-center gap-1"
            >
              <QrCode className="w-3 h-3" /> Print Label
            </button>
          )}
        </div>
      )}
    </div>
  );
};

