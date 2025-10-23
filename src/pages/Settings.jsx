import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { profilesService } from "@/services/database";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, Shield, Save } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function Settings() {
  const { profile, loading: authLoading } = useAuth();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [saveMessage, setSaveMessage] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (profile) {
      setIsSuperAdmin(profile.is_super_admin || false);
    }
  }, [profile]);

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      return await profilesService.updateProfile(profile.id, {
        is_super_admin: data.is_super_admin
      });
    },
    onSuccess: () => {
      setSaveMessage({ type: "success", text: "Settings saved successfully!" });
      queryClient.invalidateQueries({ queryKey: ['user'] });
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    },
    onError: (error) => {
      setSaveMessage({ type: "error", text: "Failed to save settings. Please try again." });
      console.error("Error updating user:", error);
    },
  });

  const handleSave = () => {
    setSaveMessage(null);
    updateMutation.mutate({ is_super_admin: isSuperAdmin });
  };

  if (authLoading || !profile) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-500 mt-2">Manage your account settings</p>
        </div>

        {saveMessage && (
          <Alert className={saveMessage.type === "success" ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}>
            <AlertDescription className={saveMessage.type === "success" ? "text-green-800" : "text-red-800"}>
              {saveMessage.text}
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm text-gray-500">Name</Label>
              <p className="text-lg font-semibold text-gray-900">{user?.full_name}</p>
            </div>
            <div>
              <Label className="text-sm text-gray-500">Email</Label>
              <p className="text-lg font-semibold text-gray-900">{user?.email}</p>
            </div>
            <div>
              <Label className="text-sm text-gray-500">Role</Label>
              <p className="text-lg font-semibold text-gray-900 capitalize">{user?.role}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Super Admin Access
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-indigo-50 rounded-lg border border-indigo-200">
              <div className="flex-1">
                <Label htmlFor="super-admin" className="font-semibold text-gray-900 cursor-pointer">
                  Enable Super Admin
                </Label>
                <p className="text-sm text-gray-600 mt-1">
                  Grant full access to manage all companies and system settings
                </p>
              </div>
              <Switch
                id="super-admin"
                checked={isSuperAdmin}
                onCheckedChange={setIsSuperAdmin}
              />
            </div>

            <Button
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Settings
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}