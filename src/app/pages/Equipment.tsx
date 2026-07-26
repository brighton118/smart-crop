import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "../components/ui/table";
import {
    Search, Fan, Snowflake, Plus, Loader2, AlertTriangle, Settings2, ActivitySquare, Database, X
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../components/AuthProvider";
import {
    supabase,
    DbZone,
    DbFan,
    DbCooler,
    DbEnvironmentalThreshold
} from "../../lib/supabase";

export function Equipment() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);

    // Data
    const [zones, setZones] = useState<DbZone[]>([]);
    const [fans, setFans] = useState<DbFan[]>([]);
    const [coolers, setCoolers] = useState<DbCooler[]>([]);
    const [events, setEvents] = useState<any[]>([]);
    const [thresholds, setThresholds] = useState<DbEnvironmentalThreshold[]>([]);
    const [devices, setDevices] = useState<any[]>([]);

    // Filtering
    const [searchQuery, setSearchQuery] = useState("");
    const [filterType, setFilterType] = useState("ALL");
    const [filterRoom, setFilterRoom] = useState("ALL");
    const [filterMode, setFilterMode] = useState("ALL");

    // Modals setup
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [newEqType, setNewEqType] = useState('Fan');
    const [newEqName, setNewEqName] = useState('');
    const [newEqId, setNewEqId] = useState('');
    const [newEqZone, setNewEqZone] = useState('');
    const [newEqMode] = useState('AUTOMATIC');
    const [newEqEsp32, setNewEqEsp32] = useState('');
    const [newEqRelay, setNewEqRelay] = useState<number>(1);

    const [confirmManual, setConfirmManual] = useState<any>(null);
    const [confirmAuto, setConfirmAuto] = useState<any>(null);
    const [detailsModalEq, setDetailsModalEq] = useState<any>(null);

    useEffect(() => {
        if (user) {
            loadData();

            // Real-time subscriptions for live results
            const fansSub = supabase.channel('custom-fans-channel')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'Fan' }, () => {
                    loadData(false);
                })
                .subscribe();

            const coolersSub = supabase.channel('custom-coolers-channel')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'Cooler' }, () => {
                    loadData(false);
                })
                .subscribe();

            const eventsSub = supabase.channel('custom-events-channel')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'EquipmentEvent' }, () => {
                    loadData(false);
                })
                .subscribe();

            return () => {
                supabase.removeChannel(fansSub);
                supabase.removeChannel(coolersSub);
                supabase.removeChannel(eventsSub);
            };
        }
    }, [user]);

    async function loadData(showLoading = true) {
        if (showLoading) setLoading(true);

        // Load Zones
        const { data: zData } = await supabase.from("Zone").select("*");
        if (zData) setZones(zData);

        // Load Thresholds
        const { data: thrData } = await supabase.from("EnvironmentalThreshold").select("*");
        if (thrData) setThresholds(thrData);

        // Load Devices
        const { data: dData } = await supabase.from("Device").select("*");
        if (dData) setDevices(dData);

        // Load Fans
        const { data: fData } = await supabase.from("Fan").select("*");
        if (fData) setFans(fData);

        // Load Coolers
        const { data: cData } = await supabase.from("Cooler").select("*");
        if (cData) setCoolers(cData);

        // Load Events
        const { data: eData } = await supabase
            .from("EquipmentEvent")
            .select(`*, Fan(id, name, zoneId), Cooler(id, name, zoneId)`)
            .order("timestamp", { ascending: false })
            .limit(50);
        if (eData) setEvents(eData);

        setLoading(false);
    }

    async function handleAddEquipment() {
        if (!newEqName || !newEqId || !newEqZone) {
            toast.error("Please fill in the Name, ID, and Area.");
            return;
        }

        const payload = {
            id: newEqId, name: newEqName, zoneId: newEqZone, status: 'OFF', mode: newEqMode,
            esp32Id: newEqEsp32 || null, relayChannel: newEqRelay,
            updatedAt: new Date().toISOString()
        };

        if (newEqType === 'Fan') {
            const { error } = await supabase.from('Fan').insert(payload);
            if (!error) {
                toast.success("Fan added successfully!");
                resetForm();
            } else {
                toast.error("Error adding Fan: " + error.message);
            }
        } else {
            const { error } = await supabase.from('Cooler').insert(payload);
            if (!error) {
                toast.success("Cooler added successfully!");
                resetForm();
            } else {
                toast.error("Error adding Cooler: " + error.message);
            }
        }
    }

    function resetForm() {
        setNewEqName('');
        setNewEqId('');
        setNewEqZone('');
        setNewEqEsp32('');
        setNewEqRelay(1);
        setIsAddOpen(false);
        loadData();
    }

    async function handleManualControl(eq: any, turnOn: boolean) {
        const table = eq.eqType === 'Fan' ? 'Fan' : 'Cooler';
        const newState = turnOn ? 'ON' : 'OFF';
        await supabase.from(table).update({ status: newState, mode: 'MANUAL' }).eq('id', eq.id);

        // Log event
        const ev = { triggerReason: 'MANUAL OVERRIDE', previousState: eq.status, newState, fanId: eq.eqType === 'Fan' ? eq.id : undefined, coolerId: eq.eqType === 'Cooler' ? eq.id : undefined };
        await supabase.from('EquipmentEvent').insert(ev);

        setConfirmManual(null);
        loadData();
    }

    async function handleRestoreAuto(eq: any) {
        const table = eq.eqType === 'Fan' ? 'Fan' : 'Cooler';
        await supabase.from(table).update({ mode: 'AUTOMATIC' }).eq('id', eq.id);

        // Log event
        const ev = { triggerReason: 'RESTORE AUTOMATIC', previousState: eq.status, newState: eq.status, fanId: eq.eqType === 'Fan' ? eq.id : undefined, coolerId: eq.eqType === 'Cooler' ? eq.id : undefined };
        await supabase.from('EquipmentEvent').insert(ev);

        setConfirmAuto(null);
        loadData();
    }

    // Combined equipment map for unified list
    const unifiedEquipment = useMemo(() => {
        const arr: any[] = [];
        fans.forEach(f => arr.push({ ...f, eqType: 'Fan' }));
        coolers.forEach(c => arr.push({ ...c, eqType: 'Cooler' }));

        return arr.filter(eq => {
            if (filterType !== 'ALL' && eq.eqType !== filterType) return false;
            if (filterRoom !== 'ALL' && eq.zoneId !== filterRoom) return false;
            if (filterMode !== 'ALL' && eq.mode !== filterMode) return false;
            if (searchQuery && !eq.name.toLowerCase().includes(searchQuery.toLowerCase()) && !eq.id.toLowerCase().includes(searchQuery.toLowerCase())) return false;
            return true;
        });
    }, [fans, coolers, filterType, filterRoom, filterMode, searchQuery]);

    // Derived Summary stats
    const totalEquip = fans.length + coolers.length;
    const activeEquip = fans.filter(f => f.status === 'ON').length + coolers.filter(c => c.status === 'ON').length;
    const totalFans = fans.length;
    const totalCoolers = coolers.length;

    if (loading && totalEquip === 0) {
        return <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-green-600" /></div>;
    }

    return (
        <div className="p-4 lg:p-8 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 flex items-center gap-2">
                        <Database className="w-8 h-8 text-green-600" /> Drying Equipment
                    </h1>
                    <p className="text-gray-600 mt-1">Manage and monitor fans, coolers, and environmental control equipment.</p>
                </div>
                <Button onClick={() => setIsAddOpen(true)} className="bg-green-600 hover:bg-green-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Equipment
                </Button>
            </div>

            {/* Top Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <Card className="border-l-4 border-l-blue-500">
                    <CardContent className="p-4">
                        <p className="text-xs text-gray-500 font-semibold mb-1 uppercase">Total Equipment</p>
                        <p className="text-2xl font-bold text-gray-900">{totalEquip}</p>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-green-500">
                    <CardContent className="p-4">
                        <p className="text-xs text-gray-500 font-semibold mb-1 uppercase">Online</p>
                        <p className="text-2xl font-bold text-gray-900">{totalEquip} <span className="text-sm font-normal text-gray-500"> (100%)</span></p>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-orange-500">
                    <CardContent className="p-4">
                        <p className="text-xs text-gray-500 font-semibold mb-1 uppercase">Active (ON)</p>
                        <p className="text-2xl font-bold text-gray-900">{activeEquip}</p>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-teal-600">
                    <CardContent className="p-4">
                        <p className="text-xs text-gray-500 font-semibold mb-1 uppercase">Fans</p>
                        <p className="text-2xl font-bold text-gray-900">{totalFans}</p>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-cyan-600">
                    <CardContent className="p-4">
                        <p className="text-xs text-gray-500 font-semibold mb-1 uppercase">Coolers</p>
                        <p className="text-2xl font-bold text-gray-900">{totalCoolers}</p>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-red-500">
                    <CardContent className="p-4">
                        <p className="text-xs text-gray-500 font-semibold mb-1 uppercase flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Alerts</p>
                        <p className="text-2xl font-bold text-red-600">0</p>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <Card className="bg-gray-50/50 border shadow-sm">
                <CardContent className="p-4 flex flex-wrap gap-4 items-center">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                        <Input
                            placeholder="Search equipment by name or ID..."
                            className="pl-9 bg-white"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="space-y-1">
                        <span className="text-[10px] font-semibold text-gray-500 uppercase ml-1">Type</span>
                        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="w-32 h-10 text-sm border p-2 rounded-md bg-white block">
                            <option value="ALL">All Types</option>
                            <option value="Fan">Fan</option>
                            <option value="Cooler">Cooler</option>
                        </select>
                    </div>
                    <div className="space-y-1">
                        <span className="text-[10px] font-semibold text-gray-500 uppercase ml-1">Drying Room</span>
                        <select value={filterRoom} onChange={e => setFilterRoom(e.target.value)} className="w-40 h-10 text-sm border p-2 rounded-md bg-white block">
                            <option value="ALL">All Rooms</option>
                            {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                        </select>
                    </div>
                    <div className="space-y-1">
                        <span className="text-[10px] font-semibold text-gray-500 uppercase ml-1">Control Mode</span>
                        <select value={filterMode} onChange={e => setFilterMode(e.target.value)} className="w-32 h-10 text-sm border p-2 rounded-md bg-white block">
                            <option value="ALL">All Modes</option>
                            <option value="AUTOMATIC">Automatic</option>
                            <option value="MANUAL">Manual</option>
                        </select>
                    </div>
                </CardContent>
            </Card>

            {/* Unified Equipment Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {unifiedEquipment.length === 0 ? (
                    <div className="col-span-1 lg:col-span-2 text-center py-12 text-gray-500 bg-gray-50 border rounded-lg border-dashed">
                        No equipment found matching criteria.
                    </div>
                ) : (
                    unifiedEquipment.map(eq => {
                        const room = zones.find(z => z.id === eq.zoneId);
                        const thr = thresholds.find(t => t.zoneId === eq.zoneId);

                        const isFan = eq.eqType === 'Fan';
                        const isOn = eq.status === 'ON';
                        const isAuto = eq.mode === 'AUTOMATIC';

                        return (
                            <Card key={eq.id} className={`overflow-hidden transition-all ${isOn ? (isFan ? 'border-teal-500 bg-teal-50/10' : 'border-cyan-500 bg-cyan-50/10') : 'border-gray-200 opacity-90'}`}>
                                <CardContent className="p-0">
                                    <div className="flex border-b">
                                        {/* State Banner & Name */}
                                        <div className={`p-4 flex flex-col items-center justify-center border-r w-24 text-white
                               ${!isOn ? 'bg-gray-400' : (isFan ? 'bg-teal-500' : 'bg-cyan-500')}
                           `}>
                                            {isFan ? <Fan className={`w-8 h-8 ${isOn && 'animate-spin'}`} /> : <Snowflake className="w-8 h-8" />}
                                            <span className="font-bold mt-2 tracking-wider">{eq.status}</span>
                                        </div>

                                        <div className="p-4 flex-1">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h3 className="font-bold text-gray-900 text-lg uppercase tracking-wide flex items-center gap-2">
                                                        {eq.name}
                                                        {!isAuto && <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">MANUAL</Badge>}
                                                        {isAuto && <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">AUTO</Badge>}
                                                    </h3>
                                                    <p className="text-xs text-gray-500 mt-1 font-mono">{eq.id} {eq.esp32Id && `• ESP32 CH${eq.relayChannel}`}</p>
                                                </div>
                                                <Badge className="bg-gray-100 text-gray-800 border-gray-300 font-semibold" variant="outline">{room?.name || 'Unassigned'}</Badge>
                                            </div>

                                            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                                                <div>
                                                    <p className="text-xs text-gray-500 font-semibold mb-1 uppercase truncate">{isFan ? 'Humidity Target' : 'Temp Target'}</p>
                                                    <p className="font-medium text-gray-800">
                                                        {isFan ? `${thr?.humidityTarget || '--'}% RH` : `${thr?.tempTarget || '--'}°C`}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500 font-semibold mb-1 uppercase truncate">Condition Trigger</p>
                                                    <p className="font-medium text-gray-700">
                                                        {isFan ? `>${thr?.humidityMax || '--'}% RH` : `>${thr?.tempMax || '--'}°C`}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Manual Override Warning Info */}
                                            {!isAuto && (
                                                <div className="mt-3 bg-red-50 text-red-700 rounded-md p-2 text-xs flex items-center gap-2 font-medium border border-red-100">
                                                    <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                                                    MANUAL OVERRIDE ACTIVE - Automation rules are bypassed for this equipment.
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Actions footer */}
                                    <div className="bg-gray-50 p-3 flex justify-between items-center px-4">
                                        <div className="flex gap-2">
                                            <Button variant="outline" size="sm" className="text-xs h-8">
                                                <Settings2 className="w-3 h-3 mr-1" /> Configure
                                            </Button>
                                            <Button variant="outline" size="sm" className="text-xs h-8 text-blue-600 hover:text-blue-700" onClick={() => setDetailsModalEq(eq)}>
                                                <ActivitySquare className="w-3 h-3 mr-1" /> Details
                                            </Button>
                                        </div>
                                        <div className="flex gap-2">
                                            {isAuto ? (
                                                <Button size="sm" variant="secondary" onClick={() => setConfirmManual(eq)} className="text-xs h-8 bg-yellow-100 hover:bg-yellow-200 text-yellow-800">
                                                    Enable Manual Control
                                                </Button>
                                            ) : (
                                                <Button size="sm" variant="default" onClick={() => setConfirmAuto(eq)} className="text-xs h-8 bg-blue-600 hover:bg-blue-700">
                                                    Restore Automatic
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })
                )}
            </div>

            {/* Detailed Events Table */}
            <div>
                <h2 className="text-lg font-bold text-gray-900 border-b pb-2 mb-4 mt-6">RECENT EQUIPMENT EVENTS</h2>
                <Card>
                    <CardContent className="p-0 overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-gray-50">
                                <TableRow>
                                    <TableHead>Time</TableHead>
                                    <TableHead>Equipment</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Action</TableHead>
                                    <TableHead>Control Mode</TableHead>
                                    <TableHead>Trigger</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {events.length === 0 ? (
                                    <TableRow><TableCell colSpan={6} className="text-center text-gray-500 py-6">No equipment events recorded</TableCell></TableRow>
                                ) : events.slice(0, 10).map((evt: any) => (
                                    <TableRow key={evt.id}>
                                        <TableCell className="whitespace-nowrap text-xs text-gray-600 font-mono">
                                            {new Date(evt.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                        </TableCell>
                                        <TableCell className="font-semibold text-xs">{evt.Fan?.name || evt.Cooler?.name || "System"}</TableCell>
                                        <TableCell>
                                            {evt.fanId ? (
                                                <Badge variant="outline" className="text-teal-700 bg-teal-50 border-teal-200"><Fan className="w-3 h-3 mr-1" /> Fan</Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-cyan-700 bg-cyan-50 border-cyan-200"><Snowflake className="w-3 h-3 mr-1" /> Cooler</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={evt.newState === 'ON' ? 'bg-green-100 text-green-700 hover:bg-green-100' : 'bg-gray-100 text-gray-700 hover:bg-gray-100'} variant="outline">
                                                {evt.previousState} &rarr; {evt.newState}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="secondary" className="text-xs bg-gray-100">{evt.controlMode || 'AUTO'}</Badge>
                                        </TableCell>
                                        <TableCell className="text-xs text-gray-600 truncate max-w-[200px]">{evt.triggerReason}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            {/* ADD EQUIPMENT MODAL */}
            {isAddOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <Card className="w-full max-w-md">
                        <CardHeader className="flex flex-row items-center justify-between"><CardTitle>Add Equipment</CardTitle> <Button variant="ghost" onClick={() => setIsAddOpen(false)}><X className="w-4 h-4" /></Button></CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <label className="text-xs font-semibold text-gray-700">Equipment Type</label>
                                <select value={newEqType} onChange={e => setNewEqType(e.target.value)} className="w-full border p-2 rounded-md mt-1 mb-2">
                                    <option value="Fan">Fan</option>
                                    <option value="Cooler">Cooler</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-700">Equipment Name (e.g. Fan 01)</label>
                                <Input value={newEqName} onChange={e => setNewEqName(e.target.value)} className="mt-1" />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-700">Device ID (Must be unique)</label>
                                <Input value={newEqId} onChange={e => setNewEqId(e.target.value)} className="mt-1" />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-700">Drying Room</label>
                                <select value={newEqZone} onChange={e => setNewEqZone(e.target.value)} className="w-full border p-2 rounded-md mt-1">
                                    <option value="">Select Room...</option>
                                    {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-semibold text-gray-700">ESP32 Controller</label>
                                    <select value={newEqEsp32} onChange={e => setNewEqEsp32(e.target.value)} className="w-full border p-2 rounded-md mt-1">
                                        <option value="">None</option>
                                        {devices.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-700">Relay CH#</label>
                                    <Input type="number" min="1" max="16" value={newEqRelay} onChange={e => setNewEqRelay(parseInt(e.target.value) || 1)} className="mt-1" />
                                </div>
                            </div>
                            <Button onClick={handleAddEquipment} className="w-full bg-green-600 hover:bg-green-700">Submit</Button>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* CONFIRM MANUAL MODAL */}
            {confirmManual && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <Card className="w-full max-w-md border-red-200">
                        <CardHeader className="flex flex-row items-center justify-between"><CardTitle className="text-red-700 flex items-center gap-2"><AlertTriangle className="w-5 h-5" /> Manual Override</CardTitle> <Button variant="ghost" onClick={() => setConfirmManual(null)}><X className="w-4 h-4" /></Button></CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-sm text-gray-700">Are you sure you want to take manual control of <strong>{confirmManual.name}</strong>? This will bypass configured automation rules.</p>
                            <div className="flex gap-4 pt-4">
                                <Button onClick={() => handleManualControl(confirmManual, true)} className="w-full bg-green-600 hover:bg-green-700">Turn ON</Button>
                                <Button onClick={() => handleManualControl(confirmManual, false)} className="w-full bg-gray-600 hover:bg-gray-700">Turn OFF</Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* CONFIRM AUTO MODAL */}
            {confirmAuto && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <Card className="w-full max-w-md border-blue-200">
                        <CardHeader className="flex flex-row items-center justify-between"><CardTitle className="text-blue-700 flex items-center gap-2"><Fan className="w-5 h-5" /> Restore Automatic rules?</CardTitle> <Button variant="ghost" onClick={() => setConfirmAuto(null)}><X className="w-4 h-4" /></Button></CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-sm text-gray-700">Are you sure you want to return <strong>{confirmAuto.name}</strong> to Automatic mode? The system will evaluate the room's thresholds and override its current state immediately if necessary.</p>
                            <Button onClick={() => handleRestoreAuto(confirmAuto)} className="w-full bg-blue-600 hover:bg-blue-700">Restore Automation</Button>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* DETAILS MODAL */}
            {detailsModalEq && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <Card className="w-full max-w-2xl bg-white shadow-xl border-none">
                        <CardHeader className="flex flex-row items-center justify-between border-b bg-gray-50 rounded-t-xl">
                            <CardTitle className="flex items-center gap-2">
                                {detailsModalEq.eqType === 'Fan' ? <Fan className="w-5 h-5 text-teal-600" /> : <Snowflake className="w-5 h-5 text-cyan-600" />}
                                Equipment Details: {detailsModalEq.name}
                            </CardTitle>
                            <Button variant="ghost" onClick={() => setDetailsModalEq(null)}><X className="w-4 h-4" /></Button>
                        </CardHeader>
                        <CardContent className="space-y-6 pt-6 bg-white rounded-b-xl">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-gray-50 p-3 rounded-lg border">
                                    <p className="text-xs text-gray-500 uppercase font-bold mb-1">Status</p>
                                    <p className={`font-bold ${detailsModalEq.status === 'ON' ? 'text-green-600' : 'text-gray-500'}`}>{detailsModalEq.status}</p>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-lg border">
                                    <p className="text-xs text-gray-500 uppercase font-bold mb-1">Mode</p>
                                    <p className="font-semibold text-gray-800">{detailsModalEq.mode}</p>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-lg border">
                                    <p className="text-xs text-gray-500 uppercase font-bold mb-1">Room Area</p>
                                    <p className="font-semibold text-gray-800">{zones.find(z => z.id === detailsModalEq.zoneId)?.name || 'N/A'}</p>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-lg border">
                                    <p className="text-xs text-gray-500 uppercase font-bold mb-1">Type</p>
                                    <p className="font-semibold text-gray-800">{detailsModalEq.eqType}</p>
                                </div>
                            </div>

                            <div className="border rounded-lg p-4 bg-blue-50/50">
                                <h3 className="font-bold text-gray-900 border-b border-blue-100 pb-2 mb-3">Hardware Mapping</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs text-gray-500 uppercase font-bold">ESP32 ID</p>
                                        <p className="font-mono text-sm text-gray-800 mt-1">{detailsModalEq.esp32Id || 'Not mapped'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 uppercase font-bold">Relay Channel</p>
                                        <p className="font-mono text-sm text-gray-800 mt-1">{detailsModalEq.relayChannel ? `CH${detailsModalEq.relayChannel}` : 'N/A'}</p>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h3 className="font-bold text-gray-900 border-b pb-2 mb-3">Recent Activity</h3>
                                <div className="max-h-48 overflow-y-auto border rounded-lg">
                                    <Table>
                                        <TableHeader className="bg-gray-50 sticky top-0">
                                            <TableRow>
                                                <TableHead>Time</TableHead>
                                                <TableHead>Event</TableHead>
                                                <TableHead>Reason</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {events.filter(e => (detailsModalEq.eqType === 'Fan' ? e.fanId === detailsModalEq.id : e.coolerId === detailsModalEq.id)).length === 0 ? (
                                                <TableRow><TableCell colSpan={3} className="text-center text-gray-500 py-4">No recent events found.</TableCell></TableRow>
                                            ) : events.filter(e => (detailsModalEq.eqType === 'Fan' ? e.fanId === detailsModalEq.id : e.coolerId === detailsModalEq.id)).slice(0, 10).map(evt => (
                                                <TableRow key={evt.id}>
                                                    <TableCell className="text-xs font-mono">{new Date(evt.timestamp).toLocaleString()}</TableCell>
                                                    <TableCell className="text-xs whitespace-nowrap">
                                                        <Badge variant="outline" className={evt.newState === 'ON' ? 'text-green-700 bg-green-50' : 'text-gray-700 bg-gray-50'}>
                                                            {evt.previousState} &rarr; {evt.newState}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-xs truncate max-w-[200px]" title={evt.triggerReason}>{evt.triggerReason}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
