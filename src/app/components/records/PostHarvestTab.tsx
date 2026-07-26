import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "../ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Search, Plus, Loader2, Edit2, Trash2, PackageCheck } from "lucide-react";
import { supabase, DbPostHarvestRecord, DbHarvestRecord, DbCropBatch, DbZone, DbPlantingRecord } from "../../../lib/supabase";
import { toast } from "sonner";
import { useAuth } from "../../components/AuthProvider";

type HarvestWithBatch = DbHarvestRecord & {
    batch: DbCropBatch & {
        zone: DbZone,
        plantingRecord: DbPlantingRecord
    }
};

type PostHarvestWithHarvest = DbPostHarvestRecord & {
    harvest: HarvestWithBatch
}

export function PostHarvestTab() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [records, setRecords] = useState<PostHarvestWithHarvest[]>([]);
    const [availableHarvests, setAvailableHarvests] = useState<HarvestWithBatch[]>([]);
    const [searchQuery, setSearchQuery] = useState("");

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState<PostHarvestWithHarvest | null>(null);

    const [formData, setFormData] = useState({
        harvestId: "",
        dryingStartDate: "",
        curingStartDate: "",
        finalWeight: "",
        productStatus: "CURING",
        notes: "",
        responsiblePerson: ""
    });

    useEffect(() => {
        if (user) {
            loadData();
        }
    }, [user]);

    async function loadData() {
        setLoading(true);
        try {
            // Fetch Harvests that exist
            const { data: harvestData, error: harvestErr } = await supabase
                .from("HarvestRecord")
                .select(`
          *,
          batch:CropBatch(
            *,
            zone:Zone(*),
            plantingRecord:PlantingRecord(*)
          )
        `);
            if (harvestErr) throw harvestErr;
            if (harvestData) setAvailableHarvests((harvestData as unknown) as HarvestWithBatch[]);

            // Fetch Post-Harvest Records
            const { data: recordsData, error } = await supabase
                .from("PostHarvestRecord")
                .select(`
          *,
          harvest:HarvestRecord(
            *,
            batch:CropBatch(
              *,
              zone:Zone(*),
              plantingRecord:PlantingRecord(*)
            )
          )
        `)
                .order("createdAt", { ascending: false });

            if (error) throw error;
            setRecords((recordsData as unknown) as PostHarvestWithHarvest[]);
        } catch (err: any) {
            toast.error(err.message || "Failed to load post-harvest records");
        } finally {
            setLoading(false);
        }
    }

    const openNew = () => {
        setSelectedRecord(null);
        setFormData({
            harvestId: availableHarvests[0]?.id || "",
            dryingStartDate: new Date().toISOString().split('T')[0],
            curingStartDate: "",
            finalWeight: "",
            productStatus: "CURING",
            notes: "",
            responsiblePerson: user?.email || ""
        });
        setIsDialogOpen(true);
    };

    const openEdit = (record: PostHarvestWithHarvest) => {
        setSelectedRecord(record);
        setFormData({
            harvestId: record.harvestId,
            dryingStartDate: record.dryingStartDate ? new Date(record.dryingStartDate).toISOString().split('T')[0] : "",
            curingStartDate: record.curingStartDate ? new Date(record.curingStartDate).toISOString().split('T')[0] : "",
            finalWeight: record.finalWeight?.toString() || "",
            productStatus: record.productStatus || "CURING",
            notes: record.notes || "",
            responsiblePerson: record.responsiblePerson || ""
        });
        setIsDialogOpen(true);
    };

    const handleSave = async () => {
        if (!formData.harvestId) {
            toast.error("Please select a Harvest Record");
            return;
        }

        setLoading(true);
        try {
            if (selectedRecord) {
                const { error } = await supabase.from("PostHarvestRecord").update({
                    dryingStartDate: formData.dryingStartDate ? new Date(formData.dryingStartDate).toISOString() : null,
                    curingStartDate: formData.curingStartDate ? new Date(formData.curingStartDate).toISOString() : null,
                    finalWeight: formData.finalWeight ? Number(formData.finalWeight) : null,
                    productStatus: formData.productStatus,
                    notes: formData.notes,
                    responsiblePerson: formData.responsiblePerson,
                    updatedAt: new Date().toISOString()
                }).eq("id", selectedRecord.id);
                if (error) throw error;
                toast.success("Post-harvest record updated");

                // Keep batch status updated
                if (formData.productStatus === "PACKAGED") {
                    await supabase.from("CropBatch").update({ status: 'COMPLETED' }).eq('id', selectedRecord.harvest.batchId);
                }

            } else {
                const { error } = await supabase.from("PostHarvestRecord").insert({
                    id: crypto.randomUUID(),
                    harvestId: formData.harvestId,
                    dryingStartDate: formData.dryingStartDate ? new Date(formData.dryingStartDate).toISOString() : null,
                    curingStartDate: formData.curingStartDate ? new Date(formData.curingStartDate).toISOString() : null,
                    finalWeight: formData.finalWeight ? Number(formData.finalWeight) : null,
                    productStatus: formData.productStatus,
                    notes: formData.notes,
                    responsiblePerson: formData.responsiblePerson,
                    updatedAt: new Date().toISOString()
                });
                if (error) throw error;

                // Auto update based on status
                const selectedHarvest = availableHarvests.find(h => h.id === formData.harvestId);
                if (selectedHarvest) {
                    const newStatus = formData.productStatus === "PACKAGED" ? 'COMPLETED' : 'HARVESTED'; // Fallback
                    await supabase.from("CropBatch").update({ status: newStatus }).eq('id', selectedHarvest.batchId);
                }

                toast.success("New Post-harvest log created");
            }
            setIsDialogOpen(false);
            loadData();
        } catch (err: any) {
            toast.error(err.message || "Failed to save");
        } finally {
            setLoading(false);
        }
    };

    const confirmDelete = (record: PostHarvestWithHarvest) => {
        setSelectedRecord(record);
        setIsDeleteDialogOpen(true);
    };

    const handleDelete = async () => {
        if (!selectedRecord) return;
        setLoading(true);
        try {
            const { error } = await supabase.from("PostHarvestRecord").delete().eq("id", selectedRecord.id);
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

    const totalPackaged = records.filter(r => r.productStatus === "PACKAGED").length;
    const totalWeight = records.reduce((acc, r) => acc + (r.finalWeight || 0), 0);
    const activeProcesses = records.length - totalPackaged;

    const filteredData = records.filter(
        (entry) =>
            entry.harvest?.batch?.batchName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            entry.harvest?.batch?.plantingRecord?.strain.toLowerCase().includes(searchQuery.toLowerCase()) ||
            entry.productStatus?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card className="border-l-4 border-l-blue-500 shadow-sm">
                    <CardContent className="p-6 flex flex-col justify-center">
                        <p className="text-sm font-medium text-gray-600 mb-1">Total Packaged</p>
                        <p className="text-3xl font-bold text-gray-900">{totalPackaged}</p>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-indigo-500 shadow-sm">
                    <CardContent className="p-6 flex flex-col justify-center">
                        <p className="text-sm font-medium text-gray-600 mb-1">Active Curing Processes</p>
                        <p className="text-3xl font-bold text-gray-900">{activeProcesses}</p>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-emerald-600 shadow-sm">
                    <CardContent className="p-6 flex flex-col justify-center">
                        <p className="text-sm font-medium text-gray-600 mb-1">Total Final Weight</p>
                        <p className="text-3xl font-bold text-gray-900">{totalWeight.toFixed(2)} kg</p>
                    </CardContent>
                </Card>
            </div>

            <Card className="shadow-sm border border-gray-200">
                <CardHeader className="border-b bg-gray-50/50">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <CardTitle className="text-lg text-gray-800">📦 Post-Harvest Processes</CardTitle>
                        <div className="flex items-center gap-2">
                            <div className="relative w-full sm:w-64">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <Input placeholder="Search records..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 bg-white" />
                            </div>
                            <Button onClick={openNew} className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white">
                                <Plus className="w-4 h-4 mr-2" />
                                New Record
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
                                <TableHead>Drying Started</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Final Wt.</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading && filteredData.length === 0 ? (
                                <TableRow><TableCell colSpan={6} className="text-center py-6"><Loader2 className="w-5 h-5 animate-spin mx-auto text-blue-600" /></TableCell></TableRow>
                            ) : filteredData.length === 0 ? (
                                <TableRow><TableCell colSpan={6} className="text-center py-8 text-gray-500"><PackageCheck className="w-10 h-10 mx-auto text-gray-300 mb-2" />No post-harvest records found.</TableCell></TableRow>
                            ) : (
                                filteredData.map((r) => (
                                    <TableRow key={r.id}>
                                        <TableCell className="font-medium text-gray-900">{r.harvest?.batch?.batchName || 'N/A'}</TableCell>
                                        <TableCell>{r.harvest?.batch?.plantingRecord?.strain || 'N/A'}</TableCell>
                                        <TableCell>{r.dryingStartDate ? new Date(r.dryingStartDate).toLocaleDateString() : '--'}</TableCell>
                                        <TableCell>
                                            {r.productStatus === 'PACKAGED' ? (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                    {r.productStatus}
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                                    {r.productStatus || 'IN PROGRESS'}
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell className="font-medium text-emerald-700">{r.finalWeight ? `${r.finalWeight} kg` : '--'}</TableCell>
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
                        <DialogTitle>{selectedRecord ? "Edit Post-Harvest Record" : "New Post-Harvest Record"}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">

                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Source Harvest <span className="text-red-500">*</span></label>
                            <Select value={formData.harvestId} onValueChange={(v) => setFormData({ ...formData, harvestId: v })} disabled={!!selectedRecord}>
                                <SelectTrigger><SelectValue placeholder="Select a Harvest Record to process" /></SelectTrigger>
                                <SelectContent>
                                    {availableHarvests.map(h => (
                                        <SelectItem key={h.id} value={h.id}>
                                            {h.batch?.batchName} - {h.qualityGrade || 'No Grade'} ({new Date(h.harvestDate).toLocaleDateString()})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <label className="text-sm font-medium">Drying Start Date</label>
                                <Input type="date" value={formData.dryingStartDate} onChange={(e) => setFormData({ ...formData, dryingStartDate: e.target.value })} />
                            </div>
                            <div className="grid gap-2">
                                <label className="text-sm font-medium">Curing Start Date</label>
                                <Input type="date" value={formData.curingStartDate} onChange={(e) => setFormData({ ...formData, curingStartDate: e.target.value })} />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <label className="text-sm font-medium">Final Weight (kg)</label>
                                <Input type="number" step="0.01" min="0" placeholder="0.0" value={formData.finalWeight} onChange={(e) => setFormData({ ...formData, finalWeight: e.target.value })} />
                            </div>
                            <div className="grid gap-2">
                                <label className="text-sm font-medium">Product Status</label>
                                <Select value={formData.productStatus} onValueChange={(v) => setFormData({ ...formData, productStatus: v })}>
                                    <SelectTrigger><SelectValue placeholder="Select Status" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="DRYING">Drying</SelectItem>
                                        <SelectItem value="CURING">Curing</SelectItem>
                                        <SelectItem value="PACKAGED">Packaged</SelectItem>
                                        <SelectItem value="LOST">Lost/Destroyed</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Responsible Person</label>
                            <Input value={formData.responsiblePerson} onChange={(e) => setFormData({ ...formData, responsiblePerson: e.target.value })} placeholder="Name" />
                        </div>

                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Post-Harvest Notes</label>
                            <Input value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Drying conditions, trimming method, etc." />
                        </div>

                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSave} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white">
                            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Save Record
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader><DialogTitle className="text-red-600">Delete Post-Harvest Record</DialogTitle></DialogHeader>
                    <DialogDescription>Remove this post-harvest record?</DialogDescription>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={loading}>Delete Record</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
