import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "../ui/dialog";
import { Search, Plus, Loader2, Edit2, Trash2, Sprout, ClipboardList } from "lucide-react";
import { supabase, DbCloningRecord } from "../../../lib/supabase";
import { toast } from "sonner";
import { useAuth } from "../../components/AuthProvider";

export function CloningRecords() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [records, setRecords] = useState<DbCloningRecord[]>([]);
    const [searchQuery, setSearchQuery] = useState("");

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState<DbCloningRecord | null>(null);

    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        variety: "",
        number_of_clones: "",
        planted_quantity: ""
    });

    useEffect(() => {
        if (user) {
            loadData();
        }
    }, [user]);

    async function loadData() {
        setLoading(true);
        try {
            const { data, error } = await (supabase
                .from("CloningRecord")
                .select("*")
                .order("date", { ascending: false }) as any);

            if (error) throw error;
            setRecords(data || []);
        } catch (err: any) {
            toast.error(err.message || "Failed to load cloning records");
        } finally {
            setLoading(false);
        }
    }

    const openNew = () => {
        setSelectedRecord(null);
        setFormData({
            date: new Date().toISOString().split('T')[0],
            variety: "",
            number_of_clones: "",
            planted_quantity: ""
        });
        setIsDialogOpen(true);
    };

    const openEdit = (record: DbCloningRecord) => {
        setSelectedRecord(record);
        setFormData({
            date: new Date(record.date).toISOString().split('T')[0],
            variety: record.variety || "",
            number_of_clones: record.number_of_clones?.toString() || "",
            planted_quantity: record.planted_quantity?.toString() || ""
        });
        setIsDialogOpen(true);
    };

    const handleSave = async () => {
        if (!formData.date || !formData.variety) {
            toast.error("Please fill in required fields (Date, Variety)");
            return;
        }

        const numClones = Number(formData.number_of_clones);
        const plantedQty = Number(formData.planted_quantity);

        if (isNaN(numClones) || numClones <= 0) {
            toast.error("Number of clones must be a positive number");
            return;
        }
        if (isNaN(plantedQty) || plantedQty < 0) {
            toast.error("Planted quantity cannot be negative");
            return;
        }
        if (plantedQty > numClones) {
            toast.error("Planted quantity cannot exceed number of clones");
            return;
        }

        setLoading(true);
        try {
            const payload = {
                batchId: "no-batch",
                date: new Date(formData.date).toISOString(),
                variety: formData.variety,
                number_of_clones: numClones,
                planted_quantity: plantedQty,
                updatedAt: new Date().toISOString()
            };

            if (selectedRecord) {
                const { error } = await supabase.from("CloningRecord").update(payload).eq("id", selectedRecord.id);
                if (error) throw error;
                toast.success("Cloning record updated");
            } else {
                const newId = crypto.randomUUID();
                const { error } = await supabase.from("CloningRecord").insert({
                    id: newId,
                    ...payload,
                    createdAt: new Date().toISOString()
                });
                if (error) throw error;
                toast.success("New cloning record created successfully!");
            }
            setIsDialogOpen(false);
            loadData();
        } catch (err: any) {
            toast.error(err.message || "Failed to save");
        } finally {
            setLoading(false);
        }
    };

    const confirmDelete = (record: DbCloningRecord) => {
        setSelectedRecord(record);
        setIsDeleteDialogOpen(true);
    };

    const handleDelete = async () => {
        if (!selectedRecord) return;
        setLoading(true);
        try {
            const { error } = await supabase.from("CloningRecord").delete().eq("id", selectedRecord.id);
            if (error) throw error;
            toast.success("Cloning record deleted");
            setIsDeleteDialogOpen(false);
            loadData();
        } catch (err: any) {
            toast.error(err.message || "Failed to delete");
        } finally {
            setLoading(false);
        }
    };

    const totalPlanted = records.reduce((acc, r) => acc + (r.planted_quantity || 0), 0);

    const filteredData = records.filter(
        (entry) => {
            return (entry.variety || "").toLowerCase().includes(searchQuery.toLowerCase());
        }
    );

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full lg:w-2/3">
                <Card className="shadow-sm border-0 border-l-4 border-l-[#0fa968] rounded-2xl bg-white/95 backdrop-blur-md">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div className="w-14 h-14 bg-[#e6f4ed] rounded-2xl flex items-center justify-center shrink-0">
                            <ClipboardList className="w-7 h-7 text-[#0fa968]" />
                        </div>
                        <div className="flex flex-col items-end text-right">
                            <p className="text-sm font-semibold text-slate-500 mb-0.5">Total Records</p>
                            <p className="text-4xl font-bold text-slate-800">{records.length}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="shadow-sm border-0 border-l-4 border-l-[#3b82f6] rounded-2xl bg-white/95 backdrop-blur-md">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div className="w-14 h-14 bg-[#eaf4fe] rounded-2xl flex items-center justify-center shrink-0">
                            <Sprout className="w-7 h-7 text-[#3b82f6]" />
                        </div>
                        <div className="flex flex-col items-end text-right">
                            <p className="text-sm font-semibold text-slate-500 mb-0.5">Total Clones Planted</p>
                            <p className="text-4xl font-bold text-slate-800">{totalPlanted}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card className="shadow-sm border border-gray-100 rounded-2xl bg-white/95 backdrop-blur-md overflow-hidden">
                <CardHeader className="border-b bg-white/50 p-5 px-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="bg-gray-100/80 p-2 rounded-lg">
                                <span role="img" aria-label="plant" className="text-xl">🪴</span>
                            </div>
                            <CardTitle className="text-[1.15rem] font-bold text-slate-800 tracking-tight">Cloning Records</CardTitle>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="relative w-full sm:w-64">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <Input
                                    placeholder="Search variety..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9 bg-gray-50 border-gray-200 focus-visible:ring-emerald-500 rounded-xl"
                                />
                            </div>
                            <Button onClick={openNew} className="shrink-0 bg-[#0fa968] hover:bg-emerald-700 text-white rounded-xl shadow-sm px-5 font-semibold">
                                <Plus className="w-4 h-4 mr-2" />
                                New Record
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0 bg-white/50">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-b border-gray-100 hover:bg-transparent">
                                <TableHead className="font-semibold text-slate-600 px-6 py-4">Date</TableHead>
                                <TableHead className="font-semibold text-slate-600 px-6 py-4">Variety</TableHead>
                                <TableHead className="font-semibold text-slate-600 px-6 py-4">No. of Clones</TableHead>
                                <TableHead className="font-semibold text-slate-600 px-6 py-4">Planted</TableHead>
                                <TableHead className="font-semibold text-slate-600 text-right px-6 py-4">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading && filteredData.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-12">
                                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#0fa968]" />
                                    </TableCell>
                                </TableRow>
                            ) : filteredData.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-16 bg-white hover:bg-white">
                                        <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-4 border border-gray-100">
                                            <Sprout className="w-8 h-8 text-[#0fa968]" />
                                        </div>
                                        <p className="text-lg font-bold text-slate-800 mb-1">No cloning records yet</p>
                                        <p className="text-sm text-slate-500">Add your first cloning record to get started.</p>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredData.map((r, i) => (
                                    <TableRow key={r.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                                        <TableCell className="px-6 py-4 font-medium text-slate-700">{new Date(r.date).toLocaleDateString()}</TableCell>
                                        <TableCell className="px-6 py-4 font-medium text-slate-700">{r.variety}</TableCell>
                                        <TableCell className="px-6 py-4 text-slate-600">{r.number_of_clones}</TableCell>
                                        <TableCell className="px-6 py-4 text-slate-600">{r.planted_quantity}</TableCell>
                                        <TableCell className="text-right px-6 py-4">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" onClick={() => openEdit(r)}>
                                                    <Edit2 className="w-4 h-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors" onClick={() => confirmDelete(r)}>
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
                <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold">{selectedRecord ? "Edit Cloning Record" : "Add Cloning Record"}</DialogTitle>
                        <DialogDescription className="text-slate-500">Manage plant varieties and cloning quantities.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-5 py-4">
                        <div className="grid gap-2">
                            <label className="text-sm font-semibold text-slate-700">Date <span className="text-red-500">*</span></label>
                            <Input type="date" className="rounded-xl border-gray-200" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
                        </div>
                        <div className="grid gap-2">
                            <label className="text-sm font-semibold text-slate-700">Variety <span className="text-red-500">*</span></label>
                            <Input value={formData.variety} className="rounded-xl border-gray-200" onChange={(e) => setFormData({ ...formData, variety: e.target.value })} placeholder="e.g. Blue Dream" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <label className="text-sm font-semibold text-slate-700">No. of Clones <span className="text-red-500">*</span></label>
                                <Input type="number" className="rounded-xl border-gray-200" min="1" value={formData.number_of_clones} onChange={(e) => setFormData({ ...formData, number_of_clones: e.target.value })} />
                            </div>
                            <div className="grid gap-2">
                                <label className="text-sm font-semibold text-slate-700">Planted <span className="text-red-500">*</span></label>
                                <Input type="number" className="rounded-xl border-gray-200" min="0" value={formData.planted_quantity} onChange={(e) => setFormData({ ...formData, planted_quantity: e.target.value })} />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" className="rounded-xl font-semibold text-slate-600" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSave} disabled={loading} className="bg-[#0fa968] hover:bg-emerald-700 text-white rounded-xl shadow-sm px-6 font-semibold">
                            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Save Record
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent className="sm:max-w-[425px] rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-red-600 font-bold">Confirm Deletion</DialogTitle>
                        <DialogDescription className="text-slate-600">
                            Are you sure you want to delete this cloning record? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-4">
                        <Button variant="outline" className="rounded-xl font-semibold" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
                        <Button variant="destructive" className="rounded-xl font-semibold px-6" onClick={handleDelete} disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
