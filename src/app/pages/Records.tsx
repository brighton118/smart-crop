import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { PlantingTab } from "../components/records/PlantingTab";
import { SprayingRecords } from "../components/records/SprayingRecords";
import { HarvestTab } from "../components/records/HarvestTab";
import { Sprout, PackageCheck, Droplets } from "lucide-react";

export function Records() {
  const [activeTab, setActiveTab] = useState("planting");

  return (
    <div className="relative min-h-screen">
      <div
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat fixed opacity-30"
        style={{ backgroundImage: "url('/bg-farm.png')" }}
      />
      <div className="relative z-10 p-4 md:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

          <div className="flex flex-col gap-1 mb-8">
            <h1 className="text-[2.25rem] font-bold tracking-tight text-slate-900 drop-shadow-sm">Crop Lifecycle Records</h1>
            <p className="text-slate-600 max-w-2xl text-[1.1rem]">
              Manage your cultivation batches through every stage of their lifecycle.
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-1 md:grid-cols-3 w-full h-auto gap-4 bg-transparent p-0 mb-8">
              <TabsTrigger
                value="planting"
                className="data-[state=active]:bg-[#0fa968] data-[state=active]:text-white data-[state=active]:border-[#0fa968] data-[state=active]:shadow-lg bg-white border border-gray-200 hover:bg-gray-50 py-3.5 flex items-center justify-center gap-2 rounded-xl transition-all shadow-sm text-gray-700 font-semibold text-sm"
              >
                <Sprout className="w-4 h-4" />
                Planting
              </TabsTrigger>
              <TabsTrigger
                value="spraying"
                className="data-[state=active]:bg-[#0fa968] data-[state=active]:text-white data-[state=active]:border-[#0fa968] data-[state=active]:shadow-lg bg-white border border-gray-200 hover:bg-gray-50 py-3.5 flex items-center justify-center gap-2 rounded-xl transition-all shadow-sm text-gray-700 font-semibold text-sm"
              >
                <Droplets className="w-4 h-4" />
                Spraying
              </TabsTrigger>
              <TabsTrigger
                value="harvesting"
                className="data-[state=active]:bg-[#0fa968] data-[state=active]:text-white data-[state=active]:border-[#0fa968] data-[state=active]:shadow-lg bg-white border border-gray-200 hover:bg-gray-50 py-3.5 flex items-center justify-center gap-2 rounded-xl transition-all shadow-sm text-gray-700 font-semibold text-sm"
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
            <TabsContent value="harvesting" className="mt-0 outline-none">
              <HarvestTab />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
