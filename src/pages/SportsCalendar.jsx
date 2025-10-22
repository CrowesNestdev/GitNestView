
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Loader2, Filter, RefreshCw, Calendar, Globe, CheckCircle2 } from "lucide-react";
import EventCard from "../components/calendar/EventCard";
import AssignSitesModal from "../components/calendar/AssignSitesModal";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const SPORT_TYPES = ["football", "rugby", "cricket", "tennis", "formula1", "boxing", "golf", "other"];

export default function SportsCalendar() {
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [assigningEvent, setAssigningEvent] = useState(null);
  const [filterSport, setFilterSport] = useState("all");
  const [showHiddenEvents, setShowHiddenEvents] = useState(false); // New state for hidden events
  const [isAutoPopulating, setIsAutoPopulating] = useState(false);
  const [autoPopulateResult, setAutoPopulateResult] = useState(null);
  const [searchedSources, setSearchedSources] = useState(null);
  const [customWebsites, setCustomWebsites] = useState(""); // New state for custom websites
  const [newEvent, setNewEvent] = useState({
    title: "",
    sport_type: "football",
    channel_id: "",
    start_time: "",
    end_time: "",
    description: ""
  });
  
  const [user, setUser] = useState(null);
  const [companyId, setCompanyId] = useState(null);
  
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

  const { data: channels = [] } = useQuery({
    queryKey: ['channels', companyId],
    queryFn: () => base44.entities.Channel.filter({ company_id: companyId }),
    enabled: !!companyId,
  });

  const { data: sites = [] } = useQuery({
    queryKey: ['sites', companyId],
    queryFn: () => base44.entities.Site.filter({ company_id: companyId }),
    enabled: !!companyId,
  });

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['events', companyId],
    queryFn: () => base44.entities.SportEvent.filter({ company_id: companyId }, 'start_time'),
    enabled: !!companyId,
  });

  const { data: schedules = [] } = useQuery({
    queryKey: ['schedules', companyId],
    queryFn: async () => {
      // Fetch all schedules, then filter based on sites belonging to the current company
      const allSchedules = await base44.entities.SiteSchedule.list();
      const companySiteIds = sites.map(s => s.id);
      return allSchedules.filter(s => companySiteIds.includes(s.site_id));
    },
    enabled: !!companyId && sites.length > 0, // Ensure companyId and sites are loaded
  });

  const createEventMutation = useMutation({
    mutationFn: (data) => base44.entities.SportEvent.create({ ...data, company_id: companyId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events', companyId] });
      setShowEventDialog(false);
      setNewEvent({
        title: "",
        sport_type: "football",
        channel_id: "",
        start_time: "",
        end_time: "",
        description: ""
      });
    },
  });

  const updateEventMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.SportEvent.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events', companyId] });
    },
  });

  const [isAssigning, setIsAssigning] = useState(false);

  const handleAutoPopulate = async () => {
    setIsAutoPopulating(true);
    setAutoPopulateResult(null);
    setSearchedSources(null); // Reset searched sources on new populate attempt

    try {
      const activeChannels = channels.filter(c => c.is_active);
      
      if (activeChannels.length === 0) {
        setAutoPopulateResult({
          success: false,
          message: "No active channels found. Please add and activate channels first."
        });
        setIsAutoPopulating(false);
        return;
      }

      const channelNames = activeChannels.map(c => c.name).join(", ");
      
      const additionalWebsites = customWebsites.trim() 
        ? `\n\nALSO specifically check these additional websites provided by the user:\n${customWebsites}`
        : "";
      
      const prompt = `Search the internet comprehensively for sports TV schedules. Find ALL upcoming sports events for the next 4 weeks (28 days from today) that will be broadcast on these UK TV channels: ${channelNames}.

IMPORTANT: Search these specific sources and types of websites:
1. Official channel websites (e.g., Sky Sports schedule, BT Sport schedule, TNT Sports schedule)
2. TV listings sites (e.g., TVGuide, RadioTimes, What's On TV)
3. Sports league websites (Premier League, UEFA, Formula1.com, etc.)
4. Broadcasting schedules and EPG data
5. Sports news sites (BBC Sport, Sky Sports News, etc.)${additionalWebsites}

For EACH event found, provide:
- Exact event title including teams/competitors
- Sport type (football, rugby, cricket, tennis, formula1, boxing, golf, or other)
- Broadcasting channel (must match: ${channelNames})
- Start date and time: YYYY-MM-DDTHH:MM:SS (UK time)
- End time estimate
- Description with league/competition name

CRITICAL - Cover ALL these sports comprehensively:

FOOTBALL (Premier League, Champions League, Europa League, FA Cup, Carabao Cup, internationals)
RUGBY (Six Nations, Premiership, URC, Champions Cup, internationals)
CRICKET (Tests, ODIs, T20s, The Hundred, IPL, County Cricket)
TENNIS (Grand Slams, ATP/WTA tour events)
FORMULA 1 (Practice, Qualifying, Race for EVERY Grand Prix - check F1 calendar specifically, including Free Practice 1, 2, 3, 4, Qualifying, and Race sessions if available on the specified channels for each race weekend!)
BOXING (All scheduled fights and title bouts)
GOLF (Majors, PGA Tour, DP World Tour, Ryder Cup)

List ALL sources you searched at the end so we can verify coverage.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            events: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  sport_type: { 
                    type: "string",
                    enum: ["football", "rugby", "cricket", "tennis", "formula1", "boxing", "golf", "other"]
                  },
                  channel_name: { type: "string" },
                  start_time: { type: "string" },
                  end_time: { type: "string" },
                  description: { type: "string" }
                },
                required: ["title", "sport_type", "channel_name", "start_time"]
              }
            },
            sources_searched: {
              type: "array",
              items: { type: "string" },
              description: "List of websites and sources checked for schedule data"
            },
            sport_breakdown: { // Added for easier summary display
              type: "object",
              properties: {
                football: { type: "number" },
                rugby: { type: "number" },
                cricket: { type: "number" },
                tennis: { type: "number" },
                formula1: { type: "number" },
                boxing: { type: "number" },
                golf: { type: "number" },
                other: { type: "number" }
              },
              additionalProperties: false // Ensures only defined sport types are allowed
            }
          }
        }
      });

      if (result.events && result.events.length > 0) {
        let addedCount = 0;
        let skippedCount = 0;
        const sportCounts = {}; // Fallback if LLM doesn't provide sport_breakdown

        SPORT_TYPES.forEach(sport => { sportCounts[sport] = 0; });
        
        for (const eventData of result.events) {
          const channel = activeChannels.find(c => {
            const channelLower = c.name.toLowerCase().trim();
            const eventChannelLower = eventData.channel_name.toLowerCase().trim();
            return channelLower === eventChannelLower || 
                   channelLower.includes(eventChannelLower) ||
                   eventChannelLower.includes(channelLower);
          });
          
          if (channel && eventData.start_time) {
            try {
              const startTime = eventData.start_time.includes('T') 
                ? eventData.start_time 
                : `${eventData.start_time}T00:00:00`;
              
              const endTime = eventData.end_time && eventData.end_time.includes('T')
                ? eventData.end_time
                : eventData.end_time
                ? `${eventData.end_time}T00:00:00`
                : "";

              await base44.entities.SportEvent.create({
                title: eventData.title,
                sport_type: eventData.sport_type,
                channel_id: channel.id,
                start_time: startTime,
                end_time: endTime,
                description: eventData.description || "",
                company_id: companyId // Add company_id here
              });
              addedCount++;
              if (sportCounts[eventData.sport_type] !== undefined) {
                sportCounts[eventData.sport_type]++;
              } else {
                sportCounts['other']++; // Default to 'other' if sport_type is unexpected
              }
            } catch (error) {
              console.error("Error adding event:", error);
              skippedCount++;
            }
          } else {
            skippedCount++;
          }
        }

        queryClient.invalidateQueries({ queryKey: ['events', companyId] });
        
        setSearchedSources({
          sources: result.sources_searched || [],
          sportBreakdown: result.sport_breakdown || sportCounts, // Use LLM's breakdown if available, else our calculated one
          totalFound: result.events.length,
          addedCount,
          skippedCount
        });
        
        setAutoPopulateResult({
          success: true,
          message: `Successfully added ${addedCount} events for the next 4 weeks! Check summary below.`
        });
      } else {
        setAutoPopulateResult({
          success: false,
          message: "No events found for your channels. Please check that your channel names match UK broadcasters."
        });
        setSearchedSources({
          sources: result.sources_searched || [],
          totalFound: 0,
          addedCount: 0,
          skippedCount: 0,
          sportBreakdown: SPORT_TYPES.reduce((acc, sport) => ({ ...acc, [sport]: 0 }), {})
        });
      }
    } catch (error) {
      console.error("Error auto-populating calendar:", error);
      setAutoPopulateResult({
        success: false,
        message: "An error occurred while searching for events. Please try again."
      });
      setSearchedSources(null);
    }

    setIsAutoPopulating(false);
  };

  const handleHideEvent = async (event) => {
    await updateEventMutation.mutateAsync({
      id: event.id,
      data: { is_hidden: !event.is_hidden }
    });
  };

  const handleAssignSites = async (siteIds, showWithSound) => {
    setIsAssigning(true);
    try {
      // Filter schedules by event_id and company's sites to get current assignments relevant to this event and company
      const currentAssignments = schedules.filter(s => s.event_id === assigningEvent.id);
      const currentSiteIds = currentAssignments.map(a => a.site_id);
      
      const toAdd = siteIds.filter(id => !currentSiteIds.includes(id));
      const toRemove = currentSiteIds.filter(id => !siteIds.includes(id));
      
      for (const siteId of toAdd) {
        await base44.entities.SiteSchedule.create({
          event_id: assigningEvent.id,
          site_id: siteId,
          show_with_sound: showWithSound
        });
      }
      
      // Update existing assignments if showWithSound has changed
      for (const siteId of siteIds) {
        if (currentSiteIds.includes(siteId)) {
          const assignment = currentAssignments.find(a => a.site_id === siteId);
          if (assignment && assignment.show_with_sound !== showWithSound) {
            await base44.entities.SiteSchedule.update(assignment.id, {
              show_with_sound: showWithSound
            });
          }
        }
      }
      
      for (const siteId of toRemove) {
        const assignment = currentAssignments.find(a => a.site_id === siteId);
        if (assignment) {
          await base44.entities.SiteSchedule.delete(assignment.id);
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ['schedules', companyId] }); // Invalidate with companyId
      setAssigningEvent(null);
    } catch (error) {
      console.error("Error assigning sites:", error);
    }
    setIsAssigning(false);
  };

  const activeChannels = channels.filter(c => c.is_active);
  
  const upcomingEvents = events.filter(event => {
    const eventDate = new Date(event.start_time);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize today's date to start of day
    return eventDate >= today;
  });
  
  const visibleEvents = showHiddenEvents 
    ? upcomingEvents 
    : upcomingEvents.filter(e => !e.is_hidden);
  
  const filteredEvents = filterSport === "all" 
    ? visibleEvents 
    : visibleEvents.filter(e => e.sport_type === filterSport);

  const getAssignedSites = (eventId) => {
    return schedules.filter(s => s.event_id === eventId);
  };

  if (!companyId) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Sports Calendar</h1>
            <p className="text-gray-500 mt-2">Auto-populated from internet sports schedules</p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={handleAutoPopulate}
              disabled={isAutoPopulating}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
            >
              {isAutoPopulating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Searching Internet...
                </>
              ) : (
                <>
                  <Globe className="w-4 h-4 mr-2" />
                  Load Next 4 Weeks
                </>
              )}
            </Button>
            <Button
              onClick={() => setShowEventDialog(true)}
              className="bg-green-600 hover:bg-green-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Manually
            </Button>
          </div>
        </div>

        {autoPopulateResult && (
          <Alert variant={autoPopulateResult.success ? "default" : "destructive"} className="border-2">
            <Calendar className="w-4 h-4" />
            <AlertDescription className="font-medium">{autoPopulateResult.message}</AlertDescription>
          </Alert>
        )}

        {searchedSources && (
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-blue-600" />
                Search Results Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {searchedSources.sportBreakdown && (
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">Events by Sport:</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(searchedSources.sportBreakdown).map(([sport, count]) => (
                      count > 0 && (
                        <Badge key={sport} variant="secondary" className="px-3 py-1">
                          {sport.charAt(0).toUpperCase() + sport.slice(1)}: {count}
                        </Badge>
                      )
                    ))}
                  </div>
                  {searchedSources.sportBreakdown.formula1 === 0 && (
                    <p className="text-sm text-amber-700 mt-2">
                      ⚠️ No Formula 1 events found - this may be because there are no F1 races in the next 4 weeks, or the channels don't broadcast F1.
                    </p>
                  )}
                </div>
              )}

              {searchedSources.sources && searchedSources.sources.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">Sources Searched:</p>
                  <div className="bg-white rounded-lg p-3 max-h-40 overflow-y-auto">
                    <ul className="text-sm text-gray-600 space-y-1">
                      {searchedSources.sources.map((source, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                          <span>{source}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              <div className="text-sm text-gray-600 pt-2 border-t">
                <p>Total events found: <strong>{searchedSources.totalFound}</strong></p>
                <p>Successfully added: <strong>{searchedSources.addedCount}</strong></p>
                {searchedSources.skippedCount > 0 && (
                  <p className="text-amber-600">Skipped: {searchedSources.skippedCount} (missing/invalid data)</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <Globe className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">Smart Internet Search</h3>
              <p className="text-sm text-gray-600 mt-1">
                Click "Load Next 4 Weeks" to automatically search the internet for sports schedules on your active channels. 
                The system searches multiple sources including official TV guides, league websites, and broadcasting schedules.
              </p>
              {activeChannels.length > 0 && (
                <p className="text-sm text-blue-700 font-medium mt-2">
                  Currently searching for: {activeChannels.map(c => c.name).join(', ')}
                </p>
              )}
            </div>
          </div>
          
          <div className="space-y-2 border-t border-blue-200 pt-4">
            <Label htmlFor="custom-websites" className="text-sm font-semibold text-gray-900">
              Additional Websites (Optional)
            </Label>
            <Textarea
              id="custom-websites"
              placeholder="Enter specific websites to check, one per line (e.g., https://example.com/tv-schedule)"
              value={customWebsites}
              onChange={(e) => setCustomWebsites(e.target.value)}
              rows={3}
              className="text-sm"
            />
            <p className="text-xs text-gray-500">
              Add any specific websites you know have sports schedules that we should check
            </p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-start md:items-center gap-3 justify-between">
          <div className="flex items-center gap-3">
            <Filter className="w-5 h-5 text-gray-400" />
            <Tabs value={filterSport} onValueChange={setFilterSport}>
              <TabsList className="bg-white border">
                <TabsTrigger value="all">All Sports</TabsTrigger>
                <TabsTrigger value="football">Football</TabsTrigger>
                <TabsTrigger value="rugby">Rugby</TabsTrigger>
                <TabsTrigger value="cricket">Cricket</TabsTrigger>
                <TabsTrigger value="tennis">Tennis</TabsTrigger>
                <TabsTrigger value="formula1">Formula 1</TabsTrigger>
                <TabsTrigger value="boxing">Boxing</TabsTrigger>
                <TabsTrigger value="golf">Golf</TabsTrigger>
                <TabsTrigger value="other">Other</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          
          <Button
            variant={showHiddenEvents ? "outline" : "default"}
            size="sm"
            onClick={() => setShowHiddenEvents(!showHiddenEvents)}
          >
            {showHiddenEvents ? "Hide Hidden Events" : "Show Hidden Events"}
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-green-600" />
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-dashed">
            <Globe className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500 mb-2 text-lg font-medium">
              {filterSport === "all" ? "No events in calendar yet" : `No ${filterSport.charAt(0).toUpperCase() + filterSport.slice(1)} events found`}
            </p>
            <p className="text-gray-400 text-sm mb-6">
              {activeChannels.length > 0 
                ? "Search the internet for upcoming sports on your channels"
                : "Please add and activate channels first"}
            </p>
            <div className="flex justify-center gap-3">
              <Button
                onClick={handleAutoPopulate}
                disabled={isAutoPopulating || activeChannels.length === 0}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                <Globe className="w-4 h-4 mr-2" />
                Load Next 4 Weeks
              </Button>
              <Button
                onClick={() => setShowEventDialog(true)}
                variant="outline"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Manually
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-500">
                Showing {filteredEvents.length} {filteredEvents.length === 1 ? 'event' : 'events'}
              </p>
              <Button
                onClick={handleAutoPopulate}
                disabled={isAutoPopulating}
                variant="outline"
                size="sm"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Calendar
              </Button>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEvents.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  channel={channels.find(c => c.id === event.channel_id)}
                  onAssign={setAssigningEvent}
                  onHide={handleHideEvent}
                  assignedSites={getAssignedSites(event.id)}
                />
              ))}
            </div>
          </>
        )}

        <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add New Sport Event</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
              <div className="space-y-2">
                <Label htmlFor="title">Event Title</Label>
                <Input
                  id="title"
                  placeholder="e.g., Premier League: Arsenal vs Chelsea"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sport_type">Sport Type</Label>
                <Select
                  value={newEvent.sport_type}
                  onValueChange={(value) => setNewEvent({ ...newEvent, sport_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SPORT_TYPES.map(sport => (
                      <SelectItem key={sport} value={sport}>
                        {sport.charAt(0).toUpperCase() + sport.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="channel">Channel</Label>
                <Select
                  value={newEvent.channel_id}
                  onValueChange={(value) => setNewEvent({ ...newEvent, channel_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select channel" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeChannels.map(channel => (
                      <SelectItem key={channel.id} value={channel.id}>
                        {channel.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_time">Start Time</Label>
                  <Input
                    id="start_time"
                    type="datetime-local"
                    value={newEvent.start_time}
                    onChange={(e) => setNewEvent({ ...newEvent, start_time: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_time">End Time (Optional)</Label>
                  <Input
                    id="end_time"
                    type="datetime-local"
                    value={newEvent.end_time}
                    onChange={(e) => setNewEvent({ ...newEvent, end_time: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Additional details about the event"
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEventDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => createEventMutation.mutate(newEvent)}
                disabled={!newEvent.title || !newEvent.channel_id || !newEvent.start_time || createEventMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                {createEventMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  "Add Event"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AssignSitesModal
          event={assigningEvent}
          sites={sites}
          currentAssignments={assigningEvent ? getAssignedSites(assigningEvent.id) : []}
          onClose={() => setAssigningEvent(null)}
          onConfirm={handleAssignSites}
          isLoading={isAssigning}
        />
      </div>
    </div>
  );
}
