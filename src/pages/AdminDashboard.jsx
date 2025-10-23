import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { channelsService, sitesService, sportsEventsService, siteEventsService } from "@/services/database";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tv, MapPin, Calendar, Activity } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format, isToday, isTomorrow, addDays } from "date-fns";

export default function AdminDashboard() {
  const { profile } = useAuth();
  const [companyId, setCompanyId] = React.useState(null);

  React.useEffect(() => {
    if (!profile) return;

    const viewingCompanyId = localStorage.getItem('superAdminViewingCompany');
    if (profile.is_super_admin && viewingCompanyId) {
      setCompanyId(viewingCompanyId);
    } else {
      setCompanyId(profile.company_id);
    }
  }, [profile]);

  const { data: channels = [], isLoading: loadingChannels } = useQuery({
    queryKey: ['channels', companyId],
    queryFn: () => channelsService.getByCompany(companyId),
    enabled: !!companyId,
  });

  const { data: sites = [], isLoading: loadingSites } = useQuery({
    queryKey: ['sites', companyId],
    queryFn: () => sitesService.getByCompany(companyId),
    enabled: !!companyId,
  });

  const { data: events = [], isLoading: loadingEvents } = useQuery({
    queryKey: ['events', companyId],
    queryFn: () => sportsEventsService.getByCompany(companyId),
    enabled: !!companyId,
  });

  const { data: schedules = [] } = useQuery({
    queryKey: ['schedules', companyId],
    queryFn: async () => {
      if (!sites.length) return [];
      const allSchedules = await Promise.all(
        sites.map(site => siteEventsService.getBySite(site.id))
      );
      return allSchedules.flat();
    },
    enabled: !!companyId && sites.length > 0,
  });

  const activeChannels = channels.filter(c => c.is_active).length;
  const activeSites = sites.filter(s => s.is_active).length;
  
  const upcomingEvents = events.filter(e => 
    new Date(e.start_time) >= new Date()
  ).slice(0, 5);

  const todayEvents = events.filter(e => isToday(new Date(e.start_time)));

  if (!companyId) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Skeleton className="h-64 w-full max-w-4xl" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-500 mt-2">Manage your sports viewing across all sites</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 transform translate-x-8 -translate-y-8 bg-blue-500 rounded-full opacity-10" />
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-500">
                  Active Channels
                </CardTitle>
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Tv className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingChannels ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <p className="text-3xl font-bold text-gray-900">{activeChannels}</p>
              )}
              <p className="text-xs text-gray-500 mt-2">of {channels.length} total</p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 transform translate-x-8 -translate-y-8 bg-purple-500 rounded-full opacity-10" />
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-500">
                  Active Sites
                </CardTitle>
                <div className="p-2 bg-purple-100 rounded-lg">
                  <MapPin className="w-5 h-5 text-purple-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingSites ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <p className="text-3xl font-bold text-gray-900">{activeSites}</p>
              )}
              <p className="text-xs text-gray-500 mt-2">of {sites.length} total</p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 transform translate-x-8 -translate-y-8 bg-green-500 rounded-full opacity-10" />
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-500">
                  Today's Events
                </CardTitle>
                <div className="p-2 bg-green-100 rounded-lg">
                  <Calendar className="w-5 h-5 text-green-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingEvents ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <p className="text-3xl font-bold text-gray-900">{todayEvents.length}</p>
              )}
              <p className="text-xs text-gray-500 mt-2">scheduled today</p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 transform translate-x-8 -translate-y-8 bg-orange-500 rounded-full opacity-10" />
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-500">
                  Total Assignments
                </CardTitle>
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Activity className="w-5 h-5 text-orange-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-gray-900">{schedules.length}</p>
              <p className="text-xs text-gray-500 mt-2">site-event pairs</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Upcoming Events
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingEvents ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : upcomingEvents.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No upcoming events scheduled</p>
                  <Link to={createPageUrl("SportsCalendar")}>
                    <p className="text-sm text-blue-600 hover:underline mt-2">
                      Add events to the calendar
                    </p>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingEvents.map(event => {
                    const channel = channels.find(c => c.id === event.channel_id);
                    return (
                      <div key={event.id} className="p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="flex justify-between items-start gap-3">
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900">{event.title}</p>
                            <p className="text-sm text-gray-500 mt-1">
                              {format(new Date(event.start_time), "MMM d, h:mm a")} • {channel?.name}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Link to={createPageUrl("Channels")}>
                  <div className="p-4 border rounded-lg hover:bg-blue-50 hover:border-blue-200 transition-all cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Tv className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">Manage Channels</p>
                        <p className="text-sm text-gray-500">Add or remove TV channels</p>
                      </div>
                    </div>
                  </div>
                </Link>

                <Link to={createPageUrl("Sites")}>
                  <div className="p-4 border rounded-lg hover:bg-purple-50 hover:border-purple-200 transition-all cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                        <MapPin className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">Manage Sites</p>
                        <p className="text-sm text-gray-500">Add or edit your locations</p>
                      </div>
                    </div>
                  </div>
                </Link>

                <Link to={createPageUrl("SportsCalendar")}>
                  <div className="p-4 border rounded-lg hover:bg-green-50 hover:border-green-200 transition-all cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">Sports Calendar</p>
                        <p className="text-sm text-gray-500">View and assign events</p>
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}