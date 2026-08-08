import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { CloningRecords } from "./CloningRecords";
import { TransplantingRecords } from "./TransplantingRecords";

export function PlantingTab() {
    return (
        <Tabs defaultValue="planting-records" className="w-full">
            <div className="flex items-center justify-between mb-4 mt-2">
                <TabsList className="bg-gray-100/80 p-1 border">
                    <TabsTrigger value="planting-records" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">Planting Records</TabsTrigger>
                    <TabsTrigger value="cloning" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-emerald-600">Clone Tracking</TabsTrigger>
                </TabsList>
            </div>

            <TabsContent value="planting-records" className="mt-0 outline-none">
                <TransplantingRecords />
            </TabsContent>

            <TabsContent value="cloning" className="mt-0 outline-none">
                <CloningRecords />
            </TabsContent>
        </Tabs>
    );
}
