import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { sitesService, companiesService, brandSchemesService, siteBrandSchemesService } from "@/services/database";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MapPin, Plus, Loader2, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function Sites() {
  const { profile } = useAuth();
  const [companyId, setCompanyId] = useState(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingSite, setEditingSite] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    location: "",
    timezone: "UTC",
    brandSchemeId: "none"
  });

  const queryClient = useQueryClient();

  useEffect(() => {
    if (!profile) return;
    const viewingCompanyId = localStorage.getItem('superAdminViewingCompany');
    setCompanyId(viewingCompanyId || profile.company_id);
  }, [profile]);

  const { data: sites = [], isLoading } = useQuery({
    queryKey: ['sites', companyId],
    queryFn: () => sitesService.getByCompany(companyId),
    enabled: !!companyId,
  });

  const { data: company } = useQuery({
    queryKey: ['company', companyId],
    queryFn: () => companiesService.getById(companyId),
    enabled: !!companyId,
  });

  const { data: brandSchemes = [] } = useQuery({
    queryKey: ['brand-schemes', companyId],
    queryFn: () => brandSchemesService.getByCompany(companyId),
    enabled: !!companyId,
  });

  const createSiteMutation = useMutation({
    mutationFn: (data) => sitesService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sites', companyId] });
      toast.success("Site created successfully");
      closeDialog();
    },
    onError: (error) => {
      toast.error("Failed to create site: " + error.message);
    },
  });

  const updateSiteMutation = useMutation({
    mutationFn: ({ id, data }) => sitesService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sites', companyId] });
      toast.success("Site updated successfully");
      closeDialog();
    },
    onError: (error) => {
      toast.error("Failed to update site: " + error.message);
    },
  });

  const deleteSiteMutation = useMutation({
    mutationFn: (id) => sitesService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sites', companyId] });
      toast.success("Site deleted successfully");
    },
    onError: (error) => {
      toast.error("Failed to delete site: " + error.message);
    },
  });

  const closeDialog = () => {
    setShowAddDialog(false);
    setEditingSite(null);
    setFormData({
      name: "",
      location: "",
      timezone: "UTC",
      brandSchemeId: "none"
    });
  };

  const handleEdit = async (site) => {
    setEditingSite(site);

    const siteBrandScheme = await siteBrandSchemesService.getBySite(site.id).catch(() => null);

    setFormData({
      name: site.name,
      location: site.location || "",
      timezone: site.timezone || "UTC",
      brandSchemeId: siteBrandScheme?.brand_scheme_id || "none"
    });
    setShowAddDialog(true);
  };

  const handleSubmit = async () => {
    const canAddMore = !company || sites.length < company.max_sites;

    if (!editingSite && !canAddMore) {
      toast.error(`Maximum of ${company.max_sites} sites reached`);
      return;
    }

    try {
      const siteData = {
        name: formData.name,
        location: formData.location,
        timezone: formData.timezone
      };

      let siteId;
      if (editingSite) {
        await updateSiteMutation.mutateAsync({ id: editingSite.id, data: siteData });
        siteId = editingSite.id;
      } else {
        const newSite = await createSiteMutation.mutateAsync({
          ...siteData,
          company_id: companyId,
          is_active: true
        });
        siteId = newSite.id;
      }

      if (formData.brandSchemeId && formData.brandSchemeId !== "none") {
        await siteBrandSchemesService.assignSchemeToSite(siteId, formData.brandSchemeId);
      } else if (editingSite) {
        await siteBrandSchemesService.removeSchemeFromSite(siteId);
      }

      closeDialog();
    } catch (error) {
      console.error('Error saving site:', error);
    }
  };

  const handleDelete = (id) => {
    if (confirm("Are you sure you want to delete this site?")) {
      deleteSiteMutation.mutate(id);
    }
  };

  if (!companyId || isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const canAddMore = !company || sites.length < company.max_sites;

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Sites</h1>
            <p className="text-gray-500 mt-2">
              Manage your venue locations {company && `(${sites.length}/${company.max_sites})`}
            </p>
          </div>
          <Button
            onClick={() => setShowAddDialog(true)}
            disabled={!canAddMore}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Site
          </Button>
        </div>

        {sites.length === 0 ? (
          <Card className="p-12 text-center">
            <MapPin className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500 text-lg mb-4">No sites added yet</p>
            <Button onClick={() => setShowAddDialog(true)} disabled={!canAddMore}>
              <Plus className="w-4 h-4 mr-2" />
              Add First Site
            </Button>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>All Sites</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Site Name</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Timezone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sites.map((site) => (
                    <TableRow key={site.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center">
                            <MapPin className="w-5 h-5 text-blue-700" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{site.name}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-gray-600">{site.location || "—"}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{site.timezone}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={site.is_active ? "default" : "secondary"}>
                          {site.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            onClick={() => handleEdit(site)}
                            variant="outline"
                            size="sm"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            onClick={() => handleDelete(site.id)}
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        <Dialog open={showAddDialog} onOpenChange={closeDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingSite ? "Edit Site" : "Add New Site"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Site Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Downtown Location"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location/Address</Label>
                <Input
                  id="location"
                  placeholder="e.g., 123 Main St, City"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Input
                  id="timezone"
                  placeholder="e.g., UTC, America/New_York"
                  value={formData.timezone}
                  onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="brandScheme">Brand Scheme (Optional)</Label>
                <Select
                  value={formData.brandSchemeId}
                  onValueChange={(value) => setFormData({ ...formData, brandSchemeId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a brand scheme" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {brandSchemes.map((scheme) => (
                      <SelectItem key={scheme.id} value={scheme.id}>
                        {scheme.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-gray-500">
                  Apply custom branding and colors to this site's display
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!formData.name || createSiteMutation.isPending || updateSiteMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {(createSiteMutation.isPending || updateSiteMutation.isPending) ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {editingSite ? "Updating..." : "Adding..."}
                  </>
                ) : (
                  editingSite ? "Update Site" : "Add Site"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
