import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Search, Plus, Loader2, Leaf, Edit2, Trash2, AlertCircle } from "lucide-react";
import { useAuth } from "../components/AuthProvider";
import { supabase, DbCropRecord, DbZone } from "../../lib/supabase";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

export function Records() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [records, setRecords] = useState<DbCropRecord[]>([]);
  const [zones, setZones] = useState<Map<string, DbZone>>(new Map());

  // Form State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<DbCropRecord | null>(null);
  const [formData, setFormData] = useState({
    batchName: "",
    strain: "",
    zoneId: "",
    status: "SEEDLING" as DbCropRecord["status"],
    plantedDate: new Date().toISOString().split('T')[0],
    seedCount: "" as string | number,
    harvestWeight: "" as string | number,
    yield: "" as string | number,
    notes: ""
  });

  // Delete State
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<DbCropRecord | null>(null);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  async function loadData() {
    setLoading(true);
    setError(null);

    try {
      const { data: zonesData, error: zonesError } = await supabase.from("Zone").select("*");
      if (zonesError) throw zonesError;

      const zonesMap = new Map<string, DbZone>();
      if (zonesData) {
        zonesData.forEach(z => {
          zonesMap.set(z.id, z);
        });
      }
      setZones(zonesMap);

      const { data: recordsData, error: recordsError } = await supabase
        .from("CropRecord")
        .select("*")
        .order("createdAt", { ascending: false });

      if (recordsError) {
        if (recordsError.code === "42P01" || recordsError.message?.includes("not found")) {
          setError("Database table 'CropRecord' not found. Please run the provided SQL schema in your Supabase dashboard.");
        } else {
          throw recordsError;
        }
      }

      if (recordsData) {
        setRecords(recordsData as DbCropRecord[]);
      }
    } catch (err: any) {
      console.error("Failed to load records:", err);
      setError(err.message || "An unexpected error occurred while loading records.");
    } finally {
      setLoading(false);
    }
  }

  const openNewBatch = () => {
    setEditingRecord(null);
    setFormData({
      batchName: "",
      strain: "",
      zoneId: Array.from(zones.keys())[0] || "",
      status: "SEEDLING",
      plantedDate: new Date().toISOString().split('T')[0],
      seedCount: "",
      harvestWeight: "",
      yield: "",
      notes: ""
    });
    setIsDialogOpen(true);
  };

  const openEditBatch = (record: DbCropRecord) => {
    setEditingRecord(record);
    setFormData({
      batchName: record.batchName,
      strain: record.strain,
      zoneId: record.zoneId,
      status: record.status,
      plantedDate: new Date(record.plantedDate).toISOString().split('T')[0],
      seedCount: record.seedCount || "",
      harvestWeight: record.harvestWeight || "",
      yield: record.yield || "",
      notes: record.notes || ""
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.batchName || !formData.strain || !formData.zoneId) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);
    const payload = {
      ...formData,
      seedCount: formData.seedCount === "" ? null : Number(formData.seedCount),
      harvestWeight: formData.harvestWeight === "" ? null : Number(formData.harvestWeight),
      yield: formData.yield === "" ? null : Number(formData.yield),
      plantedDate: new Date(formData.plantedDate).toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      if (editingRecord) {
        const { error } = await supabase
          .from("CropRecord")
          .update(payload)
          .eq("id", editingRecord.id);

        if (error) throw error;
        toast.success("Record updated successfully");
      } else {
        const { error } = await supabase
          .from("CropRecord")
          .insert([payload]);

        if (error) throw error;
        toast.success("New batch created successfully");
      }
      setIsDialogOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to save record");
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = (record: DbCropRecord) => {
    setRecordToDelete(record);
    setIsDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!recordToDelete) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from("CropRecord")
        .delete()
        .eq("id", recordToDelete.id);

      if (error) throw error;
      toast.success("Record deleted");
      loadData();
      setIsDeleteDialogOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete record");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "SEEDLING":
        return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200">{t("Seedling")}</Badge>;
      case "VEGETATIVE":
        return <Badge className="bg-green-500 text-white hover:bg-green-600">{t("Vegetative")}</Badge>;
      case "FLOWERING":
        return <Badge className="bg-purple-500 text-white hover:bg-purple-600">{t("Flowering")}</Badge>;
      case "GROWING":
        return <Badge className="bg-blue-500 text-white hover:bg-blue-600">{t("Growing")}</Badge>;
      case "HARVESTED":
        return <Badge variant="secondary">{t("Harvested")}</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const filteredData = records.filter(
    (entry) =>
      entry.batchName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.strain.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeRecords = records.filter(r => r.status !== "HARVESTED").length;
  const harvestedRecords = records.filter(r => r.status === "HARVESTED").length;
  const totalYield = records.reduce((acc, r) => acc + (r.harvestWeight || r.yield || 0), 0);

  if (loading && records.length === 0) {
    return <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (error) {
    return (
      <div className="p-8 max-w-2xl mx-auto flex flex-col items-center text-center space-y-4">
        <div className="p-3 bg-red-100 rounded-full">
          <AlertCircle className="w-8 h-8 text-red-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900">Connection Error</h2>
        <p className="text-gray-600">{error}</p>
        <div className="flex gap-4 mt-2">
          <Button onClick={() => loadData()}>
            Retry Connection
          </Button>
          <a href="/app/dashboard">
            <Button variant="outline">Back to Dashboard</Button>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">{t("Crop Records")}</h1>
          <p className="text-gray-600 mt-1">{t("Manage cultivation batches and harvest history")}</p>
        </div>
        <Button onClick={openNewBatch} className="shrink-0 bg-primary hover:bg-primary/90 text-white">
          <Plus className="w-4 h-4 mr-2" />
          New Batch
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-green-500 shadow-sm">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">{t("Active Batches")}</p>
                <p className="text-3xl font-bold text-gray-900">{activeRecords}</p>
              </div>
              <div className="p-2 bg-green-100 rounded-lg">
                <Leaf className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-gray-300 shadow-sm">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">{t("Harvested Batches")}</p>
                <p className="text-3xl font-bold text-gray-900">{harvestedRecords}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-primary shadow-sm">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">{t("Total Harvest")}</p>
                <p className="text-3xl font-bold text-gray-900">{totalYield.toFixed(2)} kg</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <Card className="shadow-sm border border-gray-200">
        <CardHeader className="border-b bg-gray-50/50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="text-lg text-gray-800">{t("Cultivation Batches")}</CardTitle>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search batches or strains..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="font-semibold text-gray-700">{t("Batch Name")}</TableHead>
                  <TableHead className="font-semibold text-gray-700">{t("Strain")}</TableHead>
                  <TableHead className="font-semibold text-gray-700">{t("Zone")}</TableHead>
                  <TableHead className="font-semibold text-gray-700">{t("Planted")}</TableHead>
                  <TableHead className="font-semibold text-gray-700">{t("Seeds/Clones")}</TableHead>
                  <TableHead className="font-semibold text-gray-700">{t("Status")}</TableHead>
                  <TableHead className="font-semibold text-gray-700">{t("Harvest (kg)")}</TableHead>
                  <TableHead className="text-right"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((entry) => (
                  <TableRow key={entry.id} className="hover:bg-gray-50/50 transition-colors">
                    <TableCell className="font-medium text-gray-900">{entry.batchName}</TableCell>
                    <TableCell className="text-gray-600">{entry.strain}</TableCell>
                    <TableCell className="text-gray-600">{zones.get(entry.zoneId)?.name || "Unknown Zone"}</TableCell>
                    <TableCell className="text-gray-600">
                      {new Date(entry.plantedDate).toLocaleDateString("en-US", { month: 'short', day: 'numeric', year: 'numeric' })}
                    </TableCell>
                    <TableCell className="text-gray-600">{entry.seedCount || "--"}</TableCell>
                    <TableCell>{getStatusBadge(entry.status)}</TableCell>
                    <TableCell className="text-gray-600 font-medium">{entry.harvestWeight ? `${entry.harvestWeight} kg` : "--"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2 pr-4">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-gray-500 hover:text-blue-600"
                          onClick={() => openEditBatch(entry)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-gray-500 hover:text-red-600"
                          onClick={() => confirmDelete(entry)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredData.length === 0 && (
            <div className="text-center py-12">
              <Leaf className="mx-auto h-12 w-12 text-gray-300 mb-3" />
              <h3 className="text-lg font-medium text-gray-900">{t("No batches found")}</h3>
              <p className="text-gray-500">{t("Get started by creating a new cultivation batch.")}</p>
              <Button onClick={openNewBatch} className="mt-4 bg-primary hover:bg-primary/90 text-white">
                <Plus className="w-4 h-4 mr-2" />
                New Batch
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingRecord ? "Edit Batch" : "New Cultivation Batch"}</DialogTitle>
            <DialogDescription>
              Enter the cultivation details. You can specify if adding seedlings and the number of seeds.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="batchName" className="text-sm font-medium">Batch Name</label>
              <Input
                id="batchName"
                placeholder="e.g. Batch A1"
                value={formData.batchName}
                onChange={(e) => setFormData({ ...formData, batchName: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="strain" className="text-sm font-medium">Strain / Genetic</label>
              <Input
                id="strain"
                placeholder="e.g. OG Kush"
                value={formData.strain}
                onChange={(e) => setFormData({ ...formData, strain: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="zone" className="text-sm font-medium">Facility Zone</label>
              <Select
                value={formData.zoneId}
                onValueChange={(val) => setFormData({ ...formData, zoneId: val })}
              >
                <SelectTrigger id="zone">
                  <SelectValue placeholder="Select zone" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from(zones.values()).map((zone) => (
                    <SelectItem key={zone.id} value={zone.id}>
                      {zone.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label htmlFor="status" className="text-sm font-medium">Initial Status</label>
                <Select
                  value={formData.status}
                  onValueChange={(val) => setFormData({ ...formData, status: val as any })}
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SEEDLING">Seedling</SelectItem>
                    <SelectItem value="VEGETATIVE">Vegetative</SelectItem>
                    <SelectItem value="FLOWERING">Flowering</SelectItem>
                    <SelectItem value="HARVESTED">Harvested</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <label htmlFor="plantedDate" className="text-sm font-medium">Date Planted</label>
                <Input
                  id="plantedDate"
                  type="date"
                  value={formData.plantedDate}
                  onChange={(e) => setFormData({ ...formData, plantedDate: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label htmlFor="seedCount" className="text-sm font-medium">Seeds / Clones Qty</label>
                <Input
                  id="seedCount"
                  type="number"
                  placeholder="e.g. 50"
                  value={formData.seedCount}
                  onChange={(e) => setFormData({ ...formData, seedCount: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="harvestWeight" className="text-sm font-medium">Harvest Weight (kg)</label>
                <Input
                  id="harvestWeight"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.harvestWeight}
                  onChange={(e) => setFormData({ ...formData, harvestWeight: e.target.value })}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <label htmlFor="notes" className="text-sm font-medium">Notes</label>
              <Input
                id="notes"
                placeholder="Nutrients, phenotype details, etc."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={loading} className="bg-primary text-white hover:bg-primary/90">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Confirm Deletion
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{recordToDelete?.batchName}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
