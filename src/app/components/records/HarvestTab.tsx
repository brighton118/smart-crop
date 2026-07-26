import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "../ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Search, Plus, Loader2, Edit2, Trash2, Scissors } from "lucide-react";
import { supabase, DbCropBatch, DbHarvestRecord, DbPlantingRecord, DbZone } from "../../../lib/supabase";
import { toast } from "sonner";
import { useAuth } from "../../components/AuthProvider";

type HarvestRecordWithBatch = DbHarvestRecord & {
    batch: DbCropBatch & {
        zone: DbZone,
        plantingRecord: DbPlantingRecord
    }
};

export function HarvestTab() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [records, setRecords] = useState<HarvestRecordWithBatch[]>([]);
    const [activeBatches, setActiveBatches] = useState<(DbCropBatch & { zone: DbZone, plantingRecord: DbPlantingRecord })[]>([]);
    const [searchQuery, setSearchQuery] = useState("");

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState<HarvestRecordWithBatch | null>(null);

    const [formData, setFormData] = useState({
        batchId: "",
        plantsHarvested: "",
        freshWeight: "",
        dryWeight: "",
        qualityGrade: "",
        notes: "",
        responsiblePerson: "",
        harvestDate: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        if (user) {
            loadData();
        }
    }, [user]);

    async function loadData() {
        setLoading(true);
        try {
            // Fetch Active AND un-completed Batches that can still be harvested
            const { data: batchesData, error: batchesErr } = await supabase
                .from("CropBatch")
                .select(`*, zone:Zone(*), plantingRecord:PlantingRecord(*)`)
                .neq('status', 'COMPLETED');
            if (batchesErr) throw batchesErr;
            if (batchesData) setActiveBatches((batchesData as unknown) as any[]);

            // Fetch Harvest Records
            const { data: recordsData, error } = await supabase
                .from("HarvestRecord")
                .select(`
          *,
          batch:CropBatch(
            *,
            zone:Zone(*),
            plantingRecord:PlantingRecord(*)
          )
        `)
                .order("harvestDate", { ascending: false });

            if (error) throw error;
            setRecords((recordsData as unknown) as HarvestRecordWithBatch[]);
        } catch (err: any) {
            toast.error(err.message || "Failed to load harvest records");
        } finally {
            setLoading(false);
        }
    }

    const openNew = () => {
        setSelectedRecord(null);
        setFormData({
            batchId: activeBatches[0]?.id || "",
            plantsHarvested: "",
            freshWeight: "",
            dryWeight: "",
            qualityGrade: "Grade A",
            notes: "",
            responsiblePerson: user?.email || "",
            harvestDate: new Date().toISOString().split('T')[0]
        });
        setIsDialogOpen(true);
    };

    const openEdit = (record: HarvestRecordWithBatch) => {
        setSelectedRecord(record);
        setFormData({
            batchId: record.batchId,
            plantsHarvested: record.plantsHarvested?.toString() || "",
            freshWeight: record.freshWeight?.toString() || "",
            dryWeight: record.dryWeight?.toString() || "",
            qualityGrade: record.qualityGrade || "",
            notes: record.notes || "",
            responsiblePerson: record.responsiblePerson || "",
            harvestDate: new Date(record.harvestDate).toISOString().split('T')[0]
        });
        setIsDialogOpen(true);
    };

    const handleSave = async () => {
        if (!formData.batchId || !formData.harvestDate) {
            toast.error("Please fill in required fields (Batch, Dates)");
            return;
        }

        setLoading(true);
        try {
            if (selectedRecord) {
                const { error } = await supabase.from("HarvestRecord").update({
                    plantsHarvested: formData.plantsHarvested ? Number(formData.plantsHarvested) : null,
                    freshWeight: formData.freshWeight ? Number(formData.freshWeight) : null,
                    dryWeight: formData.dryWeight ? Number(formData.dryWeight) : null,
                    qualityGrade: formData.qualityGrade,
                    notes: formData.notes,
                    responsiblePerson: formData.responsiblePerson,
                    harvestDate: new Date(formData.harvestDate).toISOString(),
                    updatedAt: new Date().toISOString()
                }).eq("id", selectedRecord.id);
                if (error) throw error;
                toast.success("Harvest updated");

            } else {
                const { error } = await supabase.from("HarvestRecord").insert({
                    id: crypto.randomUUID(),
                    batchId: formData.batchId,
                    plantsHarvested: formData.plantsHarvested ? Number(formData.plantsHarvested) : null,
                    freshWeight: formData.freshWeight ? Number(formData.freshWeight) : null,
                    dryWeight: formData.dryWeight ? Number(formData.dryWeight) : null,
                    qualityGrade: formData.qualityGrade,
                    notes: formData.notes,
                    responsiblePerson: formData.responsiblePerson,
                    harvestDate: new Date(formData.harvestDate).toISOString(),
                    updatedAt: new Date().toISOString()
                });
                if (error) throw error;

                // Auto-update batch status to Harvested
                await supabase.from("CropBatch").update({ status: 'HARVESTED' }).eq('id', formData.batchId);

                toast.success("New Harvest log created");
            }
            setIsDialogOpen(false);
            loadData();
        } catch (err: any) {
            toast.error(err.message || "Failed to save");
        } finally {
            setLoading(false);
        }
    };

    const confirmDelete = (record: HarvestRecordWithBatch) => {
        setSelectedRecord(record);
        setIsDeleteDialogOpen(true);
    };

    const handleDelete = async () => {
        if (!selectedRecord) return;
        setLoading(true);
        try {
            const { error } = await supabase.from("HarvestRecord").delete().eq("id", selectedRecord.id);
            if (error) throw error;
            toast.success("Harvest Log deleted");
            setIsDeleteDialogOpen(false);
            loadData();
        } catch (err: any) {
            toast.error(err.message || "Failed to delete");
        } finally {
            setLoading(false);
        }
    };

    const totalHarvests = records.length;
    const harvestedBatches = new Set(records.map(r => r.batchId)).size;
    const totalFresh = records.reduce((acc, r) => acc + (r.freshWeight || 0), 0);
    const totalDry = records.reduce((acc, r) => acc + (r.dryWeight || 0), 0);

    const filteredData = records.filter(
        (entry) =>
            entry.batch?.batchName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            entry.batch?.plantingRecord?.strain.toLowerCase().includes(searchQuery.toLowerCase()) ||
            entry.qualityGrade?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-l-4 border-l-orange-500 shadow-sm">
                    <CardContent className="p-6 flex flex-col justify-center">
                        <p className="text-sm font-medium text-gray-600 mb-1">Total Harvests</p>
                        <p className="text-3xl font-bold text-gray-900">{totalHarvests}</p>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-amber-500 shadow-sm">
                    <CardContent className="p-6 flex flex-col justify-center">
                        <p className="text-sm font-medium text-gray-600 mb-1">Harvested Batches</p>
                        <p className="text-3xl font-bold text-gray-900">{harvestedBatches}</p>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-green-600 shadow-sm">
                    <CardContent className="p-6 flex flex-col justify-center">
                        <p className="text-sm font-medium text-gray-600 mb-1">Total Fresh Weight</p>
                        <p className="text-3xl font-bold text-gray-900">{totalFresh.toFixed(2)} kg</p>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-yellow-600 shadow-sm">
                    <CardContent className="p-6 flex flex-col justify-center">
                        <p className="text-sm font-medium text-gray-600 mb-1">Total Dry Weight</p>
                        <p className="text-3xl font-bold text-gray-900">{totalDry.toFixed(2)} kg</p>
                    </CardContent>
                </Card>
            </div>

            <Card className="shadow-sm border border-gray-200">
                <CardHeader className="border-b bg-gray-50/50">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <CardTitle className="text-lg text-gray-800">🌾 Harvest Records</CardTitle>
                        <div className="flex items-center gap-2">
                            <div className="relative w-full sm:w-64">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <Input placeholder="Search harvests..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 bg-white" />
                            </div>
                            <Button onClick={openNew} className="shrink-0 bg-orange-600 hover:bg-orange-700 text-white">
                                <Plus className="w-4 h-4 mr-2" />
                                New Harvest Record
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-gray-50">
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Batch</TableHead>
                                <TableHead>Strain</TableHead>
                                <TableHead>Fresh Wt</TableHead>
                                <TableHead>Dry Wt</TableHead>
                                <TableHead>Grade</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading && filteredData.length === 0 ? (
                                <TableRow><TableCell colSpan={7} className="text-center py-6"><Loader2 className="w-5 h-5 animate-spin mx-auto text-orange-600" /></TableCell></TableRow>
                            ) : filteredData.length === 0 ? (
                                <TableRow><TableCell colSpan={7} className="text-center py-8 text-gray-500"><Scissors className="w-10 h-10 mx-auto text-gray-300 mb-2" />No harvest records found.</TableCell></TableRow>
                            ) : (
                                filteredData.map((r) => (
                                    <TableRow key={r.id}>
                                        <TableCell>{new Date(r.harvestDate).toLocaleDateString()}</TableCell>
                                        <TableCell className="font-medium text-gray-900">{r.batch?.batchName || 'N/A'}</TableCell>
                                        <TableCell>{r.batch?.plantingRecord?.strain || 'N/A'}</TableCell>
                                        <TableCell className="font-medium text-green-700">{r.freshWeight ? `${r.freshWeight} kg` : '--'}</TableCell>
                                        <TableCell className="font-medium text-yellow-700">{r.dryWeight ? `${r.dryWeight} kg` : '--'}</TableCell>
                                        <TableCell>{r.qualityGrade || '--'}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button variant="ghost" size="icon" className="text-gray-500 hover:text-blue-600" onClick={() => openEdit(r)}><Edit2 className="w-4 h-4" /></Button>
                                                <Button variant="ghost" size="icon" className="text-gray-500 hover:text-red-600" onClick={() => confirmDelete(r)}><Trash2 className="w-4 h-4" /></Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Modal */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{selectedRecord ? "Edit Harvest" : "New Harvest"}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <label className="text-sm font-medium">Batch To Harvest <span className="text-red-500">*</span></label>
                                <Select value={formData.batchId} onValueChange={(v) => setFormData({ ...formData, batchId: v })} disabled={!!selectedRecord}>
                                    <SelectTrigger><SelectValue placeholder="Select Batch" /></SelectTrigger>
                                    <SelectContent>
                                        {activeBatches.map(b => (
                                            <SelectItem key={b.id} value={b.id}>{b.batchName} ({b.zone?.name})</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <label className="text-sm font-medium">Harvest Date <span className="text-red-500">*</span></label>
                                <Input type="date" value={formData.harvestDate} onChange={(e) => setFormData({ ...formData, harvestDate: e.target.value })} />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4 border p-3 rounded-md bg-gray-50/50">
                            <div className="grid gap-2">
                                <label className="text-xs font-medium uppercase text-gray-500">Plants Cut</label>
                                <Input type="number" min="0" placeholder="Qty" value={formData.plantsHarvested} onChange={(e) => setFormData({ ...formData, plantsHarvested: e.target.value })} />
                            </div>
                            <div className="grid gap-2">
                                <label className="text-xs font-medium uppercase text-gray-500">Fresh Wet Weight (kg)</label>
                                <Input type="number" step="0.01" min="0" placeholder="0.0" value={formData.freshWeight} onChange={(e) => setFormData({ ...formData, freshWeight: e.target.value })} />
                            </div>
                            <div className="grid gap-2">
                                <label className="text-xs font-medium uppercase text-gray-500">Dry Weight (kg)</label>
                                <Input type="number" step="0.01" min="0" placeholder="0.0" value={formData.dryWeight} onChange={(e) => setFormData({ ...formData, dryWeight: e.target.value })} />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <label className="text-sm font-medium">Quality Grade</label>
                                <Select value={formData.qualityGrade} onValueChange={(v) => setFormData({ ...formData, qualityGrade: v })}>
                                    <SelectTrigger><SelectValue placeholder="Grade" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Grade A Premium">Grade A Premium</SelectItem>
                                        <SelectItem value="Grade A">Grade A</SelectItem>
                                        <SelectItem value="Grade B">Grade B</SelectItem>
                                        <SelectItem value="Biomass">Biomass</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <label className="text-sm font-medium">Responsible Person</label>
                                <Input value={formData.responsiblePerson} onChange={(e) => setFormData({ ...formData, responsiblePerson: e.target.value })} placeholder="Name" />
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Harvest Notes</label>
                            <Input value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Trichome color, bud density, etc." />
                        </div>

                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSave} disabled={loading} className="bg-orange-600 hover:bg-orange-700 text-white">
                            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Save Harvest
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader><DialogTitle className="text-red-600">Delete Harvest Record</DialogTitle></DialogHeader>
                    <DialogDescription>Remove this harvest record? This won't delete the batch history.</DialogDescription>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={loading}>Delete Record</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
