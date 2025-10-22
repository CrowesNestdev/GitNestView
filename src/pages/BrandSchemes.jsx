import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Loader2, Palette, Eye } from "lucide-react";
import BrandSchemePreview from "../components/branding/BrandSchemePreview";

export default function BrandSchemes() {
  const [showDialog, setShowDialog] = useState(false);
  const [editingScheme, setEditingScheme] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    primary_color: "#10b981",
    secondary_color: "#3b82f6",
    background_start: "#1f2937",
    background_end: "#1e3a8a",
    text_color: "#ffffff",
    border_color: "#06b6d4",
    logo_url: ""
  });
  
  const [user, setUser] = useState(null);
  const [companyId, setCompanyId] = useState(null);
  const queryClient = useQueryClient();

  React.useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        const viewingCompanyId = localStorage.getItem('superAdminViewingCompany');
        if (currentUser.is_super_admin && viewingCompanyId) {
          setCompanyId(viewingCompanyId);
        } else {
          setCompanyId(currentUser.company_id);
        }
      } catch (error) {
        console.error("Error loading user:", error);
      }
    };
    loadUser();
  }, []);

  const { data: schemes = [], isLoading } = useQuery({
    queryKey: ['brand-schemes', companyId],
    queryFn: () => base44.entities.BrandScheme.filter({ company_id: companyId }),
    enabled: !!companyId,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.BrandScheme.create({ ...data, company_id: companyId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brand-schemes', companyId] });
      closeDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.BrandScheme.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brand-schemes', companyId] });
      closeDialog();
    },
  });

  const closeDialog = () => {
    setShowDialog(false);
    setEditingScheme(null);
    setFormData({
      name: "",
      primary_color: "#10b981",
      secondary_color: "#3b82f6",
      background_start: "#1f2937",
      background_end: "#1e3a8a",
      text_color: "#ffffff",
      border_color: "#06b6d4",
      logo_url: ""
    });
  };

  const handleEdit = (scheme) => {
    setEditingScheme(scheme);
    setFormData({
      name: scheme.name,
      primary_color: scheme.primary_color,
      secondary_color: scheme.secondary_color,
      background_start: scheme.background_start,
      background_end: scheme.background_end,
      text_color: scheme.text_color,
      border_color: scheme.border_color,
      logo_url: scheme.logo_url || ""
    });
    setShowDialog(true);
  };

  const handleSubmit = () => {
    if (editingScheme) {
      updateMutation.mutate({ id: editingScheme.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  if (!companyId) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Brand Schemes</h1>
            <p className="text-gray-500 mt-2">Customize the look of your site displays</p>
          </div>
          <Button
            onClick={() => setShowDialog(true)}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Scheme
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
          </div>
        ) : schemes.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-dashed">
            <Palette className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500 mb-4">No brand schemes yet</p>
            <Button
              onClick={() => setShowDialog(true)}
              variant="outline"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Scheme
            </Button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {schemes.map((scheme) => (
              <Card key={scheme.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="w-5 h-5" />
                    {scheme.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Primary</p>
                      <div 
                        className="w-full h-10 rounded border"
                        style={{ backgroundColor: scheme.primary_color }}
                      />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Secondary</p>
                      <div 
                        className="w-full h-10 rounded border"
                        style={{ backgroundColor: scheme.secondary_color }}
                      />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Background Gradient</p>
                    <div 
                      className="w-full h-10 rounded border"
                      style={{ 
                        background: `linear-gradient(to right, ${scheme.background_start}, ${scheme.background_end})`
                      }}
                    />
                  </div>
                  <Button
                    onClick={() => handleEdit(scheme)}
                    variant="outline"
                    className="w-full"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Edit & Preview
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={showDialog} onOpenChange={closeDialog}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingScheme ? "Edit Brand Scheme" : "Create Brand Scheme"}
              </DialogTitle>
            </DialogHeader>
            
            <div className="grid lg:grid-cols-2 gap-6 py-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Scheme Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Dark Blue Theme"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="primary_color">Primary Color</Label>
                    <Input
                      id="primary_color"
                      type="color"
                      value={formData.primary_color}
                      onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                      className="h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="secondary_color">Secondary Color</Label>
                    <Input
                      id="secondary_color"
                      type="color"
                      value={formData.secondary_color}
                      onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                      className="h-12"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="background_start">Background Start</Label>
                    <Input
                      id="background_start"
                      type="color"
                      value={formData.background_start}
                      onChange={(e) => setFormData({ ...formData, background_start: e.target.value })}
                      className="h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="background_end">Background End</Label>
                    <Input
                      id="background_end"
                      type="color"
                      value={formData.background_end}
                      onChange={(e) => setFormData({ ...formData, background_end: e.target.value })}
                      className="h-12"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="text_color">Text Color</Label>
                    <Input
                      id="text_color"
                      type="color"
                      value={formData.text_color}
                      onChange={(e) => setFormData({ ...formData, text_color: e.target.value })}
                      className="h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="border_color">Border/Accent Color</Label>
                    <Input
                      id="border_color"
                      type="color"
                      value={formData.border_color}
                      onChange={(e) => setFormData({ ...formData, border_color: e.target.value })}
                      className="h-12"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="logo_url">Logo URL (Optional)</Label>
                  <Input
                    id="logo_url"
                    placeholder="https://example.com/logo.png"
                    value={formData.logo_url}
                    onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label className="mb-2 block">Live Preview</Label>
                <BrandSchemePreview scheme={formData} />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!formData.name || createMutation.isPending || updateMutation.isPending}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {(createMutation.isPending || updateMutation.isPending) ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {editingScheme ? "Updating..." : "Creating..."}
                  </>
                ) : (
                  editingScheme ? "Update Scheme" : "Create Scheme"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}