import { useState } from "react";
import { Link } from "react-router";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { PlantingTab } from "../components/records/PlantingTab";
import { VegetativeTab } from "../components/records/VegetativeTab";
import { PreHarvestTab } from "../components/records/PreHarvestTab";
import { PostHarvestTab } from "../components/records/PostHarvestTab";
import { StoragePackagingTab } from "../components/records/StoragePackagingTab";
import { Sprout, Leaf, Scale, Scissors, PackageCheck, QrCode } from "lucide-react";
import { Button } from "../components/ui/button";

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

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div className="flex flex-col gap-1">
              <h1 className="text-[2.25rem] font-bold tracking-tight text-slate-900 drop-shadow-sm">Farm Data — Crop Lifecycle Records</h1>
              <p className="text-slate-600 max-w-2xl text-[1.1rem]">
                Manage your cultivation batches through every stage of their lifecycle from Planting to Storage & Packaging.
              </p>
            </div>
            <Button asChild className="bg-slate-900 hover:bg-slate-800 text-white flex items-center gap-2 shadow-sm shrink-0">
              <Link to="/app/plants">
                <QrCode className="w-4 h-4 text-green-400" /> Plant QR & Lineage Tracker
              </Link>
            </Button>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 w-full h-auto gap-3 bg-transparent p-0 mb-8">
              <TabsTrigger
                value="planting"
                className="data-[state=active]:bg-[#0fa968] data-[state=active]:text-white data-[state=active]:border-[#0fa968] data-[state=active]:shadow-lg bg-white border border-gray-200 hover:bg-gray-50 py-3.5 flex items-center justify-center gap-2 rounded-xl transition-all shadow-sm text-gray-700 font-semibold text-sm"
              >
                <Sprout className="w-4 h-4" />
                Planting
              </TabsTrigger>
              <TabsTrigger
                value="vegetative"
                className="data-[state=active]:bg-[#0fa968] data-[state=active]:text-white data-[state=active]:border-[#0fa968] data-[state=active]:shadow-lg bg-white border border-gray-200 hover:bg-gray-50 py-3.5 flex items-center justify-center gap-2 rounded-xl transition-all shadow-sm text-gray-700 font-semibold text-sm"
              >
                <Leaf className="w-4 h-4" />
                Vegetative
              </TabsTrigger>
              <TabsTrigger
                value="pre-harvest"
                className="data-[state=active]:bg-[#0fa968] data-[state=active]:text-white data-[state=active]:border-[#0fa968] data-[state=active]:shadow-lg bg-white border border-gray-200 hover:bg-gray-50 py-3.5 flex items-center justify-center gap-2 rounded-xl transition-all shadow-sm text-gray-700 font-semibold text-sm"
              >
                <Scale className="w-4 h-4" />
                Pre_Harvest
              </TabsTrigger>
              <TabsTrigger
                value="post-harvest"
                className="data-[state=active]:bg-[#0fa968] data-[state=active]:text-white data-[state=active]:border-[#0fa968] data-[state=active]:shadow-lg bg-white border border-gray-200 hover:bg-gray-50 py-3.5 flex items-center justify-center gap-2 rounded-xl transition-all shadow-sm text-gray-700 font-semibold text-sm"
              >
                <Scissors className="w-4 h-4" />
                Post_Harvest
              </TabsTrigger>
              <TabsTrigger
                value="storage-packaging"
                className="data-[state=active]:bg-[#0fa968] data-[state=active]:text-white data-[state=active]:border-[#0fa968] data-[state=active]:shadow-lg bg-white border border-gray-200 hover:bg-gray-50 py-3.5 flex items-center justify-center gap-2 rounded-xl transition-all shadow-sm text-gray-700 font-semibold text-sm"
              >
                <PackageCheck className="w-4 h-4" />
                Storage & Packaging
              </TabsTrigger>
            </TabsList>

            <TabsContent value="planting" className="mt-0 outline-none">
              <PlantingTab />
            </TabsContent>
            <TabsContent value="vegetative" className="mt-0 outline-none">
              <VegetativeTab />
            </TabsContent>
            <TabsContent value="pre-harvest" className="mt-0 outline-none">
              <PreHarvestTab />
            </TabsContent>
            <TabsContent value="post-harvest" className="mt-0 outline-none">
              <PostHarvestTab />
            </TabsContent>
            <TabsContent value="storage-packaging" className="mt-0 outline-none">
              <StoragePackagingTab />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
