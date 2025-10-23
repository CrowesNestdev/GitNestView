
import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { profilesService, sitesService } from "@/services/database";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Loader2, Mail, MapPin, Shield, User as UserIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function Users() {
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [selectedSite, setSelectedSite] = useState("");
  
  const { profile } = useAuth();
  const [companyId, setCompanyId] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!profile) return;

    const viewingCompanyId = localStorage.getItem('superAdminViewingCompany');
    if (profile.is_super_admin && viewingCompanyId) {
      setCompanyId(viewingCompanyId);
    } else {
      setCompanyId(profile.company_id);
    }
  }, [profile]);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users', companyId],
    queryFn: () => profilesService.getCompanyUsers(companyId),
    enabled: !!companyId,
  });

  const { data: sites = [] } = useQuery({
    queryKey: ['sites', companyId],
    queryFn: () => sitesService.getByCompany(companyId),
    enabled: !!companyId,
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }) => profilesService.updateProfile(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', companyId] });
      setEditingUser(null);
      setSelectedSite("");
    },
  });

  const handleEditUser = (user) => {
    setEditingUser(user);
    setSelectedSite(user.site_id || "");
  };

  const handleUpdateSite = () => {
    if (editingUser) {
      updateUserMutation.mutate({
        id: editingUser.id,
        data: { site_id: selectedSite || null }
      });
    }
  };

  if (!companyId || isLoading) { // Also check isLoading from users query
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const siteUsers = users.filter(u => u.role === 'user');
  const adminUsers = users.filter(u => u.role === 'admin');

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
            <p className="text-gray-500 mt-2">Manage users and assign them to sites</p>
          </div>
          <Button
            onClick={() => setShowInviteDialog(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Invite User
          </Button>
        </div>

        <Alert className="bg-blue-50 border-blue-200">
          <Mail className="w-4 h-4 text-blue-600" />
          <AlertDescription className="text-sm text-gray-700">
            To invite users, use the invite functionality in the Dashboard tab. 
            Once invited, you can assign them to sites here.
          </AlertDescription>
        </Alert>

        <Card>
          <CardContent className="p-6">
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Shield className="w-5 h-5 text-purple-600" />
                  <h2 className="text-xl font-bold text-gray-900">Administrators</h2>
                  <Badge variant="secondary">{adminUsers.length}</Badge>
                </div>
                {adminUsers.length === 0 ? (
                  <p className="text-sm text-gray-500">No administrators</p>
                ) : (
                  <div className="space-y-2">
                    {adminUsers.map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-4 bg-purple-50 rounded-lg border border-purple-200">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center">
                            <UserIcon className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{user.full_name}</p>
                            <p className="text-sm text-gray-500">{user.email}</p>
                          </div>
                        </div>
                        <Badge className="bg-purple-100 text-purple-800">Admin</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t pt-6">
                <div className="flex items-center gap-2 mb-4">
                  <UserIcon className="w-5 h-5 text-blue-600" />
                  <h2 className="text-xl font-bold text-gray-900">Site Users</h2>
                  <Badge variant="secondary">{siteUsers.length}</Badge>
                </div>
                {siteUsers.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <UserIcon className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <p className="text-gray-500">No site users yet</p>
                    <p className="text-sm text-gray-400 mt-1">Invite users through the Dashboard</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Assigned Site</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {siteUsers.map((user) => {
                        const userSite = sites.find(s => s.id === user.site_id);
                        return (
                          <TableRow key={user.id}>
                            <TableCell className="font-medium">{user.full_name}</TableCell>
                            <TableCell className="text-gray-600">{user.email}</TableCell>
                            <TableCell>
                              {userSite ? (
                                <div className="flex items-center gap-2">
                                  <MapPin className="w-4 h-4 text-blue-600" />
                                  <span className="font-medium">{userSite.name}</span>
                                </div>
                              ) : (
                                <Badge variant="outline" className="text-gray-500">
                                  Not assigned
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                onClick={() => handleEditUser(user)}
                                variant="outline"
                                size="sm"
                              >
                                Assign Site
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite User</DialogTitle>
            </DialogHeader>
            <Alert className="bg-blue-50 border-blue-200">
              <Mail className="w-4 h-4" />
              <AlertDescription className="text-sm">
                Please use the invite user functionality in the Dashboard tab (top right menu) to invite new users. 
                After they accept the invitation, you can assign them to a site here.
              </AlertDescription>
            </Alert>
            <DialogFooter>
              <Button onClick={() => setShowInviteDialog(false)}>
                Got it
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!editingUser} onOpenChange={() => { setEditingUser(null); setSelectedSite(""); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign Site to User</DialogTitle>
            </DialogHeader>
            {editingUser && (
              <div className="space-y-4 py-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">User</p>
                  <p className="font-semibold text-gray-900">{editingUser.full_name}</p>
                  <p className="text-sm text-gray-600">{editingUser.email}</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="site">Assign to Site</Label>
                  <Select value={selectedSite} onValueChange={setSelectedSite}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a site" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">No site (unassigned)</SelectItem>
                      {sites.filter(s => s.is_active).map(site => (
                        <SelectItem key={site.id} value={site.id}>
                          {site.name} {site.location && `- ${site.location}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => { setEditingUser(null); setSelectedSite(""); }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateSite}
                disabled={updateUserMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {updateUserMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Assignment"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
