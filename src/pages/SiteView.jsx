
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Tv, Loader2, Volume2, VolumeX, AlertCircle } from "lucide-react";
import { format, isToday, isTomorrow, isThisWeek } from "date-fns";
import { Alert, AlertDescription } from "@/components/ui/alert";

const sportColors = {
  football: "bg-green-100 text-green-800 border-green-200",
  rugby: "bg-blue-100 text-blue-800 border-blue-200",
  cricket: "bg-yellow-100 text-yellow-800 border-yellow-200",
  tennis: "bg-pink-100 text-pink-800 border-pink-200",
  formula1: "bg-red-100 text-red-800 border-red-200",
  boxing: "bg-purple-100 text-purple-800 border-purple-200",
  golf: "bg-emerald-100 text-emerald-800 border-emerald-200",
  other: "bg-gray-100 text-gray-800 border-gray-200"
};

export default function SiteView() {
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [companyId, setCompanyId] = useState(null); // Added companyId state

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        setCompanyId(currentUser.company_id); // Set companyId here
      } catch (error) {
        console.error("Error loading user:", error);
      } finally {
        setLoadingUser(false);
      }
    };
    loadUser();
  }, []);

  const { data: site } = useQuery({
    queryKey: ['site', user?.site_id],
    queryFn: () => base44.entities.Site.filter({ id: user.site_id }),
    enabled: !!user?.site_id,
    select: (data) => data[0],
  });

  const { data: schedules = [], isLoading: loadingSchedules } = useQuery({
    queryKey: ['schedules', user?.site_id],
    queryFn: () => base44.entities.SiteSchedule.filter({ site_id: user.site_id }),
    enabled: !!user?.site_id,
  });

  const { data: events = [] } = useQuery({
    queryKey: ['events', companyId], // Added companyId to query key
    queryFn: () => base44.entities.SportEvent.filter({ company_id: companyId }, 'start_time'), // Filter by company_id
    enabled: !!companyId, // Enable only when companyId is available
  });

  const { data: channels = [] } = useQuery({
    queryKey: ['channels', companyId], // Added companyId to query key
    queryFn: () => base44.entities.Channel.filter({ company_id: companyId }), // Filter by company_id
    enabled: !!companyId, // Enable only when companyId is available
  });

  if (loadingUser) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user?.site_id) {
    return (
      <div className="p-6 md:p-8">
        <div className="max-w-3xl mx-auto">
          <Alert className="border-amber-200 bg-amber-50">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              You have not been assigned to a site yet. Please contact your administrator to assign you to a site.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const siteEvents = events
    .filter(event => {
      const eventDate = new Date(event.start_time);
      return eventDate >= today && schedules.some(s => s.event_id === event.id);
    })
    .sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

  const todayEvents = siteEvents.filter(e => isToday(new Date(e.start_time)));
  const tomorrowEvents = siteEvents.filter(e => isTomorrow(new Date(e.start_time)));
  const thisWeekEvents = siteEvents.filter(e => 
    isThisWeek(new Date(e.start_time)) && !isToday(new Date(e.start_time)) && !isTomorrow(new Date(e.start_time))
  );

  const getScheduleForEvent = (eventId) => {
    return schedules.find(s => s.event_id === eventId);
  };

  const renderEventCard = (event) => {
    const channel = channels.find(c => c.id === event.channel_id);
    const schedule = getScheduleForEvent(event.id);
    
    return (
      <Card key={event.id} className="hover:shadow-md transition-shadow">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div>
              <div className="flex items-start justify-between gap-3 mb-2">
                <h3 className="font-bold text-xl text-gray-900 leading-tight flex-1">
                  {event.title}
                </h3>
                {schedule?.show_with_sound && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 rounded-lg">
                    <Volume2 className="w-4 h-4 text-blue-700" />
                    <span className="text-xs font-semibold text-blue-700">SOUND ON</span>
                  </div>
                )}
              </div>
              <Badge className={`${sportColors[event.sport_type]} border`}>
                {event.sport_type}
              </Badge>
            </div>

            <div className="space-y-2 border-t pt-4">
              <div className="flex items-center gap-3 text-gray-600">
                <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                  <Clock className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Time</p>
                  <p className="font-semibold text-gray-900">
                    {format(new Date(event.start_time), "h:mm a")}
                    {event.end_time && ` - ${format(new Date(event.end_time), "h:mm a")}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-gray-600">
                <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center">
                  <Tv className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Channel</p>
                  <p className="font-bold text-gray-900 text-lg">
                    {channel?.name || 'Unknown'}
                  </p>
                </div>
              </div>
            </div>

            {event.description && (
              <p className="text-sm text-gray-600 border-t pt-4">
                {event.description}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="p-6 md:p-8 min-h-screen">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="space-y-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Schedule</h1>
            {site && (
              <p className="text-gray-500 mt-2">
                Viewing schedule for: <span className="font-semibold text-gray-700">{site.name}</span>
                {site.location && <span className="text-gray-400"> • {site.location}</span>}
              </p>
            )}
          </div>
        </div>

        {loadingSchedules ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
          </div>
        ) : siteEvents.length === 0 ? (
          <Card className="p-12 text-center">
            <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500 text-lg">No upcoming events scheduled for your site</p>
          </Card>
        ) : (
          <div className="space-y-8">
            {todayEvents.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-8 bg-green-500 rounded-full" />
                  <h2 className="text-2xl font-bold text-gray-900">Today</h2>
                </div>
                <div className="grid gap-4">
                  {todayEvents.map(renderEventCard)}
                </div>
              </div>
            )}

            {tomorrowEvents.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-8 bg-blue-500 rounded-full" />
                  <h2 className="text-2xl font-bold text-gray-900">Tomorrow</h2>
                </div>
                <div className="grid gap-4">
                  {tomorrowEvents.map(renderEventCard)}
                </div>
              </div>
            )}

            {thisWeekEvents.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-8 bg-purple-500 rounded-full" />
                  <h2 className="text-2xl font-bold text-gray-900">This Week</h2>
                </div>
                <div className="grid gap-4">
                  {thisWeekEvents.map(event => {
                    const channel = channels.find(c => c.id === event.channel_id);
                    const schedule = getScheduleForEvent(event.id);
                    
                    return (
                      <Card key={event.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-6">
                          <div className="space-y-4">
                            <div className="flex justify-between items-start gap-4">
                              <div className="flex-1">
                                <h3 className="font-bold text-xl text-gray-900 leading-tight">
                                  {event.title}
                                </h3>
                                <div className="flex items-center gap-2 mt-2">
                                  <Badge className={`${sportColors[event.sport_type]} border`}>
                                    {event.sport_type}
                                  </Badge>
                                  {schedule?.show_with_sound && (
                                    <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                                      <Volume2 className="w-3 h-3 mr-1" />
                                      Sound On
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-sm text-gray-500">
                                  {format(new Date(event.start_time), "EEEE")}
                                </p>
                                <p className="font-semibold text-gray-900">
                                  {format(new Date(event.start_time), "MMM d")}
                                </p>
                              </div>
                            </div>

                            <div className="space-y-2 border-t pt-4">
                              <div className="flex items-center gap-3">
                                <Clock className="w-5 h-5 text-blue-600" />
                                <span className="font-semibold text-gray-900">
                                  {format(new Date(event.start_time), "h:mm a")}
                                </span>
                              </div>
                              <div className="flex items-center gap-3">
                                <Tv className="w-5 h-5 text-purple-600" />
                                <span className="font-bold text-gray-900 text-lg">
                                  {channel?.name}
                                </span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
