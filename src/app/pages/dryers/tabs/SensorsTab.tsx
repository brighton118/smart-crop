import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Activity, Plus, Trash2, Settings2 } from "lucide-react";

export function SensorsTab({ dryer }: { dryer: any }) {
    const sensors = dryer.sensors || [];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-gray-50 p-4 rounded-lg border">
                <div>
                    <h3 className="font-medium text-gray-900">Registered Sensors</h3>
                    <p className="text-sm text-gray-500">Manage environmental sensors mapped to this drying zone.</p>
                </div>
                <Button className="gap-2"><Plus className="w-4 h-4" /> Add Sensor</Button>
            </div>

            {sensors.length === 0 ? (
                <div className="p-8 text-center text-gray-500 bg-white rounded-lg border border-dashed">
                    <Activity className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                    <h3 className="text-lg font-medium text-gray-900 mb-1">No Sensors Registered</h3>
                    <p className="text-sm">There are no sensors configured for this dryer room yet.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {sensors.map((sensor: any) => (
                        <Card key={sensor.id}>
                            <CardHeader className="pb-3 border-b bg-gray-50/50">
                                <CardTitle className="text-base flex justify-between items-center">
                                    {sensor.name}
                                    <Badge variant="outline">{sensor.type}</Badge>
                                </CardTitle>
                                <div className="text-xs text-gray-500">Node: {sensor.nodeId}</div>
                            </CardHeader>
                            <CardContent className="pt-4 space-y-2">
                                <div className="flex justify-between text-sm py-1 border-b">
                                    <span className="text-gray-500">GPIO Pin</span>
                                    <span className="font-mono">{sensor.gpioPin || '4'}</span>
                                </div>
                                <div className="flex justify-between text-sm py-1 border-b">
                                    <span className="text-gray-500">Depth / Location</span>
                                    <span>{sensor.depth} cm</span>
                                </div>
                                <div className="flex justify-between text-sm py-1 border-b">
                                    <span className="text-gray-500">Status</span>
                                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100 uppercase text-[10px]">Active</Badge>
                                </div>
                            </CardContent>
                            <CardFooter className="pt-4 flex gap-2">
                                <Button variant="outline" size="sm" className="w-full"><Settings2 className="w-4 h-4 mr-2" /> Edit</Button>
                                <Button variant="outline" size="sm" className="w-full text-red-600 hover:text-red-700"><Trash2 className="w-4 h-4 mr-2" /> Remove</Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
