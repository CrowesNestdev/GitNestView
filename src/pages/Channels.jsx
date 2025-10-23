import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { channelsService } from "@/services/database";
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
import { Tv, Plus, Loader2, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function Channels() {
  const { profile } = useAuth();
  const [companyId, setCompanyId] = useState(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingChannel, setEditingChannel] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    logo_url: "",
    channel_number: ""
  });

  const queryClient = useQueryClient();

  useEffect(() => {
    if (!profile) return;
    const viewingCompanyId = localStorage.getItem('superAdminViewingCompany');
    setCompanyId(viewingCompanyId || profile.company_id);
  }, [profile]);

  const { data: channels = [], isLoading } = useQuery({
    queryKey: ['channels', companyId],
    queryFn: () => channelsService.getByCompany(companyId),
    enabled: !!companyId,
  });

  const createChannelMutation = useMutation({
    mutationFn: (data) => channelsService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels', companyId] });
      toast.success("Channel created successfully");
      closeDialog();
    },
    onError: (error) => {
      toast.error("Failed to create channel: " + error.message);
    },
  });

  const updateChannelMutation = useMutation({
    mutationFn: ({ id, data }) => channelsService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels', companyId] });
      toast.success("Channel updated successfully");
      closeDialog();
    },
    onError: (error) => {
      toast.error("Failed to update channel: " + error.message);
    },
  });

  const deleteChannelMutation = useMutation({
    mutationFn: (id) => channelsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels', companyId] });
      toast.success("Channel deleted successfully");
    },
    onError: (error) => {
      toast.error("Failed to delete channel: " + error.message);
    },
  });

  const closeDialog = () => {
    setShowAddDialog(false);
    setEditingChannel(null);
    setFormData({
      name: "",
      logo_url: "",
      channel_number: ""
    });
  };

  const handleEdit = (channel) => {
    setEditingChannel(channel);
    setFormData({
      name: channel.name,
      logo_url: channel.logo_url || "",
      channel_number: channel.channel_number || ""
    });
    setShowAddDialog(true);
  };

  const handleSubmit = () => {
    if (editingChannel) {
      updateChannelMutation.mutate({ id: editingChannel.id, data: formData });
    } else {
      createChannelMutation.mutate({
        ...formData,
        company_id: companyId,
        is_active: true
      });
    }
  };

  const handleDelete = (id) => {
    if (confirm("Are you sure you want to delete this channel?")) {
      deleteChannelMutation.mutate(id);
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
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Channels</h1>
            <p className="text-gray-500 mt-2">
              Manage TV channels available for your venues
            </p>
          </div>
          <Button
            onClick={() => setShowAddDialog(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Channel
          </Button>
        </div>

        {channels.length === 0 ? (
          <Card className="p-12 text-center">
            <Tv className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500 text-lg mb-4">No channels added yet</p>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add First Channel
            </Button>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>All Channels</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Channel</TableHead>
                    <TableHead>Channel Number</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {channels.map((channel) => (
                    <TableRow key={channel.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center">
                            {channel.logo_url ? (
                              <img
                                src={channel.logo_url}
                                alt={channel.name}
                                className="w-8 h-8 object-contain rounded"
                              />
                            ) : (
                              <Tv className="w-5 h-5 text-blue-700" />
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{channel.name}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{channel.channel_number || "—"}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={channel.is_active ? "default" : "secondary"}>
                          {channel.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            onClick={() => handleEdit(channel)}
                            variant="outline"
                            size="sm"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            onClick={() => handleDelete(channel.id)}
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
                {editingChannel ? "Edit Channel" : "Add New Channel"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Channel Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., ESPN, Sky Sports"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="channel_number">Channel Number</Label>
                <Input
                  id="channel_number"
                  placeholder="e.g., 101, HD201"
                  value={formData.channel_number}
                  onChange={(e) => setFormData({ ...formData, channel_number: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="logo_url">Logo URL (optional)</Label>
                <Input
                  id="logo_url"
                  placeholder="https://example.com/logo.png"
                  value={formData.logo_url}
                  onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!formData.name || createChannelMutation.isPending || updateChannelMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {(createChannelMutation.isPending || updateChannelMutation.isPending) ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {editingChannel ? "Updating..." : "Adding..."}
                  </>
                ) : (
                  editingChannel ? "Update Channel" : "Add Channel"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
