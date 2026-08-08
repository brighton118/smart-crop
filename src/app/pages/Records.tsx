import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { PlantingTab } from "../components/records/PlantingTab";
import { SprayingRecords } from "../components/records/SprayingRecords";
import { HarvestGroupTab } from "../components/records/HarvestGroupTab";
import { Sprout, PackageCheck, Droplets } from "lucide-react";

export function Records() {
  const [activeTab, setActiveTab] = useState("planting");

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Crop Lifecycle Records</h1>
          <p className="text-gray-500 max-w-2xl text-lg">
            Manage your cultivation batches through every stage of their lifecycle.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-2 md:grid-cols-3 w-full h-auto gap-2 bg-transparent p-0 mb-6">
            <TabsTrigger
              value="planting"
              className="data-[state=active]:bg-green-600 data-[state=active]:text-white data-[state=active]:shadow-md border border-gray-200 bg-white hover:bg-gray-50 py-3 flex items-center justify-center gap-2 rounded-lg transition-all"
            >
              <Sprout className="w-4 h-4" />
              Planting & Batches
            </TabsTrigger>
            <TabsTrigger
              value="spraying"
              className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white data-[state=active]:shadow-md border border-gray-200 bg-white hover:bg-gray-50 py-3 flex items-center justify-center gap-2 rounded-lg transition-all"
            >
              <Droplets className="w-4 h-4" />
              Spraying
            </TabsTrigger>
            <TabsTrigger
              value="harvesting_group"
              className="data-[state=active]:bg-orange-600 data-[state=active]:text-white data-[state=active]:shadow-md border border-gray-200 bg-white hover:bg-gray-50 py-3 flex items-center justify-center gap-2 rounded-lg transition-all"
            >
              <PackageCheck className="w-4 h-4" />
              Harvesting & Post-Harvest
            </TabsTrigger>
          </TabsList>

          <TabsContent value="planting" className="mt-0 outline-none">
            <PlantingTab />
          </TabsContent>
          <TabsContent value="spraying" className="mt-0 outline-none">
            <SprayingRecords />
          </TabsContent>
          <TabsContent value="harvesting_group" className="mt-0 outline-none">
            <HarvestGroupTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
