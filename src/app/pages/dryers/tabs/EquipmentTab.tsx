import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Wind, Power, Plus, Settings2, ShieldAlert } from "lucide-react";

export function EquipmentTab({ dryer }: { dryer: any }) {
    const fans = dryer.fans || [];
    const coolers = dryer.coolers || [];
    const allEquipment = [...fans.map((f: any) => ({ ...f, type: 'FAN' })), ...coolers.map((c: any) => ({ ...c, type: 'COOLER' }))];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-gray-50 p-4 rounded-lg border">
                <div>
                    <h3 className="font-medium text-gray-900">Control Equipment</h3>
                    <p className="text-sm text-gray-500">Manage fans and coolers bound to this drying zone.</p>
                </div>
                <Button className="gap-2"><Plus className="w-4 h-4" /> Add Equipment</Button>
            </div>

            {allEquipment.length === 0 ? (
                <div className="p-8 text-center text-gray-500 bg-white rounded-lg border border-dashed">
                    <Power className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                    <h3 className="text-lg font-medium text-gray-900 mb-1">No Equipment Registered</h3>
                    <p className="text-sm">There are no fans or coolers configured for this dryer room yet.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {allEquipment.map((eq: any) => (
                        <Card key={eq.id}>
                            <CardHeader className="pb-3 border-b bg-gray-50/50">
                                <CardTitle className="text-base flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        {eq.type === 'FAN' ? <Wind className="w-4 h-4 text-cyan-500" /> : <Power className="w-4 h-4 text-blue-500" />}
                                        {eq.name}
                                    </div>
                                    <Badge variant={eq.status === 'ON' ? 'default' : 'secondary'} className={eq.status === 'ON' ? 'bg-green-600' : ''}>{eq.status}</Badge>
                                </CardTitle>
                                <div className="text-xs text-gray-500 uppercase tracking-widest mt-1">{eq.type}</div>
                            </CardHeader>
                            <CardContent className="pt-4 space-y-2">
                                <div className="flex justify-between text-sm py-1 p-2 bg-gray-50 rounded border">
                                    <span className="text-gray-500">Control Mode</span>
                                    <Badge variant="outline" className={eq.controlMode === 'MANUAL' ? 'bg-amber-50 text-amber-700 border-amber-200' : ''}>
                                        {eq.controlMode}
                                    </Badge>
                                </div>
                                <div className="flex justify-between items-center text-sm py-1 p-2 bg-gray-50 rounded border">
                                    <span className="text-gray-500">Relay Channel</span>
                                    <span className="font-mono font-medium">CH{eq.relayChannel}</span>
                                </div>
                            </CardContent>
                            <CardFooter className="pt-4 flex gap-2">
                                {eq.controlMode === 'AUTOMATIC' ? (
                                    <Button variant="outline" size="sm" className="w-full text-amber-600 hover:text-amber-700 hover:bg-amber-50">
                                        <ShieldAlert className="w-4 h-4 mr-2" /> Override to Manual
                                    </Button>
                                ) : (
                                    <Button variant="outline" size="sm" className="w-full text-green-600 hover:text-green-700 hover:bg-green-50">
                                        <Settings2 className="w-4 h-4 mr-2" /> Resume Automatic
                                    </Button>
                                )}
                                <Button variant="outline" size="sm" className="px-3" title="Edit"><Settings2 className="w-4 h-4" /></Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
