import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "../ui/dialog";
import { Search, Plus, Loader2, Edit2, Trash2, PackageCheck, ClipboardList } from "lucide-react";
import { supabase, DbStoragePackagingRecord } from "../../../lib/supabase";
import { toast } from "sonner";
import { useAuth } from "../../components/AuthProvider";

export function StoragePackagingTab() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [records, setRecords] = useState<DbStoragePackagingRecord[]>([]);
    const [searchQuery, setSearchQuery] = useState("");

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState<DbStoragePackagingRecord | null>(null);

    const [formData, setFormData] = useState({
        date: new Date().toISOString().split("T")[0],
        variety: "",
        quantity: "",
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
                .from("StoragePackagingRecord")
                .select("*")
                .order("date", { ascending: false }) as any);

            if (error) throw error;
            setRecords(data || []);
        } catch (err: any) {
            toast.error(err.message || "Failed to load Storage & Packaging records");
        } finally {
            setLoading(false);
        }
    }

    const openNew = () => {
        setSelectedRecord(null);
        setFormData({
            date: new Date().toISOString().split("T")[0],
            variety: "",
            quantity: "",
        });
        setIsDialogOpen(true);
    };

    const openEdit = (record: DbStoragePackagingRecord) => {
        setSelectedRecord(record);
        setFormData({
            date: record.date ? new Date(record.date).toISOString().split("T")[0] : "",
            variety: record.variety || "",
            quantity: record.quantity?.toString() || "",
        });
        setIsDialogOpen(true);
    };

    const handleSave = async () => {
        if (!formData.date || !formData.variety) {
            toast.error("Please fill in Date, Variety, and Quantity");
            return;
        }

        const qty = Number(formData.quantity);
        if (isNaN(qty) || qty <= 0) {
            toast.error("Quantity must be a positive number");
            return;
        }

        setLoading(true);
        try {
            const payload = {
                date: new Date(formData.date).toISOString(),
                variety: formData.variety,
                quantity: qty,
                updatedAt: new Date().toISOString(),
            };

            if (selectedRecord) {
                const { error } = await supabase.from("StoragePackagingRecord").update(payload).eq("id", selectedRecord.id);
                if (error) throw error;
                toast.success("Storage & Packaging record updated");
            } else {
                const { error } = await supabase.from("StoragePackagingRecord").insert({
                    id: crypto.randomUUID(),
                    ...payload,
                    createdAt: new Date().toISOString(),
                });
                if (error) throw error;
                toast.success("Storage & Packaging record saved!");
            }
            setIsDialogOpen(false);
            loadData();
        } catch (err: any) {
            toast.error(err.message || "Failed to save Storage & Packaging record");
        } finally {
            setLoading(false);
        }
    };

    const confirmDelete = (record: DbStoragePackagingRecord) => {
        setSelectedRecord(record);
        setIsDeleteDialogOpen(true);
    };

    const handleDelete = async () => {
        if (!selectedRecord) return;
        setLoading(true);
        try {
            const { error } = await supabase.from("StoragePackagingRecord").delete().eq("id", selectedRecord.id);
            if (error) throw error;
            toast.success("Storage & Packaging record deleted");
            setIsDeleteDialogOpen(false);
            loadData();
        } catch (err: any) {
            toast.error(err.message || "Failed to delete");
        } finally {
            setLoading(false);
        }
    };

    const totalQuantity = records.reduce((acc, r) => acc + (Number(r.quantity) || 0), 0);

    const filteredData = records.filter((entry) =>
        (entry.variety || "").toLowerCase().includes(searchQuery.toLowerCase())
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
                            <p className="text-sm font-semibold text-slate-500 mb-0.5">Total Storage Records</p>
                            <p className="text-4xl font-bold text-slate-800">{records.length}</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-sm border-0 border-l-4 border-l-[#3b82f6] rounded-2xl bg-white/95 backdrop-blur-md">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div className="w-14 h-14 bg-[#eaf4fe] rounded-2xl flex items-center justify-center shrink-0">
                            <PackageCheck className="w-7 h-7 text-[#3b82f6]" />
                        </div>
                        <div className="flex flex-col items-end text-right">
                            <p className="text-sm font-semibold text-slate-500 mb-0.5">Total Packaged Quantity</p>
                            <p className="text-4xl font-bold text-slate-800">{totalQuantity}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card className="shadow-sm border border-gray-100 rounded-2xl bg-white/95 backdrop-blur-md overflow-hidden">
                <CardHeader className="border-b bg-white/50 p-5 px-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="bg-gray-100/80 p-2 rounded-lg">
                                <span role="img" aria-label="storage" className="text-xl">📦</span>
                            </div>
                            <CardTitle className="text-[1.15rem] font-bold text-slate-800 tracking-tight">Storage & Packaging Records</CardTitle>
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
                                New Storage Record
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
                                <TableHead className="font-semibold text-slate-600 px-6 py-4">Quantity</TableHead>
                                <TableHead className="font-semibold text-slate-600 text-right px-6 py-4">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading && filteredData.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-12">
                                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#0fa968]" />
                                    </TableCell>
                                </TableRow>
                            ) : filteredData.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-16 bg-white hover:bg-white">
                                        <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-4 border border-gray-100">
                                            <PackageCheck className="w-8 h-8 text-[#0fa968]" />
                                        </div>
                                        <p className="text-lg font-bold text-slate-800 mb-1">No Storage & Packaging records yet</p>
                                        <p className="text-sm text-slate-500">Record Date, Variety, and Quantity.</p>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredData.map((r, i) => (
                                    <TableRow key={r.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                                        <TableCell className="px-6 py-4 font-medium text-slate-700">{new Date(r.date).toLocaleDateString()}</TableCell>
                                        <TableCell className="px-6 py-4 font-medium text-slate-800">{r.variety}</TableCell>
                                        <TableCell className="px-6 py-4 font-semibold text-emerald-700">{r.quantity}</TableCell>
                                        <TableCell className="text-right px-6 py-4">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-blue-600 hover:bg-blue-50" onClick={() => openEdit(r)}>
                                                    <Edit2 className="w-4 h-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-red-600 hover:bg-red-50" onClick={() => confirmDelete(r)}>
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
                        <DialogTitle className="text-xl font-bold">{selectedRecord ? "Edit Storage & Packaging Record" : "Add Storage & Packaging Record"}</DialogTitle>
                        <DialogDescription className="text-slate-500">Record Date, Variety, and Quantity.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <label className="text-sm font-semibold text-slate-700">Date <span className="text-red-500">*</span></label>
                            <Input type="date" className="rounded-xl border-gray-200" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
                        </div>
                        <div className="grid gap-2">
                            <label className="text-sm font-semibold text-slate-700">Variety <span className="text-red-500">*</span></label>
                            <Input className="rounded-xl border-gray-200" value={formData.variety} onChange={(e) => setFormData({ ...formData, variety: e.target.value })} placeholder="e.g. Blue Dream" />
                        </div>
                        <div className="grid gap-2">
                            <label className="text-sm font-semibold text-slate-700">Quantity <span className="text-red-500">*</span></label>
                            <Input type="number" step="0.01" min="1" className="rounded-xl border-gray-200" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: e.target.value })} placeholder="e.g. 100" />
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
                            Are you sure you want to delete this Storage & Packaging record? This action cannot be undone.
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

