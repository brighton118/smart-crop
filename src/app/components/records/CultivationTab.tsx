import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "../ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Search, Plus, Loader2, Edit2, Trash2 } from "lucide-react";
import { supabase, DbCropBatch, DbCultivationRecord, DbPlantingRecord, DbZone } from "../../../lib/supabase";
import { toast } from "sonner";
import { useAuth } from "../../components/AuthProvider";

type CultivationRecordWithBatch = DbCultivationRecord & {
    batch: DbCropBatch & {
        zone: DbZone,
        plantingRecord: DbPlantingRecord
    }
};

export function CultivationTab() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [records, setRecords] = useState<CultivationRecordWithBatch[]>([]);
    const [activeBatches, setActiveBatches] = useState<(DbCropBatch & { zone: DbZone, plantingRecord: DbPlantingRecord })[]>([]);
    const [searchQuery, setSearchQuery] = useState("");

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState<CultivationRecordWithBatch | null>(null);

    const [formData, setFormData] = useState({
        batchId: "",
        growthStage: "",
        plantCount: "",
        healthStatus: "",
        irrigationStatus: "",
        nutrientInfo: "",
        envConditions: "",
        notes: "",
        responsiblePerson: "",
        recordDate: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        if (user) {
            loadData();
        }
    }, [user]);

    async function loadData() {
        setLoading(true);
        try {
            // Fetch Active Batches
            const { data: batchesData, error: batchesErr } = await supabase
                .from("CropBatch")
                .select(`*, zone:Zone(*), plantingRecord:PlantingRecord(*)`)
                .eq('status', 'ACTIVE');
            if (batchesErr) throw batchesErr;
            if (batchesData) setActiveBatches((batchesData as unknown) as any[]);

            // Fetch Cultivation Records
            const { data: recordsData, error } = await supabase
                .from("CultivationRecord")
                .select(`
          *,
          batch:CropBatch(
            *,
            zone:Zone(*),
            plantingRecord:PlantingRecord(*)
          )
        `)
                .order("recordDate", { ascending: false });

            if (error) throw error;
            setRecords((recordsData as unknown) as CultivationRecordWithBatch[]);
        } catch (err: any) {
            toast.error(err.message || "Failed to load cultivation records");
        } finally {
            setLoading(false);
        }
    }

    const openNew = () => {
        setSelectedRecord(null);
        setFormData({
            batchId: activeBatches[0]?.id || "",
            growthStage: "Vegetative",
            plantCount: "",
            healthStatus: "Healthy",
            irrigationStatus: "Adequate",
            nutrientInfo: "",
            envConditions: "",
            notes: "",
            responsiblePerson: user?.email || "",
            recordDate: new Date().toISOString().split('T')[0]
        });
        setIsDialogOpen(true);
    };

    const openEdit = (record: CultivationRecordWithBatch) => {
        setSelectedRecord(record);
        setFormData({
            batchId: record.batchId,
            growthStage: record.growthStage,
            plantCount: record.plantCount?.toString() || "",
            healthStatus: record.healthStatus || "",
            irrigationStatus: record.irrigationStatus || "",
            nutrientInfo: record.nutrientInfo || "",
            envConditions: record.envConditions || "",
            notes: record.notes || "",
            responsiblePerson: record.responsiblePerson || "",
            recordDate: new Date(record.recordDate).toISOString().split('T')[0]
        });
        setIsDialogOpen(true);
    };

    const handleSave = async () => {
        if (!formData.batchId || !formData.growthStage) {
            toast.error("Please fill in required fields (Batch, Growth Stage)");
            return;
        }

        setLoading(true);
        try {
            if (selectedRecord) {
                const { error } = await supabase.from("CultivationRecord").update({
                    growthStage: formData.growthStage,
                    plantCount: formData.plantCount ? Number(formData.plantCount) : null,
                    healthStatus: formData.healthStatus,
                    irrigationStatus: formData.irrigationStatus,
                    nutrientInfo: formData.nutrientInfo,
                    envConditions: formData.envConditions,
                    notes: formData.notes,
                    responsiblePerson: formData.responsiblePerson,
                    recordDate: new Date(formData.recordDate).toISOString(),
                    updatedAt: new Date().toISOString()
                }).eq("id", selectedRecord.id);

                if (error) throw error;
                toast.success("Cultivation log updated");
            } else {
                const { error } = await supabase.from("CultivationRecord").insert({
                    id: crypto.randomUUID(),
                    batchId: formData.batchId,
                    growthStage: formData.growthStage,
                    plantCount: formData.plantCount ? Number(formData.plantCount) : null,
                    healthStatus: formData.healthStatus,
                    irrigationStatus: formData.irrigationStatus,
                    nutrientInfo: formData.nutrientInfo,
                    envConditions: formData.envConditions,
                    notes: formData.notes,
                    responsiblePerson: formData.responsiblePerson,
                    recordDate: new Date(formData.recordDate).toISOString(),
                    updatedAt: new Date().toISOString()
                });

                if (error) throw error;
                toast.success("New Cultivation log created");
            }
            setIsDialogOpen(false);
            loadData();
        } catch (err: any) {
            toast.error(err.message || "Failed to save");
        } finally {
            setLoading(false);
        }
    };

    const confirmDelete = (record: CultivationRecordWithBatch) => {
        setSelectedRecord(record);
        setIsDeleteDialogOpen(true);
    };

    const handleDelete = async () => {
        if (!selectedRecord) return;
        setLoading(true);
        try {
            const { error } = await supabase.from("CultivationRecord").delete().eq("id", selectedRecord.id);
            if (error) throw error;
            toast.success("Log deleted");
            setIsDeleteDialogOpen(false);
            loadData();
        } catch (err: any) {
            toast.error(err.message || "Failed to delete");
        } finally {
            setLoading(false);
        }
    };

    const uniqueBatches = new Set(records.map(r => r.batchId)).size;
    const unhealthyCount = records.filter(r => r.healthStatus?.toLowerCase().includes("sick") || r.healthStatus?.toLowerCase().includes("attention") || r.healthStatus?.toLowerCase() === "poor").length;

    const filteredData = records.filter(
        (entry) =>
            entry.batch?.batchName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            entry.batch?.plantingRecord?.strain.toLowerCase().includes(searchQuery.toLowerCase()) ||
            entry.batch?.zone?.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-l-4 border-l-blue-500 shadow-sm">
                    <CardContent className="p-6 flex flex-col justify-center">
                        <p className="text-sm font-medium text-gray-600 mb-1">Batches Monitored</p>
                        <p className="text-3xl font-bold text-gray-900">{uniqueBatches}</p>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-emerald-500 shadow-sm">
                    <CardContent className="p-6 flex flex-col justify-center">
                        <p className="text-sm font-medium text-gray-600 mb-1">Healthy Logs</p>
                        <p className="text-3xl font-bold text-gray-900">{records.length - unhealthyCount}</p>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-amber-500 shadow-sm">
                    <CardContent className="p-6 flex flex-col justify-center">
                        <p className="text-sm font-medium text-gray-600 mb-1">Requires Attention</p>
                        <p className="text-3xl font-bold text-gray-900">{unhealthyCount}</p>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-gray-300 shadow-sm">
                    <CardContent className="p-6 flex flex-col justify-center">
                        <p className="text-sm font-medium text-gray-600 mb-1">Total Interventions</p>
                        <p className="text-3xl font-bold text-gray-900">{records.length}</p>
                    </CardContent>
                </Card>
            </div>

            <Card className="shadow-sm border border-gray-200">
                <CardHeader className="border-b bg-gray-50/50">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <CardTitle className="text-lg text-gray-800">🌿 Cultivation & Growth Logs</CardTitle>
                        <div className="flex items-center gap-2">
                            <div className="relative w-full sm:w-64">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <Input placeholder="Search logs..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 bg-white" />
                            </div>
                            <Button onClick={openNew} className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white">
                                <Plus className="w-4 h-4 mr-2" />
                                New Cultivation Log
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
                                <TableHead>Stage</TableHead>
                                <TableHead>Condition</TableHead>
                                <TableHead>Current Plants</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading && filteredData.length === 0 ? (
                                <TableRow><TableCell colSpan={6} className="text-center py-6"><Loader2 className="w-5 h-5 animate-spin mx-auto text-blue-600" /></TableCell></TableRow>
                            ) : filteredData.length === 0 ? (
                                <TableRow><TableCell colSpan={6} className="text-center py-8 text-gray-500">No cultivation logs found.</TableCell></TableRow>
                            ) : (
                                filteredData.map((r) => (
                                    <TableRow key={r.id}>
                                        <TableCell>{new Date(r.recordDate).toLocaleDateString()}</TableCell>
                                        <TableCell className="font-medium text-gray-900">{r.batch?.batchName || 'Unknown Batch'}</TableCell>
                                        <TableCell>{r.growthStage}</TableCell>
                                        <TableCell>
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${r.healthStatus?.toLowerCase().includes("healthy") ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>
                                                {r.healthStatus || 'N/A'}
                                            </span>
                                        </TableCell>
                                        <TableCell>{r.plantCount ? `${r.plantCount}` : '--'}</TableCell>
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
                        <DialogTitle>{selectedRecord ? "Edit Log" : "New Cultivation Log"}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <label className="text-sm font-medium">Target Batch <span className="text-red-500">*</span></label>
                                <Select value={formData.batchId} onValueChange={(v) => setFormData({ ...formData, batchId: v })} disabled={!!selectedRecord}>
                                    <SelectTrigger><SelectValue placeholder="Select Active Batch" /></SelectTrigger>
                                    <SelectContent>
                                        {activeBatches.map(b => (
                                            <SelectItem key={b.id} value={b.id}>{b.batchName} ({b.plantingRecord?.strain || 'Unknown Strain'})</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <label className="text-sm font-medium">Record Date <span className="text-red-500">*</span></label>
                                <Input type="date" value={formData.recordDate} onChange={(e) => setFormData({ ...formData, recordDate: e.target.value })} />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <label className="text-sm font-medium">Growth Stage <span className="text-red-500">*</span></label>
                                <Select value={formData.growthStage} onValueChange={(v) => setFormData({ ...formData, growthStage: v })}>
                                    <SelectTrigger><SelectValue placeholder="Stage" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Seedling">Seedling</SelectItem>
                                        <SelectItem value="Vegetative">Vegetative</SelectItem>
                                        <SelectItem value="Early Flowering">Early Flowering</SelectItem>
                                        <SelectItem value="Late Flowering">Late Flowering</SelectItem>
                                        <SelectItem value="Flushing">Flushing</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <label className="text-sm font-medium">Current Plant Count</label>
                                <Input type="number" min="0" placeholder="Qty" value={formData.plantCount} onChange={(e) => setFormData({ ...formData, plantCount: e.target.value })} />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <label className="text-sm font-medium">Health Status</label>
                                <Select value={formData.healthStatus} onValueChange={(v) => setFormData({ ...formData, healthStatus: v })}>
                                    <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Healthy">Healthy</SelectItem>
                                        <SelectItem value="Minor Issues">Minor Issues (Pests/Deficiency)</SelectItem>
                                        <SelectItem value="Needs Attention">Needs Attention</SelectItem>
                                        <SelectItem value="Poor">Poor</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <label className="text-sm font-medium">Irrigation Status</label>
                                <Input value={formData.irrigationStatus} onChange={(e) => setFormData({ ...formData, irrigationStatus: e.target.value })} placeholder="e.g. Medium wet, flushing..." />
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Nutrient Info</label>
                            <Input value={formData.nutrientInfo} onChange={(e) => setFormData({ ...formData, nutrientInfo: e.target.value })} placeholder="e.g. 5ml CalMag, 2ml Bloom" />
                        </div>

                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Observation Notes</label>
                            <Input value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Details..." />
                        </div>

                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSave} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white">
                            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Save Log
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader><DialogTitle className="text-red-600">Delete Log</DialogTitle></DialogHeader>
                    <DialogDescription>Remove this log? This won't delete the batch.</DialogDescription>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={loading}>Delete Log</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
