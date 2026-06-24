import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { Search, Plus, Loader2, Leaf, MoreVertical, Edit2, Trash2 } from "lucide-react";
import { useAuth } from "../components/AuthProvider";
import { supabase, DbCropRecord, DbZone } from "../../lib/supabase";
import { useTranslation } from "react-i18next";

export function Records() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<DbCropRecord[]>([]);
  const [zones, setZones] = useState<Map<string, DbZone>>(new Map());

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  async function loadData() {
    setLoading(true);

    // Fetch zones for mapping zoneId to zone name
    const { data: zonesData } = await supabase.from("Zone").select("*");
    const zonesMap = new Map<string, DbZone>();
    if (zonesData) {
      zonesData.forEach(z => {
        zonesMap.set(z.id, z);
      });
    }
    setZones(zonesMap);

    // Fetch crop records (assuming they are linked via zone -> farm -> user, but we'll fetch all for the current farm or just fetch all for now, as RLS will handle it if configured, or just fetch directly)
    const { data: recordsData } = await supabase
      .from("CropRecord")
      .select("*")
      .order("createdAt", { ascending: false });

    if (recordsData) {
      setRecords(recordsData as DbCropRecord[]);
    }

    setLoading(false);
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "SEEDLING":
        return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200">{t("Seedling")}</Badge>;
      case "VEGETATIVE":
        return <Badge className="bg-green-500 text-white hover:bg-green-600">{t("Vegetative")}</Badge>;
      case "FLOWERING":
        return <Badge className="bg-purple-500 text-white hover:bg-purple-600">{t("Flowering")}</Badge>;
      case "GROWING":
        return <Badge className="bg-blue-500 text-white hover:bg-blue-600">{t("Growing")}</Badge>;
      case "HARVESTED":
        return <Badge variant="secondary">{t("Harvested")}</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const filteredData = records.filter(
    (entry) =>
      entry.batchName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.strain.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeRecords = records.filter(r => r.status !== "HARVESTED").length;
  const harvestedRecords = records.filter(r => r.status === "HARVESTED").length;
  const totalYield = records.reduce((acc, r) => acc + (r.yield || 0), 0);

  if (loading) {
    return <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="p-4 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">{t("Crop Records")}</h1>
          <p className="text-gray-600 mt-1">{t("Manage cultivation batches and harvest history")}</p>
        </div>
        <Button className="shrink-0 bg-primary hover:bg-primary/90 text-white">
          <Plus className="w-4 h-4 mr-2" />
          New Batch
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-green-500 shadow-sm">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">{t("Active Batches")}</p>
                <p className="text-3xl font-bold text-gray-900">{activeRecords}</p>
              </div>
              <div className="p-2 bg-green-100 rounded-lg">
                <Leaf className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-gray-300 shadow-sm">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">{t("Harvested Batches")}</p>
                <p className="text-3xl font-bold text-gray-900">{harvestedRecords}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-primary shadow-sm">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">{t("Total Yield")}</p>
                <p className="text-3xl font-bold text-gray-900">{totalYield.toFixed(2)} kg</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <Card className="shadow-sm border border-gray-200">
        <CardHeader className="border-b bg-gray-50/50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="text-lg text-gray-800">{t("Cultivation Batches")}</CardTitle>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search batches or strains..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="font-semibold text-gray-700">{t("Batch Name")}</TableHead>
                  <TableHead className="font-semibold text-gray-700">{t("Strain")}</TableHead>
                  <TableHead className="font-semibold text-gray-700">{t("Zone")}</TableHead>
                  <TableHead className="font-semibold text-gray-700">{t("Planted")}</TableHead>
                  <TableHead className="font-semibold text-gray-700">{t("Status")}</TableHead>
                  <TableHead className="font-semibold text-gray-700">{t("Yield")}</TableHead>
                  <TableHead className="text-right"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((entry) => (
                  <TableRow key={entry.id} className="hover:bg-gray-50/50 transition-colors">
                    <TableCell className="font-medium text-gray-900">{entry.batchName}</TableCell>
                    <TableCell className="text-gray-600">{entry.strain}</TableCell>
                    <TableCell className="text-gray-600">{zones.get(entry.zoneId)?.name || "Unknown Zone"}</TableCell>
                    <TableCell className="text-gray-600">
                      {new Date(entry.plantedDate).toLocaleDateString("en-US", { month: 'short', day: 'numeric', year: 'numeric' })}
                    </TableCell>
                    <TableCell>{getStatusBadge(entry.status)}</TableCell>
                    <TableCell className="text-gray-600 font-medium">{entry.yield ? `${entry.yield} kg` : "--"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-blue-600">
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredData.length === 0 && (
            <div className="text-center py-12">
              <Leaf className="mx-auto h-12 w-12 text-gray-300 mb-3" />
              <h3 className="text-lg font-medium text-gray-900">{t("No batches found")}</h3>
              <p className="text-gray-500">{t("Get started by creating a new cultivation batch.")}</p>
              <Button className="mt-4 bg-primary hover:bg-primary/90 text-white">
                <Plus className="w-4 h-4 mr-2" />
                New Batch
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
