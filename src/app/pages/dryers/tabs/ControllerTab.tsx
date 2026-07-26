import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { Cpu, Wifi, Hash, Clock, Server, RefreshCw } from "lucide-react";
import { Button } from "../../../components/ui/button";

export function ControllerTab({ dryer }: { dryer: any }) {
    const esp = dryer.devices?.[0];

    if (!esp) {
        return (
            <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-lg border border-dashed">
                <Cpu className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <h3 className="text-lg font-medium text-gray-900 mb-1">No Controller Assigned</h3>
                <p className="text-sm">This dryer does not have an ESP32 microcontroller assigned to it yet.</p>
                <Button className="mt-4">Assign Controller</Button>
            </div>
        );
    }

    const isOnline = esp.status === 'ONLINE';

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Cpu className="w-5 h-5 text-gray-500" />
                            ESP32 Microcontroller
                        </div>
                        {isOnline ? (
                            <Badge className="bg-green-100 text-green-700">Online</Badge>
                        ) : (
                            <Badge variant="secondary">Offline</Badge>
                        )}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border">
                            <Hash className="w-5 h-5 text-gray-400" />
                            <div>
                                <div className="text-xs text-gray-500 uppercase">Device ID (MAC)</div>
                                <div className="font-mono font-medium">{esp.deviceId}</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border">
                            <Wifi className="w-5 h-5 text-gray-400" />
                            <div>
                                <div className="text-xs text-gray-500 uppercase">IP Address</div>
                                <div className="font-mono font-medium">{esp.ipAddress || '192.168.1.xxx'}</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border">
                            <Server className="w-5 h-5 text-gray-400" />
                            <div>
                                <div className="text-xs text-gray-500 uppercase">Firmware</div>
                                <div className="font-medium">{esp.firmware || 'v1.0.0'}</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border">
                            <Clock className="w-5 h-5 text-gray-400" />
                            <div>
                                <div className="text-xs text-gray-500 uppercase">Last Seen</div>
                                <div className="font-medium">
                                    {esp.lastSeen ? new Date(esp.lastSeen).toLocaleString() : 'Never'}
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="bg-gray-50/50 border-t justify-end gap-3 p-4">
                    <Button variant="outline"><RefreshCw className="w-4 h-4 mr-2" /> Ping Device</Button>
                    <Button variant="destructive" className="bg-red-600 hover:bg-red-700 text-white">Reboot Controller</Button>
                </CardFooter>
            </Card>
        </div>
    );
}
