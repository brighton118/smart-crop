import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "../ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Search, Plus, Loader2, Edit2, Trash2, Droplet } from "lucide-react";
import { supabase, DbCropBatch, DbZone, DbSprayingRecord } from "../../../lib/supabase";
import { toast } from "sonner";
import { useAuth } from "../../components/AuthProvider";

type SprayingRecordWithBatch = DbSprayingRecord & { batch: DbCropBatch & { zone: DbZone } };

export function SprayingRecords() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [records, setRecords] = useState<SprayingRecordWithBatch[]>([]);
    const [searchQuery, setSearchQuery] = useState("");

    // For selecting batch
    const [activeBatches, setActiveBatches] = useState<(DbCropBatch & { zone: DbZone })[]>([]);

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState<SprayingRecordWithBatch | null>(null);

    const [formData, setFormData] = useState({
        batchId: "",
        date: new Date().toISOString().split('T')[0],
        field: "",
        chemicalUsed: "",
        time: "08:00"
    });

    useEffect(() => {
        if (user) {
            loadData();
            loadActiveBatches();
        }
    }, [user]);

    async function loadActiveBatches() {
        try {
            const { data: batchesCount, error: batchErr } = await (supabase
                .from("CropBatch")
                .select("*, zone:Zone(*)") as any);
            if (!batchErr && batchesCount) {
                // In a real app we'd filter for status active, matching DB
                setActiveBatches(batchesCount);
            }
        } catch (e) {
            console.error(e);
        }
    }

    async function loadData() {
        setLoading(true);
        try {
            const { data: recordsData, error } = await (supabase
                .from("SprayingRecord")
                .select("*")
                .order("date", { ascending: false }) as any);

            if (error) throw error;

            const { data: batchesData } = await (supabase.from("CropBatch").select("*") as any);

            const batchMap = new Map();
            if (batchesData) {
                batchesData.forEach((b: any) => batchMap.set(b.id, b));
            }

            const joinedData = (recordsData || []).map((record: any) => ({
                ...record,
                batch: batchMap.get(record.batchId) || null
            }));

            setRecords(joinedData as SprayingRecordWithBatch[]);
        } catch (err: any) {
            toast.error(err.message || "Failed to load spraying records");
        } finally {
            setLoading(false);
        }
    }

    const openNew = () => {
        setSelectedRecord(null);
        setFormData({
            batchId: activeBatches.length > 0 ? activeBatches[0].id : "",
            date: new Date().toISOString().split('T')[0],
            field: "",
            chemicalUsed: "",
            time: "08:00"
        });
        setIsDialogOpen(true);
    };

    const openEdit = (record: SprayingRecordWithBatch) => {
        setSelectedRecord(record);
        setFormData({
            batchId: record.batchId,
            date: new Date(record.date).toISOString().split('T')[0],
            field: record.field || "",
            chemicalUsed: record.chemicalUsed || "",
            time: record.time || "08:00"
        });
        setIsDialogOpen(true);
    };

    const handleSave = async () => {
        if (!formData.batchId || !formData.date || !formData.field || !formData.chemicalUsed || !formData.time) {
            toast.error("Please fill in required fields (Batch, Date, Field, Chemical Used, Time)");
            return;
        }

        setLoading(true);
        try {
            const payload = {
                batchId: formData.batchId,
                date: new Date(formData.date).toISOString(),
                field: formData.field,
                chemicalUsed: formData.chemicalUsed,
                time: formData.time,
                updatedAt: new Date().toISOString()
            };

            if (selectedRecord) {
                const { error } = await supabase.from("SprayingRecord").update(payload).eq("id", selectedRecord.id);
                if (error) throw error;
                toast.success("Spraying record updated");
            } else {
                const newId = crypto.randomUUID();
                const { error } = await supabase.from("SprayingRecord").insert({
                    id: newId,
                    ...payload,
                    createdAt: new Date().toISOString()
                });
                if (error) throw error;
                toast.success("New spraying record created successfully!");
            }
            setIsDialogOpen(false);
            loadData();
        } catch (err: any) {
            toast.error(err.message || "Failed to save");
        } finally {
            setLoading(false);
        }
    };

    const confirmDelete = (record: SprayingRecordWithBatch) => {
        setSelectedRecord(record);
        setIsDeleteDialogOpen(true);
    };

    const handleDelete = async () => {
        if (!selectedRecord) return;
        setLoading(true);
        try {
            const { error } = await supabase.from("SprayingRecord").delete().eq("id", selectedRecord.id);
            if (error) throw error;
            toast.success("Spraying record deleted");
            setIsDeleteDialogOpen(false);
            loadData();
        } catch (err: any) {
            toast.error(err.message || "Failed to delete");
        } finally {
            setLoading(false);
        }
    };

    const _totalSprayings = records.length;

    // Unique chemicals
    const _uniqueChemicals = new Set(records.map(r => r.chemicalUsed)).size;

    const filteredData = records.filter(
        (entry) => {
            return (entry.batch?.batchName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                (entry.field || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                (entry.chemicalUsed || "").toLowerCase().includes(searchQuery.toLowerCase());
        }
    );

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card className="border-l-4 border-l-blue-500 shadow-sm">
                    <CardContent className="p-6 flex flex-col justify-center">
                        <p className="text-sm font-medium text-gray-600 mb-1">Total Spraying Records</p>
                        <p className="text-3xl font-bold text-gray-900">{_totalSprayings}</p>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-purple-500 shadow-sm">
                    <CardContent className="p-6 flex flex-col justify-center">
                        <p className="text-sm font-medium text-gray-600 mb-1">Unique Chemicals Used</p>
                        <p className="text-3xl font-bold text-gray-900">{_uniqueChemicals}</p>
                    </CardContent>
                </Card>
            </div>

            <Card className="shadow-sm border border-gray-200">
                <CardHeader className="border-b bg-gray-50/50">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <CardTitle className="text-lg text-gray-800">💧 Spraying Logs</CardTitle>
                        <div className="flex items-center gap-2">
                            <div className="relative w-full sm:w-64">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <Input
                                    placeholder="Search chemical, field..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10 bg-white"
                                />
                            </div>
                            <Button onClick={openNew} className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white">
                                <Plus className="w-4 h-4 mr-2" />
                                Add Spraying Record
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-gray-50">
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Field</TableHead>
                                <TableHead>Chemical Used</TableHead>
                                <TableHead>Time</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading && filteredData.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-6">
                                        <Loader2 className="w-5 h-5 animate-spin mx-auto text-blue-600" />
                                    </TableCell>
                                </TableRow>
                            ) : filteredData.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                                        <Droplet className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                                        No spraying records yet.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredData.map((r) => (
                                    <TableRow key={r.id}>
                                        <TableCell>{new Date(r.date).toLocaleDateString()}</TableCell>
                                        <TableCell>{r.field}</TableCell>
                                        <TableCell>{r.chemicalUsed}</TableCell>
                                        <TableCell>
                                            <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-md text-xs font-semibold">
                                                {r.time}
                                            </span>
                                        </TableCell>
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

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{selectedRecord ? "Edit Spraying Record" : "Add Spraying Record"}</DialogTitle>
                        <DialogDescription>Log spraying details for cultivation batches.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Batch <span className="text-red-500">*</span></label>
                            <Select value={formData.batchId} onValueChange={(v) => setFormData({ ...formData, batchId: v })}>
                                <SelectTrigger><SelectValue placeholder="Select Batch" /></SelectTrigger>
                                <SelectContent>
                                    {activeBatches.map(b => (
                                        <SelectItem key={b.id} value={b.id}>{b.batchName}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <label className="text-sm font-medium">Date <span className="text-red-500">*</span></label>
                                <Input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
                            </div>
                            <div className="grid gap-2">
                                <label className="text-sm font-medium">Time <span className="text-red-500">*</span></label>
                                <Input type="time" value={formData.time} onChange={(e) => setFormData({ ...formData, time: e.target.value })} />
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Field <span className="text-red-500">*</span></label>
                            <Input value={formData.field} onChange={(e) => setFormData({ ...formData, field: e.target.value })} placeholder="e.g. Field 1" />
                        </div>
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Chemical Used <span className="text-red-500">*</span></label>
                            <Input value={formData.chemicalUsed} onChange={(e) => setFormData({ ...formData, chemicalUsed: e.target.value })} placeholder="e.g. Neem Oil" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSave} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white">
                            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Save Record
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="text-red-600">Confirm Deletion</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete this spraying record? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
