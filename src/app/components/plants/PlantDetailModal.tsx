import React, { useState, useEffect } from "react";
import { DbPlant } from "../../../lib/supabase";
import {
  logPlantTopping,
  logPlantPruning,
  logPlantDiscarded,
  logPlantHarvest,
  logPlantPostHarvest,
  getMotherClones,
  createClonesFromMother,
} from "../../../lib/plantUtils";
import { PlantQrCard } from "./PlantQrCard";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import {
  X,
  Printer,
  Scissors,
  Sprout,
  Dna,
  History,
  Trash2,
  Scale,
  Calendar,
  CheckCircle2,
  PackageCheck,
  MapPin,
  Sparkles,
} from "lucide-react";

interface PlantDetailModalProps {
  plant: DbPlant | null;
  isOpen: boolean;
  onClose: () => void;
  onPlantUpdated: (updatedPlant: DbPlant) => void;
  onPrintPlant: (plant: DbPlant) => void;
  onPrintBatch: (plants: DbPlant[]) => void;
  onSelectAnotherPlant?: (tagOrId: string) => void;
}

export const PlantDetailModal: React.FC<PlantDetailModalProps> = ({
  plant,
  isOpen,
  onClose,
  onPlantUpdated,
  onPrintPlant,
  onPrintBatch,
  onSelectAnotherPlant,
}) => {
  const [activeTab, setActiveTab] = useState<"actions" | "clones" | "history">("actions");
  const [subClones, setSubClones] = useState<DbPlant[]>([]);
  const [loadingClones, setLoadingClones] = useState(false);

  // Action states
  const [toppingDate, setToppingDate] = useState(new Date().toISOString().split("T")[0]);
  const [pruningDate, setPruningDate] = useState(new Date().toISOString().split("T")[0]);
  const [discardDate, setDiscardDate] = useState(new Date().toISOString().split("T")[0]);
  const [discardReason, setDiscardReason] = useState("");
  const [discardField, setDiscardField] = useState("");

  const [harvestDate, setHarvestDate] = useState(new Date().toISOString().split("T")[0]);
  const [freshWeight, setFreshWeight] = useState("");

  const [dryWeightBefore, setDryWeightBefore] = useState("");
  const [dryWeightAfter, setDryWeightAfter] = useState("");

  // Mother Cloning state
  const [cloneCount, setCloneCount] = useState("10");
  const [cloneField, setCloneField] = useState("Propagation Room A");
  const [cloningInProgress, setCloningInProgress] = useState(false);

  // Status message
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  useEffect(() => {
    if (plant) {
      setDiscardField(plant.field || "");
      if (plant.type === "MOTHER") {
        loadSubClones(plant.id);
      }
    }
  }, [plant]);

  async function loadSubClones(motherId: string) {
    setLoadingClones(true);
    try {
      const clones = await getMotherClones(motherId);
      setSubClones(clones);
    } catch (e) {
      console.error("Failed to load sub clones", e);
    } finally {
      setLoadingClones(false);
    }
  }

  if (!isOpen || !plant) return null;

  const showStatus = (msg: string) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(null), 4000);
  };

  const handleTopping = async () => {
    const res = await logPlantTopping(plant, toppingDate);
    const updated = {
      ...plant,
      toppingDate,
      stage: "VEGETATIVE" as const,
      history: [
        ...(plant.history || []),
        {
          timestamp: new Date().toISOString(),
          event: "TOPPING_RECORDED",
          details: `Topping recorded on ${toppingDate}`,
        },
      ],
    };
    onPlantUpdated(updated);
    showStatus("✅ Topping date recorded successfully!");
  };

  const handlePruning = async () => {
    await logPlantPruning(plant, pruningDate);
    const updated = {
      ...plant,
      pruningDate,
      stage: "VEGETATIVE" as const,
      history: [
        ...(plant.history || []),
        {
          timestamp: new Date().toISOString(),
          event: "PRUNING_RECORDED",
          details: `Pruning recorded on ${pruningDate}`,
        },
      ],
    };
    onPlantUpdated(updated);
    showStatus("✅ Pruning date recorded successfully!");
  };

  const handleDiscard = async () => {
    if (!discardReason.trim()) {
      alert("Please provide a reason for discarding this plant.");
      return;
    }
    await logPlantDiscarded(plant, discardDate, discardReason, discardField || plant.field);
    const updated = {
      ...plant,
      stage: "DISCARDED" as const,
      discardedDate: discardDate,
      discardedReason: discardReason,
      history: [
        ...(plant.history || []),
        {
          timestamp: new Date().toISOString(),
          event: "PLANT_DISCARDED",
          details: `Discarded on ${discardDate}. Reason: ${discardReason}`,
        },
      ],
    };
    onPlantUpdated(updated);
    showStatus("⚠️ Plant marked as discarded.");
  };

  const handleHarvest = async () => {
    const weightNum = parseFloat(freshWeight);
    if (isNaN(weightNum)) {
      alert("Please enter a valid fresh weight (grams).");
      return;
    }
    await logPlantHarvest(plant, harvestDate, weightNum);
    const updated = {
      ...plant,
      stage: "PRE_HARVEST" as const,
      harvestDate,
      freshWeight: weightNum,
      history: [
        ...(plant.history || []),
        {
          timestamp: new Date().toISOString(),
          event: "HARVEST_RECORDED",
          details: `Harvest fresh weight: ${weightNum}g`,
        },
      ],
    };
    onPlantUpdated(updated);
    showStatus("🌿 Pre-Harvest fresh weight recorded!");
  };

  const handlePostHarvest = async () => {
    const beforeNum = parseFloat(dryWeightBefore);
    const afterNum = parseFloat(dryWeightAfter);
    if (isNaN(beforeNum) || isNaN(afterNum)) {
      alert("Please enter both dry weights before and after trimming.");
      return;
    }
    await logPlantPostHarvest(plant, beforeNum, afterNum);
    const updated = {
      ...plant,
      stage: "POST_HARVEST" as const,
      dryWeightBeforeTrimming: beforeNum,
      dryWeightAfterTrimming: afterNum,
      history: [
        ...(plant.history || []),
        {
          timestamp: new Date().toISOString(),
          event: "POST_HARVEST_TRIMMED",
          details: `Dry before trim: ${beforeNum}g, dry after trim: ${afterNum}g`,
        },
      ],
    };
    onPlantUpdated(updated);
    showStatus("✂️ Post-Harvest dry trim weights recorded!");
  };

  const handleTakeClones = async (e: React.FormEvent) => {
    e.preventDefault();
    const count = parseInt(cloneCount, 10);
    if (!count || count <= 0) return;

    setCloningInProgress(true);
    try {
      const { data: newClones } = await createClonesFromMother({
        mother: plant,
        count,
        field: cloneField,
      });

      if (newClones && newClones.length > 0) {
        setSubClones((prev) => [...prev, ...newClones]);
        showStatus(`🎉 Generated ${newClones.length} Sub-QR code clones from Mother ${plant.tag}!`);
        // Offer to print the batch right away
        onPrintBatch(newClones);
      }
    } catch (err) {
      console.error(err);
      alert("Error generating clones");
    } finally {
      setCloningInProgress(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border overflow-hidden">
        {/* Header */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-green-600 rounded-xl">
              <Sprout className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-lg text-green-400">{plant.tag}</span>
                <Badge className={
                  plant.stage === "DISCARDED" ? "bg-red-600" :
                  plant.stage === "POST_HARVEST" ? "bg-purple-600" :
                  plant.stage === "PRE_HARVEST" ? "bg-amber-600" : "bg-emerald-600"
                }>
                  {plant.stage}
                </Badge>
                {plant.type === "MOTHER" && <Badge className="bg-purple-700">🌿 Mother</Badge>}
                {plant.type === "CLONE" && <Badge className="bg-blue-600">✂️ Clone</Badge>}
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                {plant.variety} • {plant.field} • Planted {plant.plantingDate}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPrintPlant(plant)}
              className="bg-slate-800 text-white border-slate-700 hover:bg-slate-700 flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" /> Print Tag
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Status Toast */}
        {statusMsg && (
          <div className="bg-green-100 border-b border-green-200 text-green-900 px-6 py-2.5 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-700" />
            <span>{statusMsg}</span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex border-b bg-slate-50 px-6 gap-6">
          <button
            onClick={() => setActiveTab("actions")}
            className={`py-3 text-sm font-semibold border-b-2 flex items-center gap-2 ${
              activeTab === "actions"
                ? "border-green-600 text-green-700"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <Scissors className="w-4 h-4" /> Lifecycle Actions & Stages
          </button>

          {plant.type === "MOTHER" && (
            <button
              onClick={() => setActiveTab("clones")}
              className={`py-3 text-sm font-semibold border-b-2 flex items-center gap-2 ${
                activeTab === "clones"
                  ? "border-green-600 text-green-700"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              <Dna className="w-4 h-4" /> Sub-Clones ({subClones.length})
            </button>
          )}

          <button
            onClick={() => setActiveTab("history")}
            className={`py-3 text-sm font-semibold border-b-2 flex items-center gap-2 ${
              activeTab === "history"
                ? "border-green-600 text-green-700"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <History className="w-4 h-4" /> Audit History ({plant.history?.length || 1})
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Top Info Banner for Clones */}
          {plant.type === "CLONE" && plant.motherTag && (
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-200 text-purple-800 rounded-lg">
                  <Dna className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs uppercase font-semibold text-purple-700">Genetic Parentage</span>
                  <p className="text-sm font-bold text-slate-900">
                    Cutting #{plant.cloneIndex} propagated from Mother:{" "}
                    <span className="font-mono text-purple-800">{plant.motherTag}</span>
                  </p>
                </div>
              </div>
              {onSelectAnotherPlant && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onSelectAnotherPlant(plant.motherTag!)}
                  className="text-purple-700 border-purple-300 hover:bg-purple-100 text-xs"
                >
                  View Mother Plant
                </Button>
              )}
            </div>
          )}

          {activeTab === "actions" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Left Column: Fixed QR Code Display */}
              <div className="flex flex-col items-center">
                <PlantQrCard plant={plant} size={150} />
                <p className="text-[11px] text-slate-400 text-center mt-2 px-2">
                  Permanent QR code remains identical across all lifecycle stages.
                </p>
              </div>

              {/* Middle & Right: Actions by Lifecycle Stage */}
              <div className="md:col-span-2 space-y-5">
                {/* 1. Vegetative: Topping & Pruning */}
                <div className="bg-slate-50 border rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <Scissors className="w-4 h-4 text-green-600" /> Vegetative Stage: Topping & Pruning
                    </span>
                    {(plant.toppingDate || plant.pruningDate) && (
                      <Badge variant="outline" className="text-green-700 border-green-300 text-[10px]">
                        Logged
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-white p-3 rounded-lg border">
                      <label className="text-xs font-semibold text-slate-600 block mb-1">Topping Date</label>
                      <div className="flex gap-2">
                        <Input
                          type="date"
                          value={toppingDate}
                          onChange={(e) => setToppingDate(e.target.value)}
                          className="text-xs"
                        />
                        <Button size="sm" onClick={handleTopping} className="bg-green-700 text-white text-xs">
                          Save
                        </Button>
                      </div>
                      {plant.toppingDate && (
                        <p className="text-[11px] text-green-700 mt-1">Recorded: {plant.toppingDate}</p>
                      )}
                    </div>

                    <div className="bg-white p-3 rounded-lg border">
                      <label className="text-xs font-semibold text-slate-600 block mb-1">Pruning Date</label>
                      <div className="flex gap-2">
                        <Input
                          type="date"
                          value={pruningDate}
                          onChange={(e) => setPruningDate(e.target.value)}
                          className="text-xs"
                        />
                        <Button size="sm" onClick={handlePruning} className="bg-green-700 text-white text-xs">
                          Save
                        </Button>
                      </div>
                      {plant.pruningDate && (
                        <p className="text-[11px] text-green-700 mt-1">Recorded: {plant.pruningDate}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. Pre-Harvest: Fresh Weight */}
                <div className="bg-slate-50 border rounded-xl p-4 space-y-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Scale className="w-4 h-4 text-amber-600" /> Pre_Harvest Stage: Fresh Weight
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end bg-white p-3 rounded-lg border">
                    <div>
                      <label className="text-xs font-semibold text-slate-600 block mb-1">Harvest Date</label>
                      <Input
                        type="date"
                        value={harvestDate}
                        onChange={(e) => setHarvestDate(e.target.value)}
                        className="text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 block mb-1">Fresh Weight (g)</label>
                      <Input
                        type="number"
                        placeholder="e.g. 450"
                        value={freshWeight}
                        onChange={(e) => setFreshWeight(e.target.value)}
                        className="text-xs"
                      />
                    </div>
                    <Button onClick={handleHarvest} className="bg-amber-600 hover:bg-amber-700 text-white text-xs">
                      Record Fresh Weight
                    </Button>
                  </div>
                  {plant.freshWeight && (
                    <p className="text-xs text-amber-800 font-medium">
                      Current Fresh Weight: <strong>{plant.freshWeight}g</strong> (Harvested {plant.harvestDate})
                    </p>
                  )}
                </div>

                {/* 3. Post-Harvest: Dry Weight Before & After Trimming */}
                <div className="bg-slate-50 border rounded-xl p-4 space-y-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <PackageCheck className="w-4 h-4 text-purple-600" /> Post_Harvest: Dry Weights
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end bg-white p-3 rounded-lg border">
                    <div>
                      <label className="text-xs font-semibold text-slate-600 block mb-1">Dry Wt Before Trim (g)</label>
                      <Input
                        type="number"
                        placeholder="e.g. 95"
                        value={dryWeightBefore}
                        onChange={(e) => setDryWeightBefore(e.target.value)}
                        className="text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 block mb-1">Dry Wt After Trim (g)</label>
                      <Input
                        type="number"
                        placeholder="e.g. 82"
                        value={dryWeightAfter}
                        onChange={(e) => setDryWeightAfter(e.target.value)}
                        className="text-xs"
                      />
                    </div>
                    <Button onClick={handlePostHarvest} className="bg-purple-600 hover:bg-purple-700 text-white text-xs">
                      Record Dry Trim
                    </Button>
                  </div>
                  {plant.dryWeightAfterTrimming && (
                    <p className="text-xs text-purple-800 font-medium">
                      Before Trim: <strong>{plant.dryWeightBeforeTrimming}g</strong> | After Trim:{" "}
                      <strong>{plant.dryWeightAfterTrimming}g</strong>
                    </p>
                  )}
                </div>

                {/* 4. Discarded Action */}
                <div className="bg-red-50/60 border border-red-200 rounded-xl p-4 space-y-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-red-700 flex items-center gap-1.5">
                    <Trash2 className="w-4 h-4" /> Discard Plant
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end bg-white p-3 rounded-lg border border-red-100">
                    <div>
                      <label className="text-xs font-semibold text-slate-600 block mb-1">Discard Date</label>
                      <Input
                        type="date"
                        value={discardDate}
                        onChange={(e) => setDiscardDate(e.target.value)}
                        className="text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 block mb-1">Reason</label>
                      <Input
                        type="text"
                        placeholder="e.g. Hermaphrodite / Root rot"
                        value={discardReason}
                        onChange={(e) => setDiscardReason(e.target.value)}
                        className="text-xs"
                      />
                    </div>
                    <Button onClick={handleDiscard} variant="destructive" className="text-xs">
                      Mark Discarded
                    </Button>
                  </div>
                  {plant.stage === "DISCARDED" && (
                    <p className="text-xs text-red-600 font-semibold">
                      Discarded on {plant.discardedDate}. Reason: {plant.discardedReason}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Sub-Clones Tab (for Mother Plant) */}
          {activeTab === "clones" && plant.type === "MOTHER" && (
            <div className="space-y-6">
              {/* Clone Propagate Box */}
              <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-5 shadow-sm">
                <h4 className="text-sm font-bold text-purple-900 flex items-center gap-2">
                  <Scissors className="w-4 h-4" /> Take Cuttings from this Mother ({plant.tag})
                </h4>
                <p className="text-xs text-purple-700 mt-1">
                  Generates linked Sub-QR codes ({plant.tag}-C01, {plant.tag}-C02...) and prints printable plant tags.
                </p>

                <form onSubmit={handleTakeClones} className="mt-4 flex flex-wrap gap-3 items-end">
                  <div className="w-32">
                    <label className="text-xs font-semibold text-slate-700 block mb-1">No. of Cuttings</label>
                    <Input
                      type="number"
                      min="1"
                      max="100"
                      value={cloneCount}
                      onChange={(e) => setCloneCount(e.target.value)}
                      className="bg-white text-sm"
                    />
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Destination Field/Room</label>
                    <Input
                      type="text"
                      value={cloneField}
                      onChange={(e) => setCloneField(e.target.value)}
                      placeholder="e.g. Propagation Nursery"
                      className="bg-white text-sm"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={cloningInProgress}
                    className="bg-purple-700 hover:bg-purple-800 text-white text-xs flex items-center gap-1.5"
                  >
                    <Sparkles className="w-4 h-4" />
                    {cloningInProgress ? "Generating Sub-QRs..." : `Generate ${cloneCount} Sub-QR Clones`}
                  </Button>
                </form>
              </div>

              {/* Sub-Clones List */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold text-slate-900 text-sm">
                    Existing Clones Cut from this Mother ({subClones.length})
                  </h4>
                  {subClones.length > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onPrintBatch(subClones)}
                      className="text-xs flex items-center gap-1.5"
                    >
                      <Printer className="w-3.5 h-3.5" /> Print All {subClones.length} Sub-QR Tags
                    </Button>
                  )}
                </div>

                {loadingClones ? (
                  <p className="text-xs text-slate-500">Loading sub-clones...</p>
                ) : subClones.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No cuttings have been propagated from this mother plant yet.</p>
                ) : (
                  <div className="border rounded-xl overflow-hidden shadow-sm">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 border-b text-slate-600 font-semibold uppercase">
                        <tr>
                          <th className="p-2.5">Sub-QR Tag</th>
                          <th className="p-2.5">Clone #</th>
                          <th className="p-2.5">Stage</th>
                          <th className="p-2.5">Location</th>
                          <th className="p-2.5">Propagated</th>
                          <th className="p-2.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {subClones.map((c) => (
                          <tr key={c.id} className="hover:bg-slate-50">
                            <td className="p-2.5 font-mono font-bold text-purple-700">{c.tag}</td>
                            <td className="p-2.5 font-medium">#{c.cloneIndex}</td>
                            <td className="p-2.5">
                              <Badge variant="outline" className="text-[10px]">
                                {c.stage}
                              </Badge>
                            </td>
                            <td className="p-2.5">{c.field}</td>
                            <td className="p-2.5 text-slate-500">{c.plantingDate}</td>
                            <td className="p-2.5 text-right space-x-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => onPrintPlant(c)}
                                className="h-7 px-2 text-xs"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </Button>
                              {onSelectAnotherPlant && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => onSelectAnotherPlant(c.tag)}
                                  className="h-7 px-2 text-xs"
                                >
                                  View
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Audit History Tab */}
          {activeTab === "history" && (
            <div className="space-y-3">
              <h4 className="font-bold text-slate-900 text-sm">Plant Event Log & Audit Trail</h4>
              <div className="space-y-2">
                {(plant.history || []).map((h, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 border rounded-lg text-xs flex justify-between">
                    <div>
                      <span className="font-bold text-slate-900 block">{h.event}</span>
                      <span className="text-slate-600">{h.details}</span>
                    </div>
                    <span className="text-slate-400 font-mono text-[11px]">
                      {new Date(h.timestamp).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

