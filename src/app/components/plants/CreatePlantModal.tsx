import React, { useState } from "react";
import { DbPlant, PlantType } from "../../../lib/supabase";
import { createMotherPlant, createSeedlingPlant, createClonesFromMother } from "../../../lib/plantUtils";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { X, Sprout, Dna, PlusCircle } from "lucide-react";

interface CreatePlantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlantCreated: (plants: DbPlant[]) => void;
  mothersList: DbPlant[];
  defaultType?: PlantType;
}

export const CreatePlantModal: React.FC<CreatePlantModalProps> = ({
  isOpen,
  onClose,
  onPlantCreated,
  mothersList,
  defaultType = "MOTHER",
}) => {
  const [plantType, setPlantType] = useState<PlantType>(defaultType);
  const [variety, setVariety] = useState("OG Kush");
  const [field, setField] = useState("Vegetative Room A");
  const [plantingDate, setPlantingDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");

  // Cloning specific
  const [selectedMotherId, setSelectedMotherId] = useState<string>(mothersList[0]?.id || "");
  const [cloneCount, setCloneCount] = useState("5");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (plantType === "MOTHER") {
        const { data } = await createMotherPlant({
          variety,
          field,
          plantingDate,
          notes,
        });
        if (data) onPlantCreated([data]);
      } else if (plantType === "SEEDLING") {
        const { data } = await createSeedlingPlant({
          variety,
          field,
          plantingDate,
          notes,
        });
        if (data) onPlantCreated([data]);
      } else if (plantType === "CLONE") {
        const mother = mothersList.find((m) => m.id === selectedMotherId);
        if (!mother) {
          alert("Please select a Mother Plant to propagate clones from.");
          setIsSubmitting(false);
          return;
        }
        const count = parseInt(cloneCount, 10) || 1;
        const { data } = await createClonesFromMother({
          mother,
          count,
          field,
          cuttingDate: plantingDate,
          notes,
        });
        if (data && data.length > 0) onPlantCreated(data);
      }
      onClose();
    } catch (err) {
      console.error(err);
      alert("Error creating plant");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-lg w-full flex flex-col shadow-2xl border overflow-hidden">
        {/* Header */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-green-600 rounded-xl">
              <PlusCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Tag New Plant / Propagation</h3>
              <p className="text-xs text-slate-300">Generates permanent, fixed QR code tags</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Type Selector */}
          <div>
            <label className="text-xs font-bold uppercase text-slate-600 block mb-2">Plant Type</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPlantType("MOTHER")}
                className={`py-2 px-3 rounded-lg border text-xs font-bold flex flex-col items-center gap-1 ${
                  plantType === "MOTHER"
                    ? "bg-purple-50 border-purple-600 text-purple-700"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Sprout className="w-4 h-4 text-purple-600" />
                Mother Plant
              </button>

              <button
                type="button"
                onClick={() => setPlantType("CLONE")}
                className={`py-2 px-3 rounded-lg border text-xs font-bold flex flex-col items-center gap-1 ${
                  plantType === "CLONE"
                    ? "bg-blue-50 border-blue-600 text-blue-700"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Dna className="w-4 h-4 text-blue-600" />
                Sub-Clone
              </button>

              <button
                type="button"
                onClick={() => setPlantType("SEEDLING")}
                className={`py-2 px-3 rounded-lg border text-xs font-bold flex flex-col items-center gap-1 ${
                  plantType === "SEEDLING"
                    ? "bg-emerald-50 border-emerald-600 text-emerald-700"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Sprout className="w-4 h-4 text-emerald-600" />
                Seedling
              </button>
            </div>
          </div>

          {/* If Clone: Select Mother Plant */}
          {plantType === "CLONE" && (
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl space-y-3">
              <label className="text-xs font-bold uppercase text-purple-900 block">
                Select Mother Plant (Master QR)
              </label>
              {mothersList.length === 0 ? (
                <p className="text-xs text-red-600">
                  No Mother Plants registered yet! Please register a Mother Plant first.
                </p>
              ) : (
                <select
                  value={selectedMotherId}
                  onChange={(e) => setSelectedMotherId(e.target.value)}
                  className="w-full text-sm border p-2 rounded-lg bg-white font-mono"
                  required
                >
                  <option value="">-- Choose Mother Plant --</option>
                  {mothersList.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.tag} ({m.variety} in {m.field})
                    </option>
                  ))}
                </select>
              )}

              <div>
                <label className="text-xs font-semibold text-purple-800 block mb-1">
                  Number of Cuttings / Sub-QRs to Generate
                </label>
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={cloneCount}
                  onChange={(e) => setCloneCount(e.target.value)}
                  className="bg-white text-sm"
                  required
                />
              </div>
            </div>
          )}

          {/* Variety & Location for Mother or Seedling */}
          {plantType !== "CLONE" && (
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Variety / Strain Name</label>
              <Input
                type="text"
                placeholder="e.g. OG Kush, Gorilla Glue, Purple Haze"
                value={variety}
                onChange={(e) => setVariety(e.target.value)}
                required
              />
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Field / Grow Room Location</label>
            <Input
              type="text"
              placeholder="e.g. Mother Room 1, Propagation Table B"
              value={field}
              onChange={(e) => setField(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Date</label>
            <Input
              type="date"
              value={plantingDate}
              onChange={(e) => setPlantingDate(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Notes / Origin (Optional)</label>
            <Input
              type="text"
              placeholder="e.g. Pheno #4 selection, high terpene profile"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || (plantType === "CLONE" && mothersList.length === 0)}
              className="bg-green-700 hover:bg-green-800 text-white"
            >
              {isSubmitting ? "Generating..." : "Generate Permanent QR Tag(s)"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

