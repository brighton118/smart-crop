import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "../ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Search, Plus, Loader2, Edit2, Trash2, Sprout } from "lucide-react";
import { supabase, DbTransplantingRecord } from "../../../lib/supabase";
import { toast } from "sonner";
import { useAuth } from "../../components/AuthProvider";

export function TransplantingRecords() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [records, setRecords] = useState<DbTransplantingRecord[]>([]);
    const [searchQuery, setSearchQuery] = useState("");

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState<DbTransplantingRecord | null>(null);

    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        field: "Field 1",
        variety: "",
        number_of_plants: ""
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
                .from("TransplantingRecord")
                .select("*")
                .order("date", { ascending: false }) as any);

            if (error) throw error;
            setRecords(data || []);
        } catch (err: any) {
            toast.error(err.message || "Failed to load transplanting records");
        } finally {
            setLoading(false);
        }
    }

    const openNew = () => {
        setSelectedRecord(null);
        setFormData({
            date: new Date().toISOString().split('T')[0],
            field: "Field 1",
            variety: "",
            number_of_plants: ""
        });
        setIsDialogOpen(true);
    };

    const openEdit = (record: DbTransplantingRecord) => {
        setSelectedRecord(record);
        setFormData({
            date: new Date(record.date).toISOString().split('T')[0],
            field: record.field || "Field 1",
            variety: record.variety || "",
            number_of_plants: record.number_of_plants?.toString() || ""
        });
        setIsDialogOpen(true);
    };

    const handleSave = async () => {
        if (!formData.date || !formData.field || !formData.variety) {
            toast.error("Please fill in required fields (Date, Field, Variety)");
            return;
        }

        const numPlants = Number(formData.number_of_plants);

        if (isNaN(numPlants) || numPlants <= 0) {
            toast.error("Number of plants must be a positive number");
            return;
        }

        setLoading(true);
        try {
            const payload = {
                date: new Date(formData.date).toISOString(),
                field: formData.field,
                variety: formData.variety,
                number_of_plants: numPlants,
                updatedAt: new Date().toISOString()
            };

            if (selectedRecord) {
                const { error } = await supabase.from("TransplantingRecord").update(payload).eq("id", selectedRecord.id);
                if (error) throw error;
                toast.success("Transplanting record updated");
            } else {
                const newId = crypto.randomUUID();
                const { error } = await supabase.from("TransplantingRecord").insert({
                    id: newId,
                    ...payload,
                    createdAt: new Date().toISOString()
                });
                if (error) throw error;
                toast.success("New transplanting record created successfully!");
            }
            setIsDialogOpen(false);
            loadData();
        } catch (err: any) {
            toast.error(err.message || "Failed to save");
        } finally {
            setLoading(false);
        }
    };

    const confirmDelete = (record: DbTransplantingRecord) => {
        setSelectedRecord(record);
        setIsDeleteDialogOpen(true);
    };

    const handleDelete = async () => {
        if (!selectedRecord) return;
        setLoading(true);
        try {
            const { error } = await supabase.from("TransplantingRecord").delete().eq("id", selectedRecord.id);
            if (error) throw error;
            toast.success("Transplanting record deleted");
            setIsDeleteDialogOpen(false);
            loadData();
        } catch (err: any) {
            toast.error(err.message || "Failed to delete");
        } finally {
            setLoading(false);
        }
    };

    const totalPlants = records.reduce((acc, r) => acc + (r.number_of_plants || 0), 0);

    const filteredData = records.filter(
        (entry) => {
            return (entry.field || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                (entry.variety || "").toLowerCase().includes(searchQuery.toLowerCase());
        }
    );

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card className="border-l-4 border-l-emerald-500 shadow-sm">
                    <CardContent className="p-6 flex flex-col justify-center">
                        <p className="text-sm font-medium text-gray-600 mb-1">Total Records</p>
                        <p className="text-3xl font-bold text-gray-900">{records.length}</p>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-blue-500 shadow-sm">
                    <CardContent className="p-6 flex flex-col justify-center">
                        <p className="text-sm font-medium text-gray-600 mb-1">Total Plants Transplanted</p>
                        <p className="text-3xl font-bold text-gray-900">{totalPlants}</p>
                    </CardContent>
                </Card>
            </div>

            <Card className="shadow-sm border border-gray-200">
                <CardHeader className="border-b bg-gray-50/50">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <CardTitle className="text-lg text-gray-800">🪴 Transplanting Records</CardTitle>
                        <div className="flex items-center gap-2">
                            <div className="relative w-full sm:w-64">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <Input
                                    placeholder="Search field, variety..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10 bg-white"
                                />
                            </div>
                            <Button onClick={openNew} className="shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white">
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
                                <TableHead>Date</TableHead>
                                <TableHead>Field</TableHead>
                                <TableHead>Variety</TableHead>
                                <TableHead>No. of Plants</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading && filteredData.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-6">
                                        <Loader2 className="w-5 h-5 animate-spin mx-auto text-emerald-600" />
                                    </TableCell>
                                </TableRow>
                            ) : filteredData.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                                        <Sprout className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                                        No transplanting records yet.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredData.map((r) => (
                                    <TableRow key={r.id}>
                                        <TableCell>{new Date(r.date).toLocaleDateString()}</TableCell>
                                        <TableCell className="font-medium text-gray-900">{r.field}</TableCell>
                                        <TableCell>{r.variety}</TableCell>
                                        <TableCell>{r.number_of_plants}</TableCell>
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
                        <DialogTitle>{selectedRecord ? "Edit Transplanting Record" : "Add Transplanting Record"}</DialogTitle>
                        <DialogDescription>Log transplanting quantities and destination fields.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Date <span className="text-red-500">*</span></label>
                            <Input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
                        </div>
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Destination Field <span className="text-red-500">*</span></label>
                            <Select value={formData.field} onValueChange={(v) => setFormData({ ...formData, field: v })}>
                                <SelectTrigger><SelectValue placeholder="Select Field" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Greenhouse">Greenhouse</SelectItem>
                                    <SelectItem value="Field 1">Field 1</SelectItem>
                                    <SelectItem value="Field 2">Field 2</SelectItem>
                                    <SelectItem value="Field 3">Field 3</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Variety <span className="text-red-500">*</span></label>
                            <Input value={formData.variety} onChange={(e) => setFormData({ ...formData, variety: e.target.value })} placeholder="e.g. Blue Dream" />
                        </div>
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">No. of Plants <span className="text-red-500">*</span></label>
                            <Input type="number" min="1" value={formData.number_of_plants} onChange={(e) => setFormData({ ...formData, number_of_plants: e.target.value })} />
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

            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="text-red-600">Confirm Deletion</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete this transplanting record? This action cannot be undone.
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
