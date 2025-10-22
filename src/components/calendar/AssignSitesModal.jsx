import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Volume2 } from "lucide-react";
import { Label } from "@/components/ui/label";

export default function AssignSitesModal({ 
  event, 
  sites, 
  currentAssignments,
  onClose, 
  onConfirm,
  isLoading 
}) {
  const [selectedSites, setSelectedSites] = useState(
    new Set(currentAssignments.map(a => a.site_id))
  );
  const [showWithSound, setShowWithSound] = useState(
    currentAssignments.length > 0 ? currentAssignments[0].show_with_sound : false
  );
  const [selectAll, setSelectAll] = useState(false);

  const toggleSite = (siteId) => {
    const newSelected = new Set(selectedSites);
    if (newSelected.has(siteId)) {
      newSelected.delete(siteId);
    } else {
      newSelected.add(siteId);
    }
    setSelectedSites(newSelected);
    setSelectAll(newSelected.size === sites.length);
  };

  const toggleAll = () => {
    if (selectAll) {
      setSelectedSites(new Set());
      setSelectAll(false);
    } else {
      setSelectedSites(new Set(sites.map(s => s.id)));
      setSelectAll(true);
    }
  };

  const handleConfirm = () => {
    onConfirm(Array.from(selectedSites), showWithSound);
  };

  if (!event) return null;

  return (
    <Dialog open={!!event} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Assign Sites</DialogTitle>
          <p className="text-sm text-gray-500 mt-2">{event.title}</p>
        </DialogHeader>

        <div className="py-4">
          <div className="flex items-center space-x-2 pb-4 border-b mb-4">
            <Checkbox
              id="select-all"
              checked={selectAll}
              onCheckedChange={toggleAll}
            />
            <label
              htmlFor="select-all"
              className="font-semibold text-sm cursor-pointer"
            >
              Select All Sites
            </label>
          </div>

          <ScrollArea className="h-64">
            <div className="space-y-3">
              {sites.filter(s => s.is_active).map((site) => (
                <div
                  key={site.id}
                  className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Checkbox
                    id={site.id}
                    checked={selectedSites.has(site.id)}
                    onCheckedChange={() => toggleSite(site.id)}
                  />
                  <label
                    htmlFor={site.id}
                    className="flex-1 cursor-pointer"
                  >
                    <p className="font-medium text-gray-900">{site.name}</p>
                    {site.location && (
                      <p className="text-xs text-gray-500">{site.location}</p>
                    )}
                  </label>
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center space-x-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
              <Checkbox
                id="show-with-sound"
                checked={showWithSound}
                onCheckedChange={setShowWithSound}
              />
              <Label
                htmlFor="show-with-sound"
                className="flex items-center gap-2 cursor-pointer font-medium"
              >
                <Volume2 className="w-4 h-4 text-blue-600" />
                Show with sound
              </Label>
            </div>
            <p className="text-xs text-gray-500 mt-2 ml-3">
              Enable audio for this event at the selected sites
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={isLoading || selectedSites.size === 0}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Confirming...
              </>
            ) : (
              `Confirm (${selectedSites.size} ${selectedSites.size === 1 ? 'site' : 'sites'})`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}