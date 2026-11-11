import React, { useState, useEffect } from "react";
import { firebaseDb as supabase, DbPlant, PlantType, PlantStage } from "../../lib/firebaseDb";
import { getPlantByTagOrQr } from "../../lib/plantUtils";
import { PlantQrCard } from "../components/plants/PlantQrCard";
import { PlantDetailModal } from "../components/plants/PlantDetailModal";
import { QrScannerModal } from "../components/plants/QrScannerModal";
import { CreatePlantModal } from "../components/plants/CreatePlantModal";
import { PrintableQrSheetModal } from "../components/plants/PrintableQrSheetModal";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Card, CardContent } from "../components/ui/card";
import {
  QrCode,
  Camera,
  Plus,
  Printer,
  Search,
  Filter,
  Sprout,
  Dna,
  Scissors,
  CheckSquare,
  Square,
  Grid,
  List,
  Loader2,
  RefreshCw,
} from "lucide-react";

export function PlantsManagement() {
  const [plants, setPlants] = useState<DbPlant[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [selectedStage, setSelectedStage] = useState<string>("ALL");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Selection for batch printing
  const [selectedPlantIds, setSelectedPlantIds] = useState<Set<string>>(new Set());

  // Modals
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createType, setCreateType] = useState<PlantType>("MOTHER");
  const [selectedPlant, setSelectedPlant] = useState<DbPlant | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Printing
  const [printSheetPlants, setPrintSheetPlants] = useState<DbPlant[]>([]);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  useEffect(() => {
    loadPlants();

    // Subscribe to live changes
    const subscription = supabase
      .from("Plant")
      .on("*", () => {
        loadPlants();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function loadPlants() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("Plant")
        .select("*")
        .order("createdAt", { ascending: false });

      if (data) {
        setPlants(data as DbPlant[]);
      }
    } catch (err) {
      console.error("Error loading plants:", err);
    } finally {
      setLoading(false);
    }
  }

  // Handle QR Scan result
  const handleScanResult = async (scannedTag: string) => {
    setIsScannerOpen(false);
    setLoading(true);
    const foundPlant = await getPlantByTagOrQr(scannedTag);
    setLoading(false);

    if (foundPlant) {
      setSelectedPlant(foundPlant);
      setIsDetailOpen(true);
    } else {
      alert(`No plant found with Tag or QR: ${scannedTag}. You can register it as a new plant.`);
    }
  };

  // Plant selection toggles
  const toggleSelectPlant = (id: string) => {
    const next = new Set(selectedPlantIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedPlantIds(next);
  };

  const selectAll = () => {
    if (selectedPlantIds.size === filteredPlants.length) {
      setSelectedPlantIds(new Set());
    } else {
      setSelectedPlantIds(new Set(filteredPlants.map((p) => p.id)));
    }
  };

  // Print single plant
  const triggerPrintPlant = (plant: DbPlant) => {
    setPrintSheetPlants([plant]);
    setIsPrintModalOpen(true);
  };

  // Print batch
  const triggerPrintBatch = (batchPlants: DbPlant[]) => {
    setPrintSheetPlants(batchPlants);
    setIsPrintModalOpen(true);
  };

  const handlePrintSelected = () => {
    const selected = plants.filter((p) => selectedPlantIds.has(p.id));
    if (selected.length === 0) return;
    triggerPrintBatch(selected);
  };

  // Filtered plants
  const filteredPlants = plants.filter((p) => {
    if (selectedType !== "ALL" && p.type !== selectedType) return false;
    if (selectedStage !== "ALL" && p.stage !== selectedStage) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTag = p.tag?.toLowerCase().includes(q);
      const matchVariety = p.variety?.toLowerCase().includes(q);
      const matchField = p.field?.toLowerCase().includes(q);
      const matchMother = p.motherTag?.toLowerCase().includes(q);
      if (!matchTag && !matchVariety && !matchField && !matchMother) return false;
    }
    return true;
  });

  const mothersList = plants.filter((p) => p.type === "MOTHER");
  const clonesCount = plants.filter((p) => p.type === "CLONE").length;
  const seedlingsCount = plants.filter((p) => p.type === "SEEDLING").length;
  const activeCount = plants.filter((p) => p.stage !== "DISCARDED").length;

  return (
    <div className="p-4 lg:p-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 flex items-center gap-2">
            <QrCode className="w-8 h-8 text-green-700" /> Plant QR Tracking
          </h1>
          <p className="text-gray-600 text-sm mt-1">
            Permanent plant-by-plant QR tagging, mother lineage, clone sub-QRs, and mobile camera scanning
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Scan Camera Button */}
          <Button
            onClick={() => setIsScannerOpen(true)}
            className="bg-slate-900 hover:bg-slate-800 text-white flex items-center gap-2 shadow-sm"
          >
            <Camera className="w-4 h-4 text-green-400" /> Scan QR Tag
          </Button>

          {/* Add Mother */}
          <Button
            onClick={() => {
              setCreateType("MOTHER");
              setIsCreateOpen(true);
            }}
            className="bg-purple-700 hover:bg-purple-800 text-white flex items-center gap-1.5"
          >
            <Sprout className="w-4 h-4" /> Tag Mother
          </Button>

          {/* Clone from Mother */}
          <Button
            onClick={() => {
              setCreateType("CLONE");
              setIsCreateOpen(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5"
          >
            <Scissors className="w-4 h-4" /> Clone from Mother
          </Button>

          {/* Print Selected */}
          {selectedPlantIds.size > 0 && (
            <Button
              onClick={handlePrintSelected}
              variant="outline"
              className="border-green-600 text-green-700 hover:bg-green-50 flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" /> Print Selected ({selectedPlantIds.size})
            </Button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-slate-800">
          <CardContent className="p-4">
            <span className="text-xs font-semibold text-slate-500 uppercase">Total Tagged Plants</span>
            <p className="text-2xl font-black text-slate-900">{plants.length}</p>
            <span className="text-xs text-slate-400">{activeCount} active in system</span>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-600">
          <CardContent className="p-4">
            <span className="text-xs font-semibold text-purple-700 uppercase flex items-center gap-1">
              <Sprout className="w-3.5 h-3.5" /> Mother Plants
            </span>
            <p className="text-2xl font-black text-purple-950">{mothersList.length}</p>
            <span className="text-xs text-purple-600">Master QR Lineage</span>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-600">
          <CardContent className="p-4">
            <span className="text-xs font-semibold text-blue-700 uppercase flex items-center gap-1">
              <Dna className="w-3.5 h-3.5" /> Propagated Clones
            </span>
            <p className="text-2xl font-black text-blue-950">{clonesCount}</p>
            <span className="text-xs text-blue-600">Linked Sub-QRs</span>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-600">
          <CardContent className="p-4">
            <span className="text-xs font-semibold text-emerald-700 uppercase flex items-center gap-1">
              <Sprout className="w-3.5 h-3.5" /> Seedlings
            </span>
            <p className="text-2xl font-black text-emerald-950">{seedlingsCount}</p>
            <span className="text-xs text-emerald-600">Germinated stock</span>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-white border rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-3 justify-between items-center">
          {/* Search Box */}
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <Input
              type="text"
              placeholder="Search by Tag (e.g. KB-MOM-OGK-01), Variety, Field..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-sm"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
            {/* Type Filter */}
            <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="text-xs border rounded-md p-1.5 bg-slate-50"
              >
                <option value="ALL">All Types</option>
                <option value="MOTHER">Mother Plants</option>
                <option value="CLONE">Sub-Clones</option>
                <option value="SEEDLING">Seedlings</option>
              </select>
            </div>

            {/* Stage Filter */}
            <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
              <select
                value={selectedStage}
                onChange={(e) => setSelectedStage(e.target.value)}
                className="text-xs border rounded-md p-1.5 bg-slate-50"
              >
                <option value="ALL">All Stages</option>
                <option value="PLANTING">Planting</option>
                <option value="VEGETATIVE">Vegetative</option>
                <option value="PRE_HARVEST">Pre_Harvest</option>
                <option value="POST_HARVEST">Post_Harvest</option>
                <option value="STORAGE_PACKAGING">Storage & Packaging</option>
                <option value="DISCARDED">Discarded</option>
              </select>
            </div>

            {/* Grid vs Table View */}
            <div className="flex border rounded-md overflow-hidden bg-slate-100">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 ${viewMode === "grid" ? "bg-white text-green-700 shadow-sm" : "text-slate-500"}`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={`p-1.5 ${viewMode === "table" ? "bg-white text-green-700 shadow-sm" : "text-slate-500"}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            {/* Refresh */}
            <Button variant="ghost" size="icon" onClick={loadPlants} className="text-slate-500">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Selection actions bar */}
        {filteredPlants.length > 0 && (
          <div className="pt-2 border-t flex items-center justify-between text-xs text-slate-500">
            <button
              onClick={selectAll}
              className="flex items-center gap-1.5 text-slate-700 font-semibold hover:text-green-700"
            >
              {selectedPlantIds.size === filteredPlants.length ? (
                <CheckSquare className="w-4 h-4 text-green-700" />
              ) : (
                <Square className="w-4 h-4" />
              )}
              {selectedPlantIds.size > 0
                ? `${selectedPlantIds.size} of ${filteredPlants.length} selected`
                : `Select All (${filteredPlants.length})`}
            </button>

            <span>Click any plant to view details, log topping/pruning, or take cuttings</span>
          </div>
        )}
      </div>

      {/* Plants Content */}
      {loading ? (
        <div className="p-16 flex flex-col items-center justify-center text-slate-500 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-green-700" />
          <p className="text-sm">Loading Plant QR records...</p>
        </div>
      ) : filteredPlants.length === 0 ? (
        <div className="p-12 text-center bg-white border rounded-2xl space-y-4">
          <div className="w-16 h-16 bg-green-50 text-green-700 rounded-full flex items-center justify-center mx-auto">
            <QrCode className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">No Plants Tagged Yet</h3>
          <p className="text-slate-500 text-sm max-w-md mx-auto">
            Start by tagging your first Mother Plant, taking clones with sub-QR codes, or registering seedlings.
          </p>
          <div className="flex justify-center gap-3">
            <Button
              onClick={() => {
                setCreateType("MOTHER");
                setIsCreateOpen(true);
              }}
              className="bg-purple-700 hover:bg-purple-800 text-white"
            >
              Tag Mother Plant
            </Button>
            <Button
              onClick={() => {
                setCreateType("SEEDLING");
                setIsCreateOpen(true);
              }}
              className="bg-green-700 hover:bg-green-800 text-white"
            >
              Tag Seedling
            </Button>
          </div>
        </div>
      ) : viewMode === "grid" ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredPlants.map((plant) => (
            <div
              key={plant.id}
              className="relative group transition-transform hover:-translate-y-0.5"
            >
              {/* Checkbox badge */}
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSelectPlant(plant.id);
                }}
                className="absolute top-2 right-2 z-10 p-1.5 rounded-md cursor-pointer hover:bg-slate-100"
              >
                {selectedPlantIds.has(plant.id) ? (
                  <CheckSquare className="w-4 h-4 text-green-700" />
                ) : (
                  <Square className="w-4 h-4 text-slate-300 group-hover:text-slate-500" />
                )}
              </div>

              <PlantQrCard
                plant={plant}
                size={110}
                showActions={true}
                onPrint={() => triggerPrintPlant(plant)}
                onSelect={() => {
                  setSelectedPlant(plant);
                  setIsDetailOpen(true);
                }}
              />
            </div>
          ))}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b text-slate-600 font-semibold uppercase">
              <tr>
                <th className="p-3 w-10"></th>
                <th className="p-3">Plant Tag / QR</th>
                <th className="p-3">Type</th>
                <th className="p-3">Variety</th>
                <th className="p-3">Mother Lineage</th>
                <th className="p-3">Stage</th>
                <th className="p-3">Location</th>
                <th className="p-3">Planted</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPlants.map((plant) => (
                <tr
                  key={plant.id}
                  onClick={() => {
                    setSelectedPlant(plant);
                    setIsDetailOpen(true);
                  }}
                  className="hover:bg-slate-50 cursor-pointer"
                >
                  <td
                    className="p-3"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSelectPlant(plant.id);
                    }}
                  >
                    {selectedPlantIds.has(plant.id) ? (
                      <CheckSquare className="w-4 h-4 text-green-700" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-300" />
                    )}
                  </td>
                  <td className="p-3 font-mono font-bold text-slate-900">{plant.tag}</td>
                  <td className="p-3">
                    {plant.type === "MOTHER" && (
                      <Badge className="bg-purple-600 text-white text-[10px]">Mother</Badge>
                    )}
                    {plant.type === "CLONE" && (
                      <Badge className="bg-blue-600 text-white text-[10px]">Sub-Clone</Badge>
                    )}
                    {plant.type === "SEEDLING" && (
                      <Badge className="bg-green-600 text-white text-[10px]">Seedling</Badge>
                    )}
                  </td>
                  <td className="p-3 font-semibold text-slate-800">{plant.variety}</td>
                  <td className="p-3 font-mono text-purple-700">
                    {plant.motherTag ? `From ${plant.motherTag} (#${plant.cloneIndex})` : "—"}
                  </td>
                  <td className="p-3">
                    <Badge variant="outline" className="text-[10px]">
                      {plant.stage}
                    </Badge>
                  </td>
                  <td className="p-3">{plant.field}</td>
                  <td className="p-3 text-slate-500">{plant.plantingDate}</td>
                  <td className="p-3 text-right space-x-1" onClick={(e) => e.stopPropagation()}>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => triggerPrintPlant(plant)}
                      className="h-7 px-2"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedPlant(plant);
                        setIsDetailOpen(true);
                      }}
                      className="h-7 px-2 text-xs"
                    >
                      Manage
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      <QrScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanResult={handleScanResult}
      />

      <CreatePlantModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        mothersList={mothersList}
        defaultType={createType}
        onPlantCreated={(newPlants) => {
          setPlants((prev) => [...newPlants, ...prev]);
          triggerPrintBatch(newPlants);
        }}
      />

      <PlantDetailModal
        plant={selectedPlant}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onPlantUpdated={(updated) => {
          setSelectedPlant(updated);
          setPlants((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
        }}
        onPrintPlant={triggerPrintPlant}
        onPrintBatch={triggerPrintBatch}
        onSelectAnotherPlant={async (tagOrId) => {
          const p = await getPlantByTagOrQr(tagOrId);
          if (p) setSelectedPlant(p);
        }}
      />

      <PrintableQrSheetModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        plants={printSheetPlants}
      />
    </div>
  );
}

