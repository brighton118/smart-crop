import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "../ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Search, Plus, Loader2, Edit2, Trash2, Scissors, AlertTriangle, ClipboardList, Leaf } from "lucide-react";
import { supabase, DbVegetativeRecord, DbDiscardedRecord } from "../../../lib/supabase";
import { toast } from "sonner";
import { useAuth } from "../../components/AuthProvider";

export function VegetativeTab() {
    const { user } = useAuth();

    // --- Topping & Pruning State ---
    const [vegLoading, setVegLoading] = useState(true);
    const [vegRecords, setVegRecords] = useState<DbVegetativeRecord[]>([]);
    const [vegSearch, setVegSearch] = useState("");
    const [isVegDialogOpen, setIsVegDialogOpen] = useState(false);
    const [isVegDeleteOpen, setIsVegDeleteOpen] = useState(false);
    const [selectedVeg, setSelectedVeg] = useState<DbVegetativeRecord | null>(null);
    const [vegForm, setVegForm] = useState({
        toppingDate: new Date().toISOString().split("T")[0],
        pruningDate: new Date().toISOString().split("T")[0],
    });

    // --- Discarded State ---
    const [discLoading, setDiscLoading] = useState(true);
    const [discRecords, setDiscRecords] = useState<DbDiscardedRecord[]>([]);
    const [discSearch, setDiscSearch] = useState("");
    const [isDiscDialogOpen, setIsDiscDialogOpen] = useState(false);
    const [isDiscDeleteOpen, setIsDiscDeleteOpen] = useState(false);
    const [selectedDisc, setSelectedDisc] = useState<DbDiscardedRecord | null>(null);
    const [discForm, setDiscForm] = useState({
        date: new Date().toISOString().split("T")[0],
        variety: "",
        field: "Field 1",
        reason: "",
    });

    useEffect(() => {
        if (user) {
            loadVegData();
            loadDiscData();
        }
    }, [user]);

    // --- Topping & Pruning Handlers ---
    async function loadVegData() {
        setVegLoading(true);
        try {
            const { data, error } = await (supabase
                .from("VegetativeRecord")
                .select("*")
                .order("toppingDate", { ascending: false }) as any);
            if (error) throw error;
            setVegRecords(data || []);
        } catch (err: any) {
            toast.error(err.message || "Failed to load vegetative records");
        } finally {
            setVegLoading(false);
        }
    }

    const openNewVeg = () => {
        setSelectedVeg(null);
        setVegForm({
            toppingDate: new Date().toISOString().split("T")[0],
            pruningDate: new Date().toISOString().split("T")[0],
        });
        setIsVegDialogOpen(true);
    };

    const openEditVeg = (record: DbVegetativeRecord) => {
        setSelectedVeg(record);
        setVegForm({
            toppingDate: record.toppingDate ? new Date(record.toppingDate).toISOString().split("T")[0] : "",
            pruningDate: record.pruningDate ? new Date(record.pruningDate).toISOString().split("T")[0] : "",
        });
        setIsVegDialogOpen(true);
    };

    const handleSaveVeg = async () => {
        if (!vegForm.toppingDate || !vegForm.pruningDate) {
            toast.error("Please fill in Topping Date and Pruning Date");
            return;
        }

        setVegLoading(true);
        try {
            const payload = {
                toppingDate: new Date(vegForm.toppingDate).toISOString(),
                pruningDate: new Date(vegForm.pruningDate).toISOString(),
                updatedAt: new Date().toISOString(),
            };

            if (selectedVeg) {
                const { error } = await supabase.from("VegetativeRecord").update(payload).eq("id", selectedVeg.id);
                if (error) throw error;
                toast.success("Vegetative record updated");
            } else {
                const { error } = await supabase.from("VegetativeRecord").insert({
                    id: crypto.randomUUID(),
                    ...payload,
                    createdAt: new Date().toISOString(),
                });
                if (error) throw error;
                toast.success("Vegetative record saved!");
            }
            setIsVegDialogOpen(false);
            loadVegData();
        } catch (err: any) {
            toast.error(err.message || "Failed to save vegetative record");
        } finally {
            setVegLoading(false);
        }
    };

    const confirmDeleteVeg = (record: DbVegetativeRecord) => {
        setSelectedVeg(record);
        setIsVegDeleteOpen(true);
    };

    const handleDeleteVeg = async () => {
        if (!selectedVeg) return;
        setVegLoading(true);
        try {
            const { error } = await supabase.from("VegetativeRecord").delete().eq("id", selectedVeg.id);
            if (error) throw error;
            toast.success("Vegetative record deleted");
            setIsVegDeleteOpen(false);
            loadVegData();
        } catch (err: any) {
            toast.error(err.message || "Failed to delete");
        } finally {
            setVegLoading(false);
        }
    };

    // --- Discarded Handlers ---
    async function loadDiscData() {
        setDiscLoading(true);
        try {
            const { data, error } = await (supabase
                .from("DiscardedRecord")
                .select("*")
                .order("date", { ascending: false }) as any);
            if (error) throw error;
            setDiscRecords(data || []);
        } catch (err: any) {
            toast.error(err.message || "Failed to load discarded records");
        } finally {
            setDiscLoading(false);
        }
    }

    const openNewDisc = () => {
        setSelectedDisc(null);
        setDiscForm({
            date: new Date().toISOString().split("T")[0],
            variety: "",
            field: "Field 1",
            reason: "",
        });
        setIsDiscDialogOpen(true);
    };

    const openEditDisc = (record: DbDiscardedRecord) => {
        setSelectedDisc(record);
        setDiscForm({
            date: record.date ? new Date(record.date).toISOString().split("T")[0] : "",
            variety: record.variety || "",
            field: record.field || "Field 1",
            reason: record.reason || "",
        });
        setIsDiscDialogOpen(true);
    };

    const handleSaveDisc = async () => {
        if (!discForm.date || !discForm.variety || !discForm.field || !discForm.reason) {
            toast.error("Please fill in Date, Variety, Field, and Reason");
            return;
        }

        setDiscLoading(true);
        try {
            const payload = {
                date: new Date(discForm.date).toISOString(),
                variety: discForm.variety,
                field: discForm.field,
                reason: discForm.reason,
                updatedAt: new Date().toISOString(),
            };

            if (selectedDisc) {
                const { error } = await supabase.from("DiscardedRecord").update(payload).eq("id", selectedDisc.id);
                if (error) throw error;
                toast.success("Discarded record updated");
            } else {
                const { error } = await supabase.from("DiscardedRecord").insert({
                    id: crypto.randomUUID(),
                    ...payload,
                    createdAt: new Date().toISOString(),
                });
                if (error) throw error;
                toast.success("Discarded plant record saved!");
            }
            setIsDiscDialogOpen(false);
            loadDiscData();
        } catch (err: any) {
            toast.error(err.message || "Failed to save discarded record");
        } finally {
            setDiscLoading(false);
        }
    };

    const confirmDeleteDisc = (record: DbDiscardedRecord) => {
        setSelectedDisc(record);
        setIsDiscDeleteOpen(true);
    };

    const handleDeleteDisc = async () => {
        if (!selectedDisc) return;
        setDiscLoading(true);
        try {
            const { error } = await supabase.from("DiscardedRecord").delete().eq("id", selectedDisc.id);
            if (error) throw error;
            toast.success("Discarded record deleted");
            setIsDiscDeleteOpen(false);
            loadDiscData();
        } catch (err: any) {
            toast.error(err.message || "Failed to delete");
        } finally {
            setDiscLoading(false);
        }
    };

    const filteredVeg = vegRecords.filter((r) => {
        if (!vegSearch) return true;
        const topStr = r.toppingDate ? new Date(r.toppingDate).toLocaleDateString() : "";
        const prunStr = r.pruningDate ? new Date(r.pruningDate).toLocaleDateString() : "";
        return topStr.toLowerCase().includes(vegSearch.toLowerCase()) || prunStr.toLowerCase().includes(vegSearch.toLowerCase());
    });

    const filteredDisc = discRecords.filter((r) => {
        return (
            (r.variety || "").toLowerCase().includes(discSearch.toLowerCase()) ||
            (r.field || "").toLowerCase().includes(discSearch.toLowerCase()) ||
            (r.reason || "").toLowerCase().includes(discSearch.toLowerCase())
        );
    });

    return (
        <div className="space-y-8">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full lg:w-2/3">
                <Card className="shadow-sm border-0 border-l-4 border-l-[#0fa968] rounded-2xl bg-white/95 backdrop-blur-md">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div className="w-14 h-14 bg-[#e6f4ed] rounded-2xl flex items-center justify-center shrink-0">
                            <Scissors className="w-7 h-7 text-[#0fa968]" />
                        </div>
                        <div className="flex flex-col items-end text-right">
                            <p className="text-sm font-semibold text-slate-500 mb-0.5">Topping & Pruning Logs</p>
                            <p className="text-4xl font-bold text-slate-800">{vegRecords.length}</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-sm border-0 border-l-4 border-l-red-500 rounded-2xl bg-white/95 backdrop-blur-md">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center shrink-0">
                            <AlertTriangle className="w-7 h-7 text-red-500" />
                        </div>
                        <div className="flex flex-col items-end text-right">
                            <p className="text-sm font-semibold text-slate-500 mb-0.5">Discarded Records</p>
                            <p className="text-4xl font-bold text-slate-800">{discRecords.length}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="all" className="w-full">
                <div className="flex items-center justify-start mb-6">
                    <TabsList className="bg-white/95 backdrop-blur-md p-1.5 border border-gray-100 shadow-sm rounded-xl h-auto flex flex-wrap gap-1">
                        <TabsTrigger
                            value="all"
                            className="data-[state=active]:border-b-[3px] data-[state=active]:border-[#0fa968] data-[state=active]:rounded-none data-[state=active]:shadow-none data-[state=active]:text-slate-800 bg-transparent text-[#0fa968] px-5 py-2.5 font-bold flex items-center gap-2 hover:bg-gray-50/50 transition-colors"
                        >
                            <ClipboardList className="w-4 h-4" />
                            All Vegetative Records
                        </TabsTrigger>
                        <TabsTrigger
                            value="topping-pruning"
                            className="data-[state=active]:border-b-[3px] data-[state=active]:border-[#0fa968] data-[state=active]:rounded-none data-[state=active]:shadow-none data-[state=active]:text-slate-800 bg-transparent text-[#0fa968] px-5 py-2.5 font-bold flex items-center gap-2 hover:bg-gray-50/50 transition-colors"
                        >
                            <Scissors className="w-4 h-4" />
                            Topping & Pruning
                        </TabsTrigger>
                        <TabsTrigger
                            value="discarded"
                            className="data-[state=active]:border-b-[3px] data-[state=active]:border-[#0fa968] data-[state=active]:rounded-none data-[state=active]:shadow-none data-[state=active]:text-slate-800 bg-transparent text-[#0fa968] px-5 py-2.5 font-bold flex items-center gap-2 hover:bg-gray-50/50 transition-colors"
                        >
                            <AlertTriangle className="w-4 h-4" />
                            Discarded
                        </TabsTrigger>
                    </TabsList>
                </div>

                {/* ALL VIEW */}
                <TabsContent value="all" className="mt-0 outline-none space-y-8">
                    {renderToppingPruningCard()}
                    {renderDiscardedCard()}
                </TabsContent>

                {/* TOPPING & PRUNING ONLY */}
                <TabsContent value="topping-pruning" className="mt-0 outline-none">
                    {renderToppingPruningCard()}
                </TabsContent>

                {/* DISCARDED ONLY */}
                <TabsContent value="discarded" className="mt-0 outline-none">
                    {renderDiscardedCard()}
                </TabsContent>
            </Tabs>

            {/* Topping & Pruning Add/Edit Dialog */}
            <Dialog open={isVegDialogOpen} onOpenChange={setIsVegDialogOpen}>
                <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold">
                            {selectedVeg ? "Edit Topping & Pruning Record" : "Add Topping & Pruning Record"}
                        </DialogTitle>
                        <DialogDescription className="text-slate-500">
                            Record Topping Date and Pruning Date for the vegetative stage.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-5 py-4">
                        <div className="grid gap-2">
                            <label className="text-sm font-semibold text-slate-700">
                                Topping Date <span className="text-red-500">*</span>
                            </label>
                            <Input
                                type="date"
                                className="rounded-xl border-gray-200"
                                value={vegForm.toppingDate}
                                onChange={(e) => setVegForm({ ...vegForm, toppingDate: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <label className="text-sm font-semibold text-slate-700">
                                Pruning Date <span className="text-red-500">*</span>
                            </label>
                            <Input
                                type="date"
                                className="rounded-xl border-gray-200"
                                value={vegForm.pruningDate}
                                onChange={(e) => setVegForm({ ...vegForm, pruningDate: e.target.value })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" className="rounded-xl font-semibold text-slate-600" onClick={() => setIsVegDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSaveVeg} disabled={vegLoading} className="bg-[#0fa968] hover:bg-emerald-700 text-white rounded-xl shadow-sm px-6 font-semibold">
                            {vegLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Save Record
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Topping & Pruning Delete Dialog */}
            <Dialog open={isVegDeleteOpen} onOpenChange={setIsVegDeleteOpen}>
                <DialogContent className="sm:max-w-[425px] rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-red-600 font-bold">Confirm Deletion</DialogTitle>
                        <DialogDescription className="text-slate-600">
                            Are you sure you want to delete this topping & pruning record? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-4">
                        <Button variant="outline" className="rounded-xl font-semibold" onClick={() => setIsVegDeleteOpen(false)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" className="rounded-xl font-semibold px-6" onClick={handleDeleteVeg} disabled={vegLoading}>
                            {vegLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Discarded Add/Edit Dialog */}
            <Dialog open={isDiscDialogOpen} onOpenChange={setIsDiscDialogOpen}>
                <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold">
                            {selectedDisc ? "Edit Discarded Record" : "Add Discarded Record"}
                        </DialogTitle>
                        <DialogDescription className="text-slate-500">
                            Record Date, Variety, Field, and Reason under Discarded.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <label className="text-sm font-semibold text-slate-700">
                                Date <span className="text-red-500">*</span>
                            </label>
                            <Input
                                type="date"
                                className="rounded-xl border-gray-200"
                                value={discForm.date}
                                onChange={(e) => setDiscForm({ ...discForm, date: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <label className="text-sm font-semibold text-slate-700">
                                Variety <span className="text-red-500">*</span>
                            </label>
                            <Input
                                className="rounded-xl border-gray-200"
                                value={discForm.variety}
                                onChange={(e) => setDiscForm({ ...discForm, variety: e.target.value })}
                                placeholder="e.g. Sour Diesel"
                            />
                        </div>
                        <div className="grid gap-2">
                            <label className="text-sm font-semibold text-slate-700">
                                Field <span className="text-red-500">*</span>
                            </label>
                            <Input
                                list="discarded-fields"
                                className="rounded-xl border-gray-200"
                                value={discForm.field}
                                onChange={(e) => setDiscForm({ ...discForm, field: e.target.value })}
                                placeholder="e.g. Field 1"
                            />
                            <datalist id="discarded-fields">
                                <option value="Field 1" />
                                <option value="Field 2" />
                                <option value="Field 3" />
                                <option value="Greenhouse" />
                            </datalist>
                        </div>
                        <div className="grid gap-2">
                            <label className="text-sm font-semibold text-slate-700">
                                Reason <span className="text-red-500">*</span>
                            </label>
                            <Input
                                className="rounded-xl border-gray-200"
                                value={discForm.reason}
                                onChange={(e) => setDiscForm({ ...discForm, reason: e.target.value })}
                                placeholder="e.g. Stunted growth, nutrient burn, pest damage"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" className="rounded-xl font-semibold text-slate-600" onClick={() => setIsDiscDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSaveDisc} disabled={discLoading} className="bg-[#0fa968] hover:bg-emerald-700 text-white rounded-xl shadow-sm px-6 font-semibold">
                            {discLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Save Discarded Record
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Discarded Delete Dialog */}
            <Dialog open={isDiscDeleteOpen} onOpenChange={setIsDiscDeleteOpen}>
                <DialogContent className="sm:max-w-[425px] rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-red-600 font-bold">Confirm Deletion</DialogTitle>
                        <DialogDescription className="text-slate-600">
                            Are you sure you want to delete this discarded record? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-4">
                        <Button variant="outline" className="rounded-xl font-semibold" onClick={() => setIsDiscDeleteOpen(false)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" className="rounded-xl font-semibold px-6" onClick={handleDeleteDisc} disabled={discLoading}>
                            {discLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );

    function renderToppingPruningCard() {
        return (
            <Card className="shadow-sm border border-gray-100 rounded-2xl bg-white/95 backdrop-blur-md overflow-hidden">
                <CardHeader className="border-b bg-white/50 p-5 px-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="bg-emerald-50 p-2 rounded-lg">
                                <Scissors className="w-5 h-5 text-[#0fa968]" />
                            </div>
                            <CardTitle className="text-[1.15rem] font-bold text-slate-800 tracking-tight">
                                Vegetative — Topping & Pruning
                            </CardTitle>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="relative w-full sm:w-64">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <Input
                                    placeholder="Search dates..."
                                    value={vegSearch}
                                    onChange={(e) => setVegSearch(e.target.value)}
                                    className="pl-9 bg-gray-50 border-gray-200 focus-visible:ring-emerald-500 rounded-xl"
                                />
                            </div>
                            <Button onClick={openNewVeg} className="shrink-0 bg-[#0fa968] hover:bg-emerald-700 text-white rounded-xl shadow-sm px-5 font-semibold">
                                <Plus className="w-4 h-4 mr-2" />
                                Record Topping / Pruning
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0 bg-white/50">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-b border-gray-100 hover:bg-transparent">
                                <TableHead className="font-semibold text-slate-600 px-6 py-4">Topping Date</TableHead>
                                <TableHead className="font-semibold text-slate-600 px-6 py-4">Pruning Date</TableHead>
                                <TableHead className="font-semibold text-slate-600 text-right px-6 py-4">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {vegLoading && filteredVeg.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center py-12">
                                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#0fa968]" />
                                    </TableCell>
                                </TableRow>
                            ) : filteredVeg.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center py-14 bg-white hover:bg-white">
                                        <div className="w-14 h-14 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-3 border border-gray-100">
                                            <Leaf className="w-7 h-7 text-[#0fa968]" />
                                        </div>
                                        <p className="text-base font-bold text-slate-800 mb-1">No topping or pruning records yet</p>
                                        <p className="text-sm text-slate-500">Click "Record Topping / Pruning" to log Topping Date and Pruning Date.</p>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredVeg.map((r, i) => (
                                    <TableRow key={r.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                                        <TableCell className="px-6 py-4 font-medium text-slate-700">
                                            {r.toppingDate ? new Date(r.toppingDate).toLocaleDateString() : "--"}
                                        </TableCell>
                                        <TableCell className="px-6 py-4 font-medium text-slate-700">
                                            {r.pruningDate ? new Date(r.pruningDate).toLocaleDateString() : "--"}
                                        </TableCell>
                                        <TableCell className="text-right px-6 py-4">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-blue-600 hover:bg-blue-50" onClick={() => openEditVeg(r)}>
                                                    <Edit2 className="w-4 h-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-red-600 hover:bg-red-50" onClick={() => confirmDeleteVeg(r)}>
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
        );
    }

    function renderDiscardedCard() {
        return (
            <Card className="shadow-sm border border-gray-100 rounded-2xl bg-white/95 backdrop-blur-md overflow-hidden">
                <CardHeader className="border-b bg-white/50 p-5 px-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="bg-red-50 p-2 rounded-lg">
                                <AlertTriangle className="w-5 h-5 text-red-500" />
                            </div>
                            <CardTitle className="text-[1.15rem] font-bold text-slate-800 tracking-tight">
                                Discarded Plants
                            </CardTitle>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="relative w-full sm:w-64">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <Input
                                    placeholder="Search variety, field, reason..."
                                    value={discSearch}
                                    onChange={(e) => setDiscSearch(e.target.value)}
                                    className="pl-9 bg-gray-50 border-gray-200 focus-visible:ring-emerald-500 rounded-xl"
                                />
                            </div>
                            <Button onClick={openNewDisc} className="shrink-0 bg-[#0fa968] hover:bg-emerald-700 text-white rounded-xl shadow-sm px-5 font-semibold">
                                <Plus className="w-4 h-4 mr-2" />
                                Record Discarded
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
                                <TableHead className="font-semibold text-slate-600 px-6 py-4">Field</TableHead>
                                <TableHead className="font-semibold text-slate-600 px-6 py-4">Reason</TableHead>
                                <TableHead className="font-semibold text-slate-600 text-right px-6 py-4">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {discLoading && filteredDisc.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-12">
                                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#0fa968]" />
                                    </TableCell>
                                </TableRow>
                            ) : filteredDisc.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-14 bg-white hover:bg-white">
                                        <div className="w-14 h-14 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-3 border border-gray-100">
                                            <AlertTriangle className="w-7 h-7 text-amber-500" />
                                        </div>
                                        <p className="text-base font-bold text-slate-800 mb-1">No discarded plant records yet</p>
                                        <p className="text-sm text-slate-500">Record Date, Variety, Field, and Reason under Discarded.</p>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredDisc.map((r, i) => (
                                    <TableRow key={r.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                                        <TableCell className="px-6 py-4 font-medium text-slate-700">
                                            {r.date ? new Date(r.date).toLocaleDateString() : "--"}
                                        </TableCell>
                                        <TableCell className="px-6 py-4 font-medium text-slate-700">{r.variety}</TableCell>
                                        <TableCell className="px-6 py-4 text-slate-600">{r.field}</TableCell>
                                        <TableCell className="px-6 py-4 text-slate-600">{r.reason}</TableCell>
                                        <TableCell className="text-right px-6 py-4">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-blue-600 hover:bg-blue-50" onClick={() => openEditDisc(r)}>
                                                    <Edit2 className="w-4 h-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-red-600 hover:bg-red-50" onClick={() => confirmDeleteDisc(r)}>
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
        );
    }
}

