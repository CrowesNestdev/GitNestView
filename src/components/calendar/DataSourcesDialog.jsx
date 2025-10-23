import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, Globe, Loader2 } from "lucide-react";

export default function DataSourcesDialog({ open, onOpenChange, companyId }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    url: "",
    description: "",
  });
  const queryClient = useQueryClient();

  const { data: sources = [], isLoading } = useQuery({
    queryKey: ['data-sources', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sports_data_sources')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: open && !!companyId,
  });

  const addSourceMutation = useMutation({
    mutationFn: async (newSource) => {
      const { data, error } = await supabase
        .from('sports_data_sources')
        .insert([{
          company_id: companyId,
          ...newSource,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['data-sources', companyId] });
      toast.success("Thanks! We will use this source for all future searches.");
      setFormData({ name: "", url: "", description: "" });
      setShowAddForm(false);
    },
    onError: (error) => {
      toast.error(`Failed to add source: ${error.message}`);
    },
  });

  const deleteSourceMutation = useMutation({
    mutationFn: async (sourceId) => {
      const { error } = await supabase
        .from('sports_data_sources')
        .delete()
        .eq('id', sourceId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['data-sources', companyId] });
      toast.success("Source removed");
    },
    onError: (error) => {
      toast.error(`Failed to remove source: ${error.message}`);
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ sourceId, isActive }) => {
      const { error } = await supabase
        .from('sports_data_sources')
        .update({ is_active: !isActive })
        .eq('id', sourceId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['data-sources', companyId] });
      toast.success("Source updated");
    },
    onError: (error) => {
      toast.error(`Failed to update source: ${error.message}`);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.url.trim()) {
      toast.error("Name and URL are required");
      return;
    }

    try {
      new URL(formData.url);
    } catch {
      toast.error("Please enter a valid URL");
      return;
    }

    addSourceMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Sports Data Sources</DialogTitle>
          <DialogDescription>
            Add websites where we can find sports schedule information. These sources will be used for all future event searches.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : sources.length === 0 && !showAddForm ? (
            <div className="text-center py-8">
              <Globe className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p className="text-gray-600 mb-4">No data sources added yet</p>
              <Button onClick={() => setShowAddForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add First Source
              </Button>
            </div>
          ) : (
            <>
              {sources.map((source) => (
                <div key={source.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-gray-900">{source.name}</h4>
                        <Badge variant={source.is_active ? "default" : "secondary"}>
                          {source.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline break-all"
                      >
                        {source.url}
                      </a>
                      {source.description && (
                        <p className="text-sm text-gray-600 mt-2">{source.description}</p>
                      )}
                      {source.scrape_count > 0 && (
                        <p className="text-xs text-gray-500 mt-2">
                          Used {source.scrape_count} time{source.scrape_count !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleActiveMutation.mutate({
                          sourceId: source.id,
                          isActive: source.is_active
                        })}
                      >
                        {source.is_active ? "Disable" : "Enable"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => {
                          if (confirm("Remove this data source?")) {
                            deleteSourceMutation.mutate(source.id);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}

              {!showAddForm && (
                <Button
                  onClick={() => setShowAddForm(true)}
                  variant="outline"
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Another Source
                </Button>
              )}
            </>
          )}

          {showAddForm && (
            <form onSubmit={handleSubmit} className="border rounded-lg p-4 space-y-4 bg-gray-50">
              <div>
                <Label htmlFor="name">Source Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., BBC Sport, ESPN"
                  required
                />
              </div>

              <div>
                <Label htmlFor="url">Website URL *</Label>
                <Input
                  id="url"
                  type="url"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  placeholder="https://example.com/sports-schedule"
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="What kind of sports data does this source provide?"
                  rows={2}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={addSourceMutation.isPending}
                >
                  {addSourceMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    "Add Source"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowAddForm(false);
                    setFormData({ name: "", url: "", description: "" });
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
