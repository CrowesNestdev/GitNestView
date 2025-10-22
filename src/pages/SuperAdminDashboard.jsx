import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
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
import { Building2, Plus, Loader2, Eye, Settings as SettingsIcon, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function SuperAdminDashboard() {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    max_sites: 5,
    contact_email: "",
    contact_phone: ""
  });
  
  const queryClient = useQueryClient();

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ['companies'],
    queryFn: () => base44.entities.Company.list('-created_date'),
  });

  const { data: allSites = [] } = useQuery({
    queryKey: ['all-sites'],
    queryFn: () => base44.entities.Site.list(),
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => base44.entities.User.list(),
  });

  const createCompanyMutation = useMutation({
    mutationFn: (data) => base44.entities.Company.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      closeDialog();
    },
  });

  const updateCompanyMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Company.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      closeDialog();
    },
  });

  const closeDialog = () => {
    setShowAddDialog(false);
    setEditingCompany(null);
    setFormData({
      name: "",
      max_sites: 5,
      contact_email: "",
      contact_phone: ""
    });
  };

  const handleEdit = (company) => {
    setEditingCompany(company);
    setFormData({
      name: company.name,
      max_sites: company.max_sites,
      contact_email: company.contact_email || "",
      contact_phone: company.contact_phone || ""
    });
    setShowAddDialog(true);
  };

  const handleSubmit = () => {
    if (editingCompany) {
      updateCompanyMutation.mutate({ id: editingCompany.id, data: formData });
    } else {
      createCompanyMutation.mutate({ ...formData, is_active: true });
    }
  };

  const getCompanyStats = (companyId) => {
    const sites = allSites.filter(s => s.company_id === companyId);
    const users = allUsers.filter(u => u.company_id === companyId && u.role !== 'admin');
    const admins = allUsers.filter(u => u.company_id === companyId && u.role === 'admin');
    
    return { sites: sites.length, users: users.length, admins: admins.length };
  };

  const handleViewCompany = (companyId) => {
    localStorage.setItem('superAdminViewingCompany', companyId);
    window.location.href = createPageUrl("AdminDashboard");
  };

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Super Admin Dashboard</h1>
            <p className="text-gray-500 mt-2">Manage all companies and their accounts</p>
          </div>
          <Button
            onClick={() => setShowAddDialog(true)}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Company
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
          </div>
        ) : companies.length === 0 ? (
          <Card className="p-12 text-center">
            <Building2 className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500 text-lg mb-4">No companies yet</p>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add First Company
            </Button>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>All Companies</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Sites</TableHead>
                    <TableHead>Admins</TableHead>
                    <TableHead>Users</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companies.map((company) => {
                    const stats = getCompanyStats(company.id);
                    const siteLimit = `${stats.sites}/${company.max_sites}`;
                    const nearLimit = stats.sites >= company.max_sites * 0.8;
                    
                    return (
                      <TableRow key={company.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-lg flex items-center justify-center">
                              <Building2 className="w-5 h-5 text-indigo-700" />
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">{company.name}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {company.contact_email && (
                              <p className="text-gray-600">{company.contact_email}</p>
                            )}
                            {company.contact_phone && (
                              <p className="text-gray-500">{company.contact_phone}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={nearLimit ? "destructive" : "secondary"}>
                            {siteLimit}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{stats.admins}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{stats.users}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={company.is_active ? "default" : "secondary"}>
                            {company.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              onClick={() => handleViewCompany(company.id)}
                              variant="outline"
                              size="sm"
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Button>
                            <Button
                              onClick={() => handleEdit(company)}
                              variant="outline"
                              size="sm"
                            >
                              <SettingsIcon className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        <Dialog open={showAddDialog} onOpenChange={closeDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingCompany ? "Edit Company" : "Add New Company"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Company Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Acme Sports Bars"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max_sites">Maximum Sites</Label>
                <Input
                  id="max_sites"
                  type="number"
                  min="1"
                  value={formData.max_sites}
                  onChange={(e) => setFormData({ ...formData, max_sites: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_email">Contact Email</Label>
                <Input
                  id="contact_email"
                  type="email"
                  placeholder="contact@company.com"
                  value={formData.contact_email}
                  onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_phone">Contact Phone</Label>
                <Input
                  id="contact_phone"
                  type="tel"
                  placeholder="+44 123 456 7890"
                  value={formData.contact_phone}
                  onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!formData.name || createCompanyMutation.isPending || updateCompanyMutation.isPending}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {(createCompanyMutation.isPending || updateCompanyMutation.isPending) ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {editingCompany ? "Updating..." : "Adding..."}
                  </>
                ) : (
                  editingCompany ? "Update Company" : "Add Company"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}