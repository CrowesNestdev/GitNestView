import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { sportsEventsService, channelsService, sitesService, siteEventsService } from "@/services/database";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
import { Calendar, Plus, Loader2, Edit, Trash2, MapPin } from "lucide-react";
import { toast } from "sonner";
import { format, parseISO, startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";

export default function SportsCalendar() {
  const { profile } = useAuth();
  const [companyId, setCompanyId] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [assigningEvent, setAssigningEvent] = useState(null);
  const [selectedSites, setSelectedSites] = useState([]);

  const [formData, setFormData] = useState({
    title: "",
    sport_type: "",
    league: "",
    home_team: "",
    away_team: "",
    start_time: "",
    end_time: "",
    channel_id: "",
    description: "",
    is_featured: false
  });

  const queryClient = useQueryClient();

  useEffect(() => {
    if (!profile) return;
    const viewingCompanyId = localStorage.getItem('superAdminViewingCompany');
    setCompanyId(viewingCompanyId || profile.company_id);
  }, [profile]);

  const startDate = startOfMonth(currentMonth).toISOString();
  const endDate = endOfMonth(currentMonth).toISOString();

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['events', companyId, startDate, endDate],
    queryFn: () => sportsEventsService.getByCompany(companyId, startDate, endDate),
    enabled: !!companyId,
  });

  const { data: channels = [] } = useQuery({
    queryKey: ['channels', companyId],
    queryFn: () => channelsService.getByCompany(companyId),
    enabled: !!companyId,
  });

  const { data: sites = [] } = useQuery({
    queryKey: ['sites', companyId],
    queryFn: () => sitesService.getByCompany(companyId),
    enabled: !!companyId,
  });

  const createEventMutation = useMutation({
    mutationFn: (data) => sportsEventsService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success("Event created successfully");
      closeDialog();
    },
    onError: (error) => {
      toast.error("Failed to create event: " + error.message);
    },
  });

  const updateEventMutation = useMutation({
    mutationFn: ({ id, data }) => sportsEventsService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success("Event updated successfully");
      closeDialog();
    },
    onError: (error) => {
      toast.error("Failed to update event: " + error.message);
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: (id) => sportsEventsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success("Event deleted successfully");
    },
    onError: (error) => {
      toast.error("Failed to delete event: " + error.message);
    },
  });

  const assignSitesMutation = useMutation({
    mutationFn: ({ eventId, siteIds }) => siteEventsService.assignEventsToSites(eventId, siteIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      toast.success("Sites assigned successfully");
      setShowAssignDialog(false);
      setAssigningEvent(null);
      setSelectedSites([]);
    },
    onError: (error) => {
      toast.error("Failed to assign sites: " + error.message);
    },
  });

  const closeDialog = () => {
    setShowAddDialog(false);
    setEditingEvent(null);
    setFormData({
      title: "",
      sport_type: "",
      league: "",
      home_team: "",
      away_team: "",
      start_time: "",
      end_time: "",
      channel_id: "",
      description: "",
      is_featured: false
    });
  };

  const handleEdit = (event) => {
    setEditingEvent(event);
    setFormData({
      title: event.title,
      sport_type: event.sport_type || "",
      league: event.league || "",
      home_team: event.home_team || "",
      away_team: event.away_team || "",
      start_time: event.start_time ? format(parseISO(event.start_time), "yyyy-MM-dd'T'HH:mm") : "",
      end_time: event.end_time ? format(parseISO(event.end_time), "yyyy-MM-dd'T'HH:mm") : "",
      channel_id: event.channel_id || "",
      description: event.description || "",
      is_featured: event.is_featured || false
    });
    setShowAddDialog(true);
  };

  const handleSubmit = () => {
    const eventData = {
      ...formData,
      company_id: companyId,
      start_time: new Date(formData.start_time).toISOString(),
      end_time: formData.end_time ? new Date(formData.end_time).toISOString() : null,
      channel_id: formData.channel_id || null,
    };

    if (editingEvent) {
      updateEventMutation.mutate({ id: editingEvent.id, data: eventData });
    } else {
      createEventMutation.mutate(eventData);
    }
  };

  const handleDelete = (id) => {
    if (confirm("Are you sure you want to delete this event?")) {
      deleteEventMutation.mutate(id);
    }
  };

  const handleAssignSites = (event) => {
    setAssigningEvent(event);
    setSelectedSites([]);
    setShowAssignDialog(true);
  };

  const handleSiteToggle = (siteId) => {
    setSelectedSites(prev =>
      prev.includes(siteId)
        ? prev.filter(id => id !== siteId)
        : [...prev, siteId]
    );
  };

  const handleAssignSubmit = () => {
    if (selectedSites.length === 0) {
      toast.error("Please select at least one site");
      return;
    }
    assignSitesMutation.mutate({
      eventId: assigningEvent.id,
      siteIds: selectedSites
    });
  };

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

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
            <h1 className="text-3xl font-bold text-gray-900">Sports Calendar</h1>
            <p className="text-gray-500 mt-2">Manage and schedule sporting events</p>
          </div>
          <Button
            onClick={() => setShowAddDialog(true)}
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Event
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                {format(currentMonth, "MMMM yyyy")}
              </CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={prevMonth}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" onClick={nextMonth}>
                  Next
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {events.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-500 text-lg mb-4">No events this month</p>
                <Button onClick={() => setShowAddDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Event
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {events.map((event) => {
                  const channel = channels.find(c => c.id === event.channel_id);
                  return (
                    <div
                      key={event.id}
                      className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-gray-900">{event.title}</h3>
                            {event.is_featured && (
                              <Badge variant="default" className="bg-yellow-500">
                                Featured
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-gray-600 space-y-1">
                            {event.home_team && event.away_team && (
                              <p>{event.home_team} vs {event.away_team}</p>
                            )}
                            {event.league && (
                              <p className="text-gray-500">{event.league} {event.sport_type && `• ${event.sport_type}`}</p>
                            )}
                            <p className="font-medium text-gray-700">
                              {format(parseISO(event.start_time), "MMM d, h:mm a")}
                              {event.end_time && ` - ${format(parseISO(event.end_time), "h:mm a")}`}
                            </p>
                            {channel && (
                              <p className="text-blue-600">{channel.name}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleAssignSites(event)}
                            variant="outline"
                            size="sm"
                          >
                            <MapPin className="w-4 h-4 mr-1" />
                            Assign
                          </Button>
                          <Button
                            onClick={() => handleEdit(event)}
                            variant="outline"
                            size="sm"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            onClick={() => handleDelete(event.id)}
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={showAddDialog} onOpenChange={closeDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingEvent ? "Edit Event" : "Add New Event"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="title">Event Title</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Premier League: Arsenal vs Chelsea"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sport_type">Sport</Label>
                  <Input
                    id="sport_type"
                    placeholder="e.g., Football, Basketball"
                    value={formData.sport_type}
                    onChange={(e) => setFormData({ ...formData, sport_type: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="league">League/Competition</Label>
                  <Input
                    id="league"
                    placeholder="e.g., Premier League, NBA"
                    value={formData.league}
                    onChange={(e) => setFormData({ ...formData, league: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="home_team">Home Team</Label>
                  <Input
                    id="home_team"
                    placeholder="e.g., Arsenal"
                    value={formData.home_team}
                    onChange={(e) => setFormData({ ...formData, home_team: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="away_team">Away Team</Label>
                  <Input
                    id="away_team"
                    placeholder="e.g., Chelsea"
                    value={formData.away_team}
                    onChange={(e) => setFormData({ ...formData, away_team: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="start_time">Start Time</Label>
                  <Input
                    id="start_time"
                    type="datetime-local"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_time">End Time (optional)</Label>
                  <Input
                    id="end_time"
                    type="datetime-local"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="channel_id">Channel</Label>
                  <Select
                    value={formData.channel_id}
                    onValueChange={(value) => setFormData({ ...formData, channel_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a channel" />
                    </SelectTrigger>
                    <SelectContent>
                      {channels.map((channel) => (
                        <SelectItem key={channel.id} value={channel.id}>
                          {channel.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="description">Description (optional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Additional event details..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="col-span-2 flex items-center space-x-2">
                  <Checkbox
                    id="is_featured"
                    checked={formData.is_featured}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_featured: checked })}
                  />
                  <Label htmlFor="is_featured" className="cursor-pointer">
                    Mark as featured event
                  </Label>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!formData.title || !formData.start_time || createEventMutation.isPending || updateEventMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                {(createEventMutation.isPending || updateEventMutation.isPending) ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {editingEvent ? "Updating..." : "Adding..."}
                  </>
                ) : (
                  editingEvent ? "Update Event" : "Add Event"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showAssignDialog} onOpenChange={() => {
          setShowAssignDialog(false);
          setAssigningEvent(null);
          setSelectedSites([]);
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign Event to Sites</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm text-gray-600 mb-4">
                Select which sites should display this event:
              </p>
              {sites.length === 0 ? (
                <p className="text-sm text-gray-500 italic">No sites available</p>
              ) : (
                <div className="space-y-3">
                  {sites.map((site) => (
                    <div key={site.id} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                      <Checkbox
                        id={`site-${site.id}`}
                        checked={selectedSites.includes(site.id)}
                        onCheckedChange={() => handleSiteToggle(site.id)}
                      />
                      <Label htmlFor={`site-${site.id}`} className="flex-1 cursor-pointer">
                        <p className="font-medium">{site.name}</p>
                        {site.location && (
                          <p className="text-sm text-gray-500">{site.location}</p>
                        )}
                      </Label>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setShowAssignDialog(false);
                setAssigningEvent(null);
                setSelectedSites([]);
              }}>
                Cancel
              </Button>
              <Button
                onClick={handleAssignSubmit}
                disabled={selectedSites.length === 0 || assignSitesMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                {assignSitesMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Assigning...
                  </>
                ) : (
                  `Assign to ${selectedSites.length} Site${selectedSites.length !== 1 ? 's' : ''}`
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
