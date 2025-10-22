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
import { Plus, Loader2 } from "lucide-react";
import ChannelCard from "../components/admin/ChannelCard";

export default function Channels() {
  const [showDialog, setShowDialog] = useState(false);
  const [newChannel, setNewChannel] = useState({ name: "" });
  const [user, setUser] = React.useState(null);
  const [companyId, setCompanyId] = React.useState(null);
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

  const { data: channels = [], isLoading } = useQuery({
    queryKey: ['channels', companyId],
    queryFn: () => base44.entities.Channel.filter({ company_id: companyId }),
    enabled: !!companyId,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Channel.create({ ...data, company_id: companyId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels', companyId] });
      setShowDialog(false);
      setNewChannel({ name: "" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Channel.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels', companyId] });
    },
  });

  const handleToggle = (channel) => {
    updateMutation.mutate({
      id: channel.id,
      data: { is_active: !channel.is_active }
    });
  };

  const handleCreate = () => {
    createMutation.mutate({ ...newChannel, is_active: true });
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
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Channels</h1>
            <p className="text-gray-500 mt-2">Manage your available TV channels</p>
          </div>
          <Button
            onClick={() => setShowDialog(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Channel
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : channels.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-dashed">
            <p className="text-gray-500 mb-4">No channels added yet</p>
            <Button
              onClick={() => setShowDialog(true)}
              variant="outline"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Channel
            </Button>
          </div>
        ) : (
          <div className="grid gap-4">
            {channels.map((channel) => (
              <ChannelCard
                key={channel.id}
                channel={channel}
                onToggle={handleToggle}
              />
            ))}
          </div>
        )}

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Channel</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Channel Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Sky Sports, BBC, ITV"
                  value={newChannel.name}
                  onChange={(e) => setNewChannel({ ...newChannel, name: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!newChannel.name || createMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  "Add Channel"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}