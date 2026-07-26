import { useState, useEffect } from "react";
import { supabase } from "../../../../lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../components/ui/table";
import { History, Fan, Snowflake } from "lucide-react";

export function HistoryTab({ dryer }: { dryer: any }) {
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchEvents() {
            // Find all equipment IDs for this dryer
            const fanIds = (dryer.fans || []).map((f: any) => f.id);
            const coolerIds = (dryer.coolers || []).map((c: any) => c.id);

            if (fanIds.length === 0 && coolerIds.length === 0) {
                setLoading(false);
                return;
            }

            // We have to query events for these equipment IDs
            const { data } = await supabase
                .from('EquipmentEvent')
                .select(`*, Fan(name), Cooler(name)`)
                .order('timestamp', { ascending: false })
                .limit(100);

            if (data) {
                // Filter events manually since Supabase OR doesn't easily span foreign collections
                const filtered = data.filter((e: any) =>
                    fanIds.includes(e.fanId) || coolerIds.includes(e.coolerId)
                );
                setEvents(filtered);
            }
            setLoading(false);
        }
        fetchEvents();
    }, [dryer]);

    if (loading) return <div className="p-8 text-center text-gray-500">Loading history...</div>;

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <History className="w-5 h-5 text-gray-400" />
                        Equipment Event History
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {events.length === 0 ? (
                        <div className="text-sm text-gray-500 text-center py-6">No historical events found for this dryer.</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Time</TableHead>
                                    <TableHead>Equipment</TableHead>
                                    <TableHead>Event</TableHead>
                                    <TableHead>Details</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {events.map((e) => {
                                    const eqName = e.Fan?.name || e.Cooler?.name || 'Unknown';
                                    const isFan = !!e.fanId;

                                    return (
                                        <TableRow key={e.id}>
                                            <TableCell className="text-sm">{new Date(e.timestamp).toLocaleString()}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2 font-medium">
                                                    {isFan ? <Fan className="w-4 h-4 text-gray-500" /> : <Snowflake className="w-4 h-4 text-blue-500" />}
                                                    {eqName}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <span className={`px-2 py-1 rounded text-xs font-semibold ${e.eventType === 'AUTO_ON' || e.eventType === 'MANUAL_ON' ? 'bg-green-100 text-green-700' :
                                                    e.eventType === 'AUTO_OFF' || e.eventType === 'MANUAL_OFF' ? 'bg-gray-100 text-gray-700' :
                                                        'bg-amber-100 text-amber-700'
                                                    }`}>
                                                    {e.eventType.replace('_', ' ')}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-sm text-gray-600">{e.details}</TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
