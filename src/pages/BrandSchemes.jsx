import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { brandSchemesService } from "@/services/database";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Loader2, Edit, Trash2, Palette } from "lucide-react";
import { toast } from "sonner";
import { BrandSchemePreview } from "@/components/branding/BrandSchemePreview";

export default function BrandSchemes() {
  const { profile } = useAuth();
  const [companyId, setCompanyId] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const [editingScheme, setEditingScheme] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    primary_color: "#10b981",
    secondary_color: "#3b82f6",
    background_start: "#1f2937",
    background_end: "#1e3a8a",
    text_color: "#ffffff",
    border_color: "#06b6d4",
    is_default: false
  });

  const queryClient = useQueryClient();

  useEffect(() => {
    if (!profile) return;
    const viewingCompanyId = localStorage.getItem('superAdminViewingCompany');
    setCompanyId(viewingCompanyId || profile.company_id);
  }, [profile]);

  const { data: schemes = [], isLoading } = useQuery({
    queryKey: ['brandSchemes', companyId],
    queryFn: () => brandSchemesService.getByCompany(companyId),
    enabled: !!companyId,
  });

  const createMutation = useMutation({
    mutationFn: (data) => brandSchemesService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brandSchemes', companyId] });
      toast.success("Brand scheme created successfully");
      closeDialog();
    },
    onError: (error) => {
      toast.error("Failed to create brand scheme: " + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => brandSchemesService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brandSchemes', companyId] });
      toast.success("Brand scheme updated successfully");
      closeDialog();
    },
    onError: (error) => {
      toast.error("Failed to update brand scheme: " + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => brandSchemesService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brandSchemes', companyId] });
      toast.success("Brand scheme deleted successfully");
    },
    onError: (error) => {
      toast.error("Failed to delete brand scheme: " + error.message);
    },
  });

  const closeDialog = () => {
    setShowDialog(false);
    setEditingScheme(null);
    setFormData({
      name: "",
      description: "",
      primary_color: "#10b981",
      secondary_color: "#3b82f6",
      background_start: "#1f2937",
      background_end: "#1e3a8a",
      text_color: "#ffffff",
      border_color: "#06b6d4",
      is_default: false
    });
  };

  const handleEdit = (scheme) => {
    setEditingScheme(scheme);
    setFormData({
      name: scheme.name,
      description: scheme.description || "",
      primary_color: scheme.primary_color || "#10b981",
      secondary_color: scheme.secondary_color || "#3b82f6",
      background_start: scheme.background_start || "#1f2937",
      background_end: scheme.background_end || "#1e3a8a",
      text_color: scheme.text_color || "#ffffff",
      border_color: scheme.border_color || "#06b6d4",
      is_default: scheme.is_default || false
    });
    setShowDialog(true);
  };

  const handleSubmit = () => {
    if (editingScheme) {
      updateMutation.mutate({ id: editingScheme.id, data: formData });
    } else {
      createMutation.mutate({
        ...formData,
        company_id: companyId
      });
    }
  };

  const handleDelete = (id) => {
    if (confirm("Are you sure you want to delete this brand scheme?")) {
      deleteMutation.mutate(id);
    }
  };

  if (!companyId || isLoading) {
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
            <p className="text-gray-500 mt-2">
              Create custom branding themes for your site displays
            </p>
          </div>
          <Button
            onClick={() => setShowDialog(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Scheme
          </Button>
        </div>

        {schemes.length === 0 ? (
          <Card className="p-12 text-center">
            <Palette className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500 text-lg mb-4">No brand schemes created yet</p>
            <Button onClick={() => setShowDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create First Scheme
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {schemes.map((scheme) => (
              <Card key={scheme.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {scheme.name}
                        {scheme.is_default && (
                          <Badge variant="default">Default</Badge>
                        )}
                      </CardTitle>
                      {scheme.description && (
                        <p className="text-sm text-gray-500 mt-1">{scheme.description}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleEdit(scheme)}
                        variant="outline"
                        size="sm"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => handleDelete(scheme.id)}
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <BrandSchemePreview scheme={scheme} />
                  <div className="grid grid-cols-4 gap-2 mt-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Primary</p>
                      <div
                        className="w-full h-8 rounded border"
                        style={{ backgroundColor: scheme.primary_color }}
                      />
                      <p className="text-xs text-gray-600 mt-1">{scheme.primary_color}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Secondary</p>
                      <div
                        className="w-full h-8 rounded border"
                        style={{ backgroundColor: scheme.secondary_color }}
                      />
                      <p className="text-xs text-gray-600 mt-1">{scheme.secondary_color}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Text</p>
                      <div
                        className="w-full h-8 rounded border"
                        style={{ backgroundColor: scheme.text_color }}
                      />
                      <p className="text-xs text-gray-600 mt-1">{scheme.text_color}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Border</p>
                      <div
                        className="w-full h-8 rounded border"
                        style={{ backgroundColor: scheme.border_color }}
                      />
                      <p className="text-xs text-gray-600 mt-1">{scheme.border_color}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={showDialog} onOpenChange={closeDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingScheme ? "Edit Brand Scheme" : "Create Brand Scheme"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Scheme Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Corporate Blue"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Describe this brand scheme..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="primary_color">Primary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="primary_color"
                      type="color"
                      value={formData.primary_color}
                      onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                      className="w-20 h-10"
                    />
                    <Input
                      type="text"
                      value={formData.primary_color}
                      onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                      placeholder="#10b981"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="secondary_color">Secondary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="secondary_color"
                      type="color"
                      value={formData.secondary_color}
                      onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                      className="w-20 h-10"
                    />
                    <Input
                      type="text"
                      value={formData.secondary_color}
                      onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                      placeholder="#3b82f6"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="background_start">Background Start</Label>
                  <div className="flex gap-2">
                    <Input
                      id="background_start"
                      type="color"
                      value={formData.background_start}
                      onChange={(e) => setFormData({ ...formData, background_start: e.target.value })}
                      className="w-20 h-10"
                    />
                    <Input
                      type="text"
                      value={formData.background_start}
                      onChange={(e) => setFormData({ ...formData, background_start: e.target.value })}
                      placeholder="#1f2937"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="background_end">Background End</Label>
                  <div className="flex gap-2">
                    <Input
                      id="background_end"
                      type="color"
                      value={formData.background_end}
                      onChange={(e) => setFormData({ ...formData, background_end: e.target.value })}
                      className="w-20 h-10"
                    />
                    <Input
                      type="text"
                      value={formData.background_end}
                      onChange={(e) => setFormData({ ...formData, background_end: e.target.value })}
                      placeholder="#1e3a8a"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="text_color">Text Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="text_color"
                      type="color"
                      value={formData.text_color}
                      onChange={(e) => setFormData({ ...formData, text_color: e.target.value })}
                      className="w-20 h-10"
                    />
                    <Input
                      type="text"
                      value={formData.text_color}
                      onChange={(e) => setFormData({ ...formData, text_color: e.target.value })}
                      placeholder="#ffffff"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="border_color">Border/Accent Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="border_color"
                      type="color"
                      value={formData.border_color}
                      onChange={(e) => setFormData({ ...formData, border_color: e.target.value })}
                      className="w-20 h-10"
                    />
                    <Input
                      type="text"
                      value={formData.border_color}
                      onChange={(e) => setFormData({ ...formData, border_color: e.target.value })}
                      placeholder="#06b6d4"
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 border rounded-lg bg-gray-50">
                <Label className="mb-2 block">Preview</Label>
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
                className="bg-blue-600 hover:bg-blue-700"
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
