import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { sportsEventsService, channelsService, sitesService, siteEventsService } from "@/services/database";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
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
import { Calendar, Plus, Loader2, Sparkles, Filter, RefreshCw, Eye, EyeOff, MapPin } from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/lib/supabase";

export default function SportsCalendar() {
  const { profile } = useAuth();
  const [companyId, setCompanyId] = useState(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [assigningEvent, setAssigningEvent] = useState(null);
  const [selectedSites, setSelectedSites] = useState([]);
  const [isAutoPopulating, setIsAutoPopulating] = useState(false);
  const [selectedSport, setSelectedSport] = useState("All Sports");
  const [showHidden, setShowHidden] = useState(false);

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
    is_featured: false,
    is_hidden: false
  });

  const queryClient = useQueryClient();

  useEffect(() => {
    if (!profile) return;
    const viewingCompanyId = localStorage.getItem('superAdminViewingCompany');
    setCompanyId(viewingCompanyId || profile.company_id);
  }, [profile]);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['events', companyId],
    queryFn: () => sportsEventsService.getByCompany(companyId),
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
      is_featured: false,
      is_hidden: false
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
      is_featured: event.is_featured || false,
      is_hidden: event.is_hidden || false
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

  const handleToggleHidden = async (event) => {
    try {
      await updateEventMutation.mutateAsync({
        id: event.id,
        data: { is_hidden: !event.is_hidden }
      });
    } catch (error) {
      console.error('Error toggling visibility:', error);
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

  const handleAutoPopulate = async () => {
    if (channels.length === 0) {
      toast.error("Please add channels first before auto-populating events");
      return;
    }

    setIsAutoPopulating(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error("Not authenticated");
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/scrape-sports-events`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            company_id: companyId,
            channels: channels,
          }),
        }
      );

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to populate events');
      }

      toast.success(`Successfully added ${result.count} events!`);
      queryClient.invalidateQueries({ queryKey: ['events'] });
    } catch (error) {
      console.error('Auto-populate error:', error);
      toast.error('Failed to auto-populate events: ' + error.message);
    } finally {
      setIsAutoPopulating(false);
    }
  };

  if (!companyId || isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const sportTypes = ["All Sports", ...new Set(events.map(e => e.sport_type).filter(Boolean))];

  const filteredEvents = events.filter(event => {
    const matchesSport = selectedSport === "All Sports" || event.sport_type === selectedSport;
    const matchesHidden = showHidden || !event.is_hidden;
    return matchesSport && matchesHidden;
  });

  const visibleCount = filteredEvents.length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b bg-white sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Filter className="w-5 h-5 text-gray-400" />
              <div className="flex gap-2 flex-wrap">
                {sportTypes.map((sport) => (
                  <Button
                    key={sport}
                    variant={selectedSport === sport ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedSport(sport)}
                    className={selectedSport === sport ? "bg-gray-900" : ""}
                  >
                    {sport}
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowHidden(!showHidden)}
              >
                {showHidden ? <Eye className="w-4 h-4 mr-2" /> : <EyeOff className="w-4 h-4 mr-2" />}
                {showHidden ? "Hide Hidden" : "Show Hidden"}
              </Button>
              <Button
                onClick={handleAutoPopulate}
                disabled={isAutoPopulating || channels.length === 0}
                variant="outline"
                size="sm"
              >
                {isAutoPopulating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Auto-Populate
                  </>
                )}
              </Button>
              <Button size="sm" onClick={() => setShowAddDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Event
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <p className="text-gray-600">Showing {visibleCount} events</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['events'] })}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh Calendar
          </Button>
        </div>

        {filteredEvents.length === 0 ? (
          <Card className="p-12 text-center">
            <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500 text-lg mb-4">No events found</p>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Event
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredEvents.map((event) => {
              const channel = channels.find(c => c.id === event.channel_id);
              return (
                <Card key={event.id} className={`hover:shadow-lg transition-shadow ${event.is_hidden ? 'opacity-60' : ''}`}>
                  <CardContent className="p-5">
                    <div className="mb-3">
                      <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                        {event.title}
                      </h3>
                      <div className="flex gap-2 flex-wrap">
                        {event.sport_type && (
                          <Badge variant="secondary" className={
                            event.sport_type === 'Football' ? 'bg-green-100 text-green-700' :
                            event.sport_type === 'Basketball' ? 'bg-orange-100 text-orange-700' :
                            event.sport_type === 'American Football' ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-700'
                          }>
                            {event.sport_type.toLowerCase()}
                          </Badge>
                        )}
                        {event.is_featured && (
                          <Badge className="bg-yellow-500">Featured</Badge>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2 text-sm text-gray-600 mb-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>{format(parseISO(event.start_time), "EEEE, MMMM d, yyyy")}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>
                          {format(parseISO(event.start_time), "h:mm a")}
                          {event.end_time && ` - ${format(parseISO(event.end_time), "h:mm a")}`}
                        </span>
                      </div>
                      {channel && (
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          <span>{channel.name}</span>
                        </div>
                      )}
                    </div>

                    {event.description && (
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2">{event.description}</p>
                    )}

                    <div className="flex gap-2 pt-3 border-t">
                      <Button
                        onClick={() => handleAssignSites(event)}
                        variant="default"
                        size="sm"
                        className="flex-1 bg-blue-600 hover:bg-blue-700"
                      >
                        <MapPin className="w-3 h-3 mr-1" />
                        Assign to Sites
                      </Button>
                      <Button
                        onClick={() => handleToggleHidden(event)}
                        variant="outline"
                        size="sm"
                      >
                        {event.is_hidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

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
              <div className="col-span-2 space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is_featured"
                    checked={formData.is_featured}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_featured: checked })}
                  />
                  <Label htmlFor="is_featured" className="cursor-pointer">
                    Mark as featured event
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is_hidden"
                    checked={formData.is_hidden}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_hidden: checked })}
                  />
                  <Label htmlFor="is_hidden" className="cursor-pointer">
                    Hide this event
                  </Label>
                </div>
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
  );
}
