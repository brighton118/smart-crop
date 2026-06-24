import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";
import { Switch } from "../components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Separator } from "../components/ui/separator";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { useAuth } from "../components/AuthProvider";
import { supabase, DbFarm } from "../../lib/supabase";
import { getOrCreateDefaultFarm } from "../../lib/farmUtils";
import {
  User,
  MapPin,
  Mail,
  Phone,
  Camera,
  Globe,
  Loader2,
  CheckCircle2,
} from "lucide-react";

export function Settings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingFarm, setSavingFarm] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Profile State
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Farm State
  const [farm, setFarm] = useState<DbFarm | null>(null);
  const [farmName, setFarmName] = useState("");
  const [farmSize, setFarmSize] = useState("");
  const [cropType, setCropType] = useState("");
  const [farmAddress, setFarmAddress] = useState("");

  // Password State
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Notification State
  const [notifications, setNotifications] = useState({
    irrigation: true,
    weather: true,
    pests: true,
    temperature: false,
    email: true,
    sms: false,
  });

  useEffect(() => {
    if (!user) return;
    
    // Load User Profile Data
    setFullName(user.user_metadata?.name || "");
    setEmail(user.email || "");
    setPhone(user.user_metadata?.phone || "");
    setLocation(user.user_metadata?.location || "");
    setAvatarUrl(user.user_metadata?.avatar_url || "");

    // Load Farm Data
    async function loadFarm() {
      setLoading(true);
      const data = await getOrCreateDefaultFarm(user!.id);
      if (data) {
        setFarm(data.farm);
        setFarmName(data.farm.name);
        setFarmAddress(data.farm.location || "");
        // Metadata not explicitly in DB schema, so we mock or extract
        setFarmSize("25"); 
        setCropType("Cannabis Sativa");
      }
      setLoading(false);
    }
    
    loadFarm();
  }, [user]);

  function showToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  }

  async function handleSaveProfile() {
    setSavingProfile(true);
    const { error } = await supabase.auth.updateUser({
      data: { name: fullName, phone, location }
    });
    setSavingProfile(false);
    if (error) {
      console.error(error);
      showToast("Error updating profile.");
    } else {
      showToast("Profile updated successfully!");
    }
  }

  async function handleAvatarUpload(event: React.ChangeEvent<HTMLInputElement>) {
    try {
      setUploadingAvatar(true);
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('You must select an image to upload.');
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}-${Math.random().toString(36).substring(2)}.${fileExt}`;

      if (file.size > 2 * 1024 * 1024) {
        throw new Error('File size must be less than 2MB');
      }

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: publicUrl }
      });

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      showToast("Profile picture updated!");
    } catch (error: any) {
      console.error(error);
      showToast(error.message || "Error uploading image");
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleSaveFarm() {
    if (!farm) return;
    setSavingFarm(true);
    const { error } = await supabase.from("Farm").update({
      name: farmName,
      location: farmAddress
    }).eq("id", farm.id);
    setSavingFarm(false);
    
    if (error) {
      console.error(error);
      showToast("Error updating farm settings.");
    } else {
      showToast("Farm settings updated successfully!");
    }
  }

  async function handleUpdatePassword() {
    if (newPassword !== confirmPassword) {
      showToast("Passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
      showToast("Password must be at least 6 characters.");
      return;
    }

    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });
    setSavingPassword(false);

    if (error) {
      console.error(error);
      showToast("Error updating password.");
    } else {
      setNewPassword("");
      setConfirmPassword("");
      showToast("Password updated successfully!");
    }
  }

  if (loading) {
    return <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="p-4 lg:p-8 space-y-6 relative">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 bg-gray-900 text-white px-6 py-3 rounded-lg shadow-xl z-50 animate-in fade-in slide-in-from-top-5 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-green-400" />
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Manage your account and preferences</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="farm">Grow Facility</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your personal information and profile picture</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Profile Picture */}
              <div className="flex items-center gap-6">
                <div className="relative">
                  <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden border-4 border-white shadow-sm">
                    {uploadingAvatar ? (
                      <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                    ) : avatarUrl ? (
                      <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : fullName ? (
                      <div className="text-4xl text-gray-400 font-bold">{fullName.charAt(0).toUpperCase()}</div>
                    ) : (
                      <User className="w-12 h-12 text-gray-400" />
                    )}
                  </div>
                  <label className="absolute bottom-0 right-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center hover:bg-primary/90 cursor-pointer shadow-md transition-colors">
                    <Camera className="w-4 h-4" />
                    <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploadingAvatar} />
                  </label>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Profile Picture</h3>
                  <p className="text-sm text-gray-600 mb-2">JPG, PNG or GIF. Max size 2MB</p>
                  <label>
                    <Button variant="outline" size="sm" asChild disabled={uploadingAvatar}>
                      <span>
                        {uploadingAvatar ? "Uploading..." : "Upload New Photo"}
                      </span>
                    </Button>
                    <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploadingAvatar} />
                  </label>
                </div>
              </div>

              <Separator />

              {/* Form Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} className="pl-10" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      disabled
                      className="pl-10 bg-gray-50 text-gray-500"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 (555) 123-4567" className="pl-10" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="California, USA" className="pl-10" />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => window.location.reload()}>Cancel</Button>
                <Button onClick={handleSaveProfile} disabled={savingProfile}>
                  {savingProfile ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Security */}
          <Card>
            <CardHeader>
              <CardTitle>Security</CardTitle>
              <CardDescription>Manage your password and security settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Enter new password" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword} 
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => {setNewPassword(""); setConfirmPassword("");}}>Cancel</Button>
                <Button onClick={handleUpdatePassword} disabled={savingPassword || !newPassword}>
                  {savingPassword ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Update Password
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Farm Settings Tab */}
        <TabsContent value="farm" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Grow Facility Information</CardTitle>
              <CardDescription>Configure your indoor facility details and location</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="farmName">Facility Name</Label>
                  <Input id="farmName" value={farmName} onChange={(e) => setFarmName(e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="farmSize">Total Canopy (m²)</Label>
                  <Input id="farmSize" type="number" value={farmSize} onChange={(e) => setFarmSize(e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cropType">Cultivar / Strain</Label>
                  <Input id="cropType" value={cropType} onChange={(e) => setCropType(e.target.value)} />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="farmAddress">Facility Address</Label>
                  <Input
                    id="farmAddress"
                    value={farmAddress} 
                    onChange={(e) => setFarmAddress(e.target.value)}
                    placeholder="Unit 4, Greenleaf Industrial Park, Denver, CO"
                    className="w-full"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="coordinates">GPS Coordinates</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input id="latitude" placeholder="Latitude" defaultValue="36.7783" />
                    <Input id="longitude" placeholder="Longitude" defaultValue="-119.4179" />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Facility Image */}
              <div>
                <Label className="mb-2">Facility Image</Label>
                <div className="mt-2 rounded-lg overflow-hidden border">
                  <ImageWithFallback
                    src="/cannabis_settings.png"
                    alt="KindBuds Grow Facility"
                    className="w-full h-48 object-cover"
                  />
                </div>
                <Button variant="outline" size="sm" className="mt-2">
                  Change Image
                </Button>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => window.location.reload()}>Cancel</Button>
                <Button onClick={handleSaveFarm} disabled={savingFarm}>
                  {savingFarm ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Alert Preferences</CardTitle>
              <CardDescription>Choose which alerts you want to receive</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Fertigation Alerts</Label>
                    <p className="text-sm text-gray-600">
                      Get notified when substrate VWC or EC is out of range
                    </p>
                  </div>
                  <Switch
                    checked={notifications.irrigation}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, irrigation: checked })
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>VPD &amp; Climate Alerts</Label>
                    <p className="text-sm text-gray-600">
                      Receive alerts when VPD or RH deviates from target
                    </p>
                  </div>
                  <Switch
                    checked={notifications.weather}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, weather: checked })
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>IPM &amp; Pathogen Alerts</Label>
                    <p className="text-sm text-gray-600">
                      Get notified about mould, spider mites, or aphid pressure
                    </p>
                  </div>
                  <Switch
                    checked={notifications.pests}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, pests: checked })
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Canopy Temperature Alerts</Label>
                    <p className="text-sm text-gray-600">
                      Alerts when canopy temp exceeds safe growing thresholds
                    </p>
                  </div>
                  <Switch
                    checked={notifications.temperature}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, temperature: checked })
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notification Channels</CardTitle>
              <CardDescription>Choose how you want to receive notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Email Notifications</Label>
                  <p className="text-sm text-gray-600">Receive alerts via email</p>
                </div>
                <Switch
                  checked={notifications.email}
                  onCheckedChange={(checked) =>
                    setNotifications({ ...notifications, email: checked })
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>SMS Notifications</Label>
                  <p className="text-sm text-gray-600">Receive critical alerts via SMS</p>
                </div>
                <Switch
                  checked={notifications.sms}
                  onCheckedChange={(checked) =>
                    setNotifications({ ...notifications, sms: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="preferences" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Display Preferences</CardTitle>
              <CardDescription>Customize how you view your data</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="language">Language</Label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <select
                      id="language"
                      className="w-full pl-10 pr-3 py-2 border rounded-lg bg-white"
                    >
                      <option>English</option>
                      <option>Spanish</option>
                      <option>French</option>
                      <option>German</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <select id="timezone" className="w-full px-3 py-2 border rounded-lg bg-white">
                    <option>Pacific Time (PT)</option>
                    <option>Mountain Time (MT)</option>
                    <option>Central Time (CT)</option>
                    <option>Eastern Time (ET)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="temperature-unit">Temperature Unit</Label>
                  <select
                    id="temperature-unit"
                    className="w-full px-3 py-2 border rounded-lg bg-white"
                  >
                    <option>Celsius (°C)</option>
                    <option>Fahrenheit (°F)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date-format">Date Format</Label>
                  <select id="date-format" className="w-full px-3 py-2 border rounded-lg bg-white">
                    <option>MM/DD/YYYY</option>
                    <option>DD/MM/YYYY</option>
                    <option>YYYY-MM-DD</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline">Cancel</Button>
                <Button onClick={() => showToast("Preferences saved!")}>Save Preferences</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Data & Privacy</CardTitle>
              <CardDescription>Control your data and privacy settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Share Analytics Data</Label>
                  <p className="text-sm text-gray-600">
                    Help improve the platform by sharing anonymous usage data
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto-backup Data</Label>
                  <p className="text-sm text-gray-600">
                    Automatically backup your grow facility data daily
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <Separator />

              <div>
                <Button variant="destructive" className="mt-2">
                  Delete Account
                </Button>
                <p className="text-xs text-gray-500 mt-2">
                  Permanently delete your account and all associated data
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
