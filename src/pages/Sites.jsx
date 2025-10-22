
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Loader2, AlertCircle } from "lucide-react";
import SiteCard from "../components/admin/SiteCard";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function Sites() {
  const [showDialog, setShowDialog] = useState(false);
  const [editingSite, setEditingSite] = useState(null);
  const [formData, setFormData] = useState({ name: "", location: "", is_active: true, brand_scheme_id: "" });
  const [user, setUser] = React.useState(null);
  const [companyId, setCompanyId] = React.useState(null);
  const [company, setCompany] = React.useState(null);
  const [loadingUser, setLoadingUser] = React.useState(true);
  const queryClient = useQueryClient();

  React.useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        const viewingCompanyId = localStorage.getItem('superAdminViewingCompany');
        const effectiveCompanyId = currentUser.is_super_admin && viewingCompanyId 
          ? viewingCompanyId 
          : currentUser.company_id;
        
        setCompanyId(effectiveCompanyId);
        
        if (effectiveCompanyId) {
          const companies = await base44.entities.Company.filter({ id: effectiveCompanyId });
          if (companies.length > 0) {
            setCompany(companies[0]);
          }
        }
      } catch (error) {
        console.error("Error loading user:", error);
      } finally {
        setLoadingUser(false);
      }
    };
    loadUser();
  }, []);

  const { data: sites = [], isLoading } = useQuery({
    queryKey: ['sites', companyId],
    queryFn: () => base44.entities.Site.filter({ company_id: companyId }),
    enabled: !!companyId,
  });

  const { data: brandSchemes = [] } = useQuery({
    queryKey: ['brand-schemes', companyId],
    queryFn: () => base44.entities.BrandScheme.filter({ company_id: companyId }),
    enabled: !!companyId,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Site.create({ ...data, company_id: companyId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sites', companyId] });
      closeDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Site.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sites', companyId] });
      closeDialog();
    },
  });

  const closeDialog = () => {
    setShowDialog(false);
    setEditingSite(null);
    setFormData({ name: "", location: "", is_active: true, brand_scheme_id: "" });
  };

  const handleEdit = (site) => {
    setEditingSite(site);
    setFormData({
      name: site.name,
      location: site.location || "",
      is_active: site.is_active,
      brand_scheme_id: site.brand_scheme_id || ""
    });
    setShowDialog(true);
  };

  const copyDisplayUrl = (siteId) => {
    const url = `${window.location.origin}/SiteDisplay?site=${siteId}`;
    navigator.clipboard.writeText(url)
      .then(() => {
        alert('Display URL copied to clipboard!');
      })
      .catch((err) => {
        console.error('Failed to copy URL: ', err);
        alert('Failed to copy URL to clipboard. Please try again or copy manually.');
      });
  };

  const handleSubmit = () => {
    if (editingSite) {
      updateMutation.mutate({ id: editingSite.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const canAddSite = company && sites.length < company.max_sites;
  const atLimit = company && sites.length >= company.max_sites;

  if (loadingUser) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (!companyId) {
    return (
      <div className="p-6 md:p-8">
        <div className="max-w-3xl mx-auto">
          <Alert className="border-amber-200 bg-amber-50">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              You haven't been assigned to a company yet. Please contact support or create a company from the Super Admin Dashboard.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Sites</h1>
            <p className="text-gray-500 mt-2">
              Manage your locations {company && `(${sites.length}/${company.max_sites} used)`}
            </p>
          </div>
          <Button
            onClick={() => setShowDialog(true)}
            disabled={atLimit}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Site
          </Button>
        </div>

        {atLimit && (
          <Alert className="bg-amber-50 border-amber-200">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              You've reached your site limit ({company.max_sites} sites). Contact support to increase your limit.
            </AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
          </div>
        ) : sites.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-dashed">
            <p className="text-gray-500 mb-4">No sites added yet</p>
            <Button
              onClick={() => setShowDialog(true)}
              variant="outline"
              disabled={atLimit}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Site
            </Button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {sites.map((site) => (
              <div key={site.id}>
                <SiteCard
                  site={site}
                  onEdit={handleEdit}
                />
                <div className="mt-2 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyDisplayUrl(site.id)}
                    className="flex-1 text-xs"
                  >
                    📺 Copy Display URL
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(`/SiteDisplay?site=${site.id}`, '_blank')}
                    className="flex-1 text-xs"
                  >
                    👁️ Preview Display
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <Dialog open={showDialog} onOpenChange={closeDialog}>
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
                  placeholder="e.g., Downtown Location, Branch A"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location/Address</Label>
                <Input
                  id="location"
                  placeholder="e.g., 123 Main Street"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="brand_scheme">Brand Scheme (Optional)</Label>
                <Select
                  value={formData.brand_scheme_id || "none"}
                  onValueChange={(value) => setFormData({ ...formData, brand_scheme_id: value === "none" ? "" : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a brand scheme" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No brand scheme (default)</SelectItem>
                    {brandSchemes.map(scheme => (
                      <SelectItem key={scheme.id} value={scheme.id}>
                        {scheme.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="is_active">Active Site</Label>
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!formData.name || createMutation.isPending || updateMutation.isPending || (!editingSite && !canAddSite)}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {(createMutation.isPending || updateMutation.isPending) ? (
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
