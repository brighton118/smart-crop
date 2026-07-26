import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "../ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Search, Plus, Loader2, Edit2, Trash2, Sprout } from "lucide-react";
import { supabase, DbCropBatch, DbPlantingRecord, DbZone } from "../../../lib/supabase";
import { toast } from "sonner";
import { useAuth } from "../../components/AuthProvider";

type PlantingRecordWithBatch = DbPlantingRecord & { batch: DbCropBatch & { zone: DbZone } };

export function PlantingTab() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [records, setRecords] = useState<PlantingRecordWithBatch[]>([]);
    const [zones, setZones] = useState<DbZone[]>([]);
    const [searchQuery, setSearchQuery] = useState("");

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState<PlantingRecordWithBatch | null>(null);

    const [formData, setFormData] = useState({
        batchName: "",
        zoneId: "",
        strain: "",
        plantedDate: new Date().toISOString().split('T')[0],
        seedCount: "",
        cloneCount: "",
        plantCount: "",
        plantingMethod: "",
        responsiblePerson: "",
        notes: ""
    });

    useEffect(() => {
        if (user) {
            loadData();
        }
    }, [user]);

    async function loadData() {
        setLoading(true);
        try {
            // Fetch Zones
            const { data: zonesData } = await supabase.from("Zone").select("*");
            if (zonesData) setZones(zonesData);

            // Fetch PlantingRecords with their associated Batch and Zone using supabase standard joining
            const { data: recordsData, error } = await supabase
                .from("PlantingRecord")
                .select(`
          *,
          batch:CropBatch(
            *,
            zone:Zone(*)
          )
        `)
                .order("plantedDate", { ascending: false });

            if (error) throw error;
            setRecords((recordsData as unknown) as PlantingRecordWithBatch[]);
        } catch (err: any) {
            toast.error(err.message || "Failed to load planting records");
        } finally {
            setLoading(false);
        }
    }

    const openNew = () => {
        setSelectedRecord(null);
        setFormData({
            batchName: "",
            zoneId: zones[0]?.id || "",
            strain: "",
            plantedDate: new Date().toISOString().split('T')[0],
            seedCount: "",
            cloneCount: "",
            plantCount: "",
            plantingMethod: "Direct Sowing", // default
            responsiblePerson: user?.email || "",
            notes: ""
        });
        setIsDialogOpen(true);
    };

    const openEdit = (record: PlantingRecordWithBatch) => {
        setSelectedRecord(record);
        setFormData({
            batchName: record.batch.batchName,
            zoneId: record.batch.zoneId,
            strain: record.strain,
            plantedDate: new Date(record.plantedDate).toISOString().split('T')[0],
            seedCount: record.seedCount?.toString() || "",
            cloneCount: record.cloneCount?.toString() || "",
            plantCount: record.plantCount?.toString() || "",
            plantingMethod: record.plantingMethod || "",
            responsiblePerson: record.responsiblePerson || "",
            notes: record.notes || ""
        });
        setIsDialogOpen(true);
    };

    const handleSave = async () => {
        if (!formData.batchName || !formData.strain || !formData.zoneId) {
            toast.error("Please fill in required fields (Batch Name, Strain, Zone)");
            return;
        }

        setLoading(true);
        try {
            if (selectedRecord) {
                // Edit existing
                const { error: batchErr } = await supabase.from("CropBatch").update({
                    batchName: formData.batchName,
                    zoneId: formData.zoneId,
                    updatedAt: new Date().toISOString()
                }).eq("id", selectedRecord.batchId);
                if (batchErr) throw batchErr;

                const { error: plantErr } = await supabase.from("PlantingRecord").update({
                    strain: formData.strain,
                    plantedDate: new Date(formData.plantedDate).toISOString(),
                    seedCount: formData.seedCount ? Number(formData.seedCount) : null,
                    cloneCount: formData.cloneCount ? Number(formData.cloneCount) : null,
                    plantCount: formData.plantCount ? Number(formData.plantCount) : null,
                    plantingMethod: formData.plantingMethod,
                    responsiblePerson: formData.responsiblePerson,
                    notes: formData.notes,
                    updatedAt: new Date().toISOString()
                }).eq("id", selectedRecord.id);
                if (plantErr) throw plantErr;

                toast.success("Planting record updated");
            } else {
                // Create new Batch + Planting Record
                const batchId = crypto.randomUUID();
                const plantingId = crypto.randomUUID();

                const { error: batchErr } = await supabase.from("CropBatch").insert({
                    id: batchId,
                    batchName: formData.batchName,
                    zoneId: formData.zoneId,
                    status: 'ACTIVE',
                    updatedAt: new Date().toISOString()
                });
                if (batchErr) throw batchErr;

                const { error: plantErr } = await supabase.from("PlantingRecord").insert({
                    id: plantingId,
                    batchId: batchId,
                    strain: formData.strain,
                    plantedDate: new Date(formData.plantedDate).toISOString(),
                    seedCount: formData.seedCount ? Number(formData.seedCount) : null,
                    cloneCount: formData.cloneCount ? Number(formData.cloneCount) : null,
                    plantCount: formData.plantCount ? Number(formData.plantCount) : null,
                    plantingMethod: formData.plantingMethod,
                    responsiblePerson: formData.responsiblePerson,
                    notes: formData.notes,
                    updatedAt: new Date().toISOString()
                });
                if (plantErr) throw plantErr;

                toast.success("New Planting Record created successfully!");
            }
            setIsDialogOpen(false);
            loadData();
        } catch (err: any) {
            toast.error(err.message || "Failed to save");
        } finally {
            setLoading(false);
        }
    };

    const confirmDelete = (record: PlantingRecordWithBatch) => {
        setSelectedRecord(record);
        setIsDeleteDialogOpen(true);
    };

    const handleDelete = async () => {
        if (!selectedRecord) return;
        setLoading(true);
        try {
            // Due to CASCADE ON DELETE in the DB, deleting the CropBatch will delete the PlantingRecord
            // Let's just delete the PlantingRecord, wait, we might want to delete the CropBatch entirely if it's just planted.
            // But let's be safe and just delete the CropBatch.
            const { error } = await supabase.from("CropBatch").delete().eq("id", selectedRecord.batchId);
            if (error) throw error;
            toast.success("Record deleted");
            setIsDeleteDialogOpen(false);
            loadData();
        } catch (err: any) {
            toast.error(err.message || "Failed to delete");
        } finally {
            setLoading(false);
        }
    };

    // derived stats
    const totalBatches = records.length;
    const activeBatches = records.filter(r => r.batch?.status === "ACTIVE").length;
    const totalPlants = records.reduce((acc, r) => acc + (r.plantCount || 0) + (r.seedCount || 0) + (r.cloneCount || 0), 0);

    const filteredData = records.filter(
        (entry) =>
            entry.batch?.batchName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            entry.strain.toLowerCase().includes(searchQuery.toLowerCase()) ||
            entry.batch?.zone?.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-l-4 border-l-emerald-500 shadow-sm">
                    <CardContent className="p-6 flex flex-col justify-center">
                        <p className="text-sm font-medium text-gray-600 mb-1">Total Planting Batches</p>
                        <p className="text-3xl font-bold text-gray-900">{totalBatches}</p>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-green-500 shadow-sm">
                    <CardContent className="p-6 flex flex-col justify-center">
                        <p className="text-sm font-medium text-gray-600 mb-1">Active Batches</p>
                        <p className="text-3xl font-bold text-gray-900">{activeBatches}</p>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-blue-500 shadow-sm">
                    <CardContent className="p-6 flex flex-col justify-center">
                        <p className="text-sm font-medium text-gray-600 mb-1">Total Seed/Plants</p>
                        <p className="text-3xl font-bold text-gray-900">{totalPlants}</p>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-amber-500 shadow-sm">
                    <CardContent className="p-6 flex flex-col justify-center">
                        <p className="text-sm font-medium text-gray-600 mb-1">Recent Activity</p>
                        <p className="text-md font-medium text-gray-900">
                            {records[0] ? new Date(records[0].plantedDate).toLocaleDateString() : 'N/A'}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Table */}
            <Card className="shadow-sm border border-gray-200">
                <CardHeader className="border-b bg-gray-50/50">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <CardTitle className="text-lg text-gray-800">🌱 Planting Records</CardTitle>
                        <div className="flex items-center gap-2">
                            <div className="relative w-full sm:w-64">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <Input
                                    placeholder="Search batches, strains..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10 bg-white"
                                />
                            </div>
                            <Button onClick={openNew} className="shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white">
                                <Plus className="w-4 h-4 mr-2" />
                                New Planting Record
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-gray-50">
                            <TableRow>
                                <TableHead>Batch</TableHead>
                                <TableHead>Strain</TableHead>
                                <TableHead>Zone</TableHead>
                                <TableHead>Planted Date</TableHead>
                                <TableHead>Total Count</TableHead>
                                <TableHead>Method</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading && filteredData.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-6">
                                        <Loader2 className="w-5 h-5 animate-spin mx-auto text-emerald-600" />
                                    </TableCell>
                                </TableRow>
                            ) : filteredData.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                                        <Sprout className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                                        No planting records found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredData.map((r) => (
                                    <TableRow key={r.id}>
                                        <TableCell className="font-medium text-gray-900">{r.batch?.batchName || 'N/A'}</TableCell>
                                        <TableCell>{r.strain}</TableCell>
                                        <TableCell>{r.batch?.zone?.name || 'N/A'}</TableCell>
                                        <TableCell>{new Date(r.plantedDate).toLocaleDateString()}</TableCell>
                                        <TableCell>
                                            {r.plantCount ? `${r.plantCount} Plants` : r.seedCount ? `${r.seedCount} Seeds` : r.cloneCount ? `${r.cloneCount} Clones` : '--'}
                                        </TableCell>
                                        <TableCell>{r.plantingMethod || '--'}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button variant="ghost" size="icon" className="text-gray-500 hover:text-blue-600" onClick={() => openEdit(r)}>
                                                    <Edit2 className="w-4 h-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="text-gray-500 hover:text-red-600" onClick={() => confirmDelete(r)}>
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Modal Data Entry */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{selectedRecord ? "Edit Planting Record" : "New Planting Record"}</DialogTitle>
                        <DialogDescription>Log the start of a new cultivation batch.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <label className="text-sm font-medium">Batch Name <span className="text-red-500">*</span></label>
                                <Input value={formData.batchName} onChange={(e) => setFormData({ ...formData, batchName: e.target.value })} placeholder="e.g. Batch 001" />
                            </div>
                            <div className="grid gap-2">
                                <label className="text-sm font-medium">Zone <span className="text-red-500">*</span></label>
                                <Select value={formData.zoneId} onValueChange={(v) => setFormData({ ...formData, zoneId: v })}>
                                    <SelectTrigger><SelectValue placeholder="Select Zone" /></SelectTrigger>
                                    <SelectContent>
                                        {zones.map(z => <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <label className="text-sm font-medium">Strain / Genetic <span className="text-red-500">*</span></label>
                                <Input value={formData.strain} onChange={(e) => setFormData({ ...formData, strain: e.target.value })} placeholder="e.g. Blue Dream" />
                            </div>
                            <div className="grid gap-2">
                                <label className="text-sm font-medium">Planting Date <span className="text-red-500">*</span></label>
                                <Input type="date" value={formData.plantedDate} onChange={(e) => setFormData({ ...formData, plantedDate: e.target.value })} />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4 border p-3 rounded-md bg-gray-50/50">
                            <div className="grid gap-2">
                                <label className="text-xs font-medium uppercase text-gray-500">Seeds</label>
                                <Input type="number" min="0" placeholder="Qty" value={formData.seedCount} onChange={(e) => setFormData({ ...formData, seedCount: e.target.value })} />
                            </div>
                            <div className="grid gap-2">
                                <label className="text-xs font-medium uppercase text-gray-500">Clones</label>
                                <Input type="number" min="0" placeholder="Qty" value={formData.cloneCount} onChange={(e) => setFormData({ ...formData, cloneCount: e.target.value })} />
                            </div>
                            <div className="grid gap-2">
                                <label className="text-xs font-medium uppercase text-gray-500">Mature Plants</label>
                                <Input type="number" min="0" placeholder="Qty" value={formData.plantCount} onChange={(e) => setFormData({ ...formData, plantCount: e.target.value })} />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <label className="text-sm font-medium">Method</label>
                                <Select value={formData.plantingMethod} onValueChange={(v) => setFormData({ ...formData, plantingMethod: v })}>
                                    <SelectTrigger><SelectValue placeholder="Method" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Direct Sowing">Direct Sowing</SelectItem>
                                        <SelectItem value="Transplanting">Transplanting</SelectItem>
                                        <SelectItem value="Cloning">Cloning</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <label className="text-sm font-medium">Responsible Person</label>
                                <Input value={formData.responsiblePerson} onChange={(e) => setFormData({ ...formData, responsiblePerson: e.target.value })} placeholder="Name" />
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Notes</label>
                            <Input value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Soil type, source details..." />
                        </div>

                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSave} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Save Record
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="text-red-600">Confirm Deletion</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete this planning record and the entire Batch <strong>{selectedRecord?.batch?.batchName}</strong>? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Delete Batch
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
