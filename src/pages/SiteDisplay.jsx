
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Tv, Calendar, Clock, Loader2 } from "lucide-react";
import { format, isToday, isTomorrow, isThisWeek, isFuture, isWithinInterval, addMinutes } from "date-fns";

// Mark this page as public by exporting this special property
export const isPublicPage = true;

const sportColors = {
  football: "bg-green-500",
  rugby: "bg-blue-500",
  cricket: "bg-yellow-500",
  tennis: "bg-pink-500",
  formula1: "bg-red-500",
  boxing: "bg-purple-500",
  golf: "bg-emerald-500",
  other: "bg-gray-500"
};

export default function SiteDisplay() {
  const [siteId, setSiteId] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [error, setError] = useState(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('site');
    if (!id) {
      setError("No site ID provided in URL");
    }
    setSiteId(id);

    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const { data: site, isLoading: siteLoading, error: siteError } = useQuery({
    queryKey: ['public-site', siteId],
    queryFn: async () => {
      try {
        const sites = await base44.entities.Site.filter({ id: siteId });
        return sites[0];
      } catch (err) {
        console.error("Error loading site:", err);
        throw err;
      }
    },
    enabled: !!siteId,
    refetchInterval: 300000,
    retry: 3,
  });

  const { data: schedules = [] } = useQuery({
    queryKey: ['public-schedules', siteId],
    queryFn: async () => {
      try {
        return await base44.entities.SiteSchedule.filter({ site_id: siteId });
      } catch (err) {
        console.error("Error loading schedules:", err);
        return [];
      }
    },
    enabled: !!siteId,
    refetchInterval: 300000,
  });

  const { data: events = [] } = useQuery({
    queryKey: ['public-events', site?.company_id],
    queryFn: async () => {
      try {
        return await base44.entities.SportEvent.filter({ company_id: site.company_id }, 'start_time');
      } catch (err) {
        console.error("Error loading events:", err);
        return [];
      }
    },
    enabled: !!site?.company_id,
    refetchInterval: 300000,
  });

  const { data: channels = [] } = useQuery({
    queryKey: ['public-channels', site?.company_id],
    queryFn: async () => {
      try {
        return await base44.entities.Channel.filter({ company_id: site.company_id });
      } catch (err) {
        console.error("Error loading channels:", err);
        return [];
      }
    },
    enabled: !!site?.company_id,
    refetchInterval: 300000,
  });

  const { data: brandScheme } = useQuery({
    queryKey: ['brand-scheme', site?.brand_scheme_id],
    queryFn: async () => {
      if (!site?.brand_scheme_id) return null;
      const schemes = await base44.entities.BrandScheme.filter({ id: site.brand_scheme_id });
      return schemes[0];
    },
    enabled: !!site?.brand_scheme_id,
    refetchInterval: 300000,
  });

  if (error || siteError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <Tv className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p className="text-xl">{error || "Error loading site"}</p>
          <p className="text-sm text-gray-400 mt-2">Please check the URL and try again</p>
        </div>
      </div>
    );
  }

  if (!siteId || siteLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-white" />
      </div>
    );
  }

  if (!site) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <Tv className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p className="text-xl">Site not found</p>
        </div>
      </div>
    );
  }

  const bgGradient = brandScheme 
    ? `linear-gradient(to bottom right, ${brandScheme.background_start}, ${brandScheme.background_end})`
    : 'linear-gradient(to bottom right, #1f2937, #1e3a8a)';
  
  const colors = brandScheme ? {
    primary: brandScheme.primary_color,
    secondary: brandScheme.secondary_color,
    text: brandScheme.text_color,
    border: brandScheme.border_color
  } : {
    primary: '#10b981', // green-500 fallback
    secondary: '#3b82f6', // blue-500 fallback
    text: '#ffffff', // white fallback
    border: '#06b6d4' // cyan-400 fallback
  };

  const siteEvents = events
    .filter(event => schedules.some(s => s.event_id === event.id))
    .filter(event => new Date(event.start_time) >= new Date().setHours(0, 0, 0, 0));

  const nowShowing = siteEvents.filter(event => {
    const start = new Date(event.start_time);
    const end = event.end_time ? new Date(event.end_time) : addMinutes(start, 180);
    return isWithinInterval(currentTime, { start, end });
  });

  const todayEvents = siteEvents.filter(e => 
    isToday(new Date(e.start_time)) && isFuture(new Date(e.start_time))
  );

  const tomorrowEvents = siteEvents.filter(e => isTomorrow(new Date(e.start_time)));

  const thisWeekEvents = siteEvents.filter(e => 
    isThisWeek(new Date(e.start_time)) && 
    !isToday(new Date(e.start_time)) && 
    !isTomorrow(new Date(e.start_time))
  );

  const getSchedule = (eventId) => schedules.find(s => s.event_id === eventId);
  const getScheduleForEvent = (eventId) => schedules.find(s => s.event_id === eventId); // Outline uses this name

  return (
    <div 
      className="min-h-screen p-8"
      style={{ 
        backgroundImage: bgGradient,
        backgroundColor: brandScheme?.background_start || '#1f2937' // Fallback for backgroundColor if gradient fails or is not supported
      }}
    >
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <div 
            className="inline-block rounded-2xl p-6"
            style={{ 
              border: `4px solid ${colors.border}`,
              backgroundColor: `${brandScheme?.background_start || '#1f2937'}80`
            }}
          >
            <h1 className="text-5xl font-bold" style={{ color: colors.text }}>
              <span style={{ color: colors.primary }}>SPORTS</span>
              <span> SCHEDULE</span>
            </h1>
            <p className="text-2xl mt-2" style={{ color: `${colors.text}CC` }}>
              {site?.name || 'Site Display'}
            </p>
          </div>
        </div>

        <p className="text-center text-lg mb-8" style={{ color: `${colors.text}CC` }}>
          {format(currentTime, "EEEE, MMMM d, yyyy • h:mm a")}
        </p>

        {nowShowing.length > 0 && (
          <div className="mb-12">
            <div 
              className="inline-block mb-6 px-8 py-4 rounded-r-2xl"
              style={{ 
                borderLeft: `12px solid ${colors.secondary}`,
                backgroundColor: `${colors.secondary}33`
              }}
            >
              <h2 className="text-4xl font-bold" style={{ color: colors.text }}>
                ON NOW
              </h2>
            </div>
            
            <div className="grid gap-6">
              {nowShowing.map((event) => {
                const channel = channels.find(c => c.id === event.channel_id);
                const schedule = getScheduleForEvent(event.id);
                
                return (
                  <div key={event.id} className="flex items-center gap-6">
                    <div 
                      className="px-6 py-4 rounded-2xl min-w-[140px] text-center animate-pulse"
                      style={{ 
                        backgroundColor: colors.secondary,
                        color: colors.text,
                        boxShadow: `0 0 30px ${colors.secondary}80`
                      }}
                    >
                      <div className="text-4xl font-bold">
                        {format(new Date(event.start_time), "HH:mm")}
                      </div>
                    </div>
                    <div 
                      className="flex-1 p-6 rounded-2xl backdrop-blur-sm" // Added backdrop-blur-sm as per original
                      style={{ 
                        backgroundColor: `${colors.text}1A`,
                        border: `2px solid ${colors.border}66`
                      }}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <span 
                              className="px-3 py-1 rounded-lg text-sm font-bold uppercase"
                              style={{ 
                                backgroundColor: `${colors.primary}`,
                                color: colors.text
                              }}
                            >
                              {event.sport_type}
                            </span>
                          </div>
                          <h3 className="font-bold text-3xl leading-tight mb-3" style={{ color: colors.text }}>
                            {event.title}
                          </h3>
                          <div className="flex items-center gap-3" style={{ color: `${colors.text}CC` }}>
                            <Tv className="w-6 h-6" />
                            <span className="font-bold text-2xl">{channel?.name || 'Unknown'}</span>
                          </div>
                        </div>
                        {schedule?.show_with_sound && (
                          <div 
                            className="px-4 py-2 rounded-xl text-lg font-bold flex items-center gap-2 shadow-lg" // Added shadow-lg as per original EventItem
                            style={{ 
                              backgroundColor: colors.primary,
                              color: colors.text
                            }}
                          >
                            🔊 SOUND ON
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {todayEvents.length > 0 && (
          <div className="mb-12">
            <div className="inline-block mb-6">
              <div 
                className="backdrop-blur-sm px-8 py-4 rounded-r-xl"
                style={{ 
                  borderLeft: `8px solid ${colors.primary}`,
                  backgroundColor: `${colors.primary}33`
                }}
              >
                <h2 className="text-4xl font-bold" style={{ color: colors.text }}>TODAY</h2>
              </div>
            </div>
            <div>
              {todayEvents.map(event => {
                const channel = channels.find(c => c.id === event.channel_id);
                const schedule = getSchedule(event.id);
                return (
                  <div key={event.id} className="flex items-center gap-6 mb-6 group">
                    <div 
                      className="text-white px-6 py-4 rounded-xl min-w-[140px] text-center shadow-lg transform group-hover:scale-105 transition-transform"
                      style={{ backgroundColor: colors.primary }}
                    >
                      <div className="text-3xl font-bold">
                        {format(new Date(event.start_time), "HH:mm")}
                      </div>
                      <div className="text-sm font-medium mt-1 opacity-90">
                        {format(new Date(event.start_time), "MMM d")}
                      </div>
                    </div>
                    <div 
                      className="flex-1 backdrop-blur-sm p-5 rounded-xl"
                      style={{ 
                        backgroundColor: `${colors.text}1A`,
                        border: `1px solid ${colors.border}33`
                      }}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="text-2xl font-bold leading-tight mb-2" style={{ color: colors.text }}>
                            {event.title}
                          </h3>
                          <div className="flex items-center gap-4" style={{ color: `${colors.text}CC` }}>
                            <div className="flex items-center gap-2">
                              <Tv className="w-4 h-4" />
                              <span className="font-semibold text-lg">{channel?.name || 'Unknown'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4" />
                              <span>{format(new Date(event.start_time), "h:mm a")}</span>
                            </div>
                          </div>
                        </div>
                        {schedule?.show_with_sound && (
                          <div 
                            className="px-4 py-2 rounded-lg font-bold text-sm shadow-lg"
                            style={{ 
                              backgroundColor: colors.secondary,
                              color: colors.text
                            }}
                          >
                            🔊 SOUND ON
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tomorrowEvents.length > 0 && (
          <div className="mb-12">
            <div className="inline-block mb-6">
              <div 
                className="backdrop-blur-sm px-8 py-4 rounded-r-xl"
                style={{ 
                  borderLeft: `8px solid ${colors.secondary}`,
                  backgroundColor: `${colors.secondary}33`
                }}
              >
                <h2 className="text-4xl font-bold" style={{ color: colors.text }}>TOMORROW</h2>
              </div>
            </div>
            <div>
              {tomorrowEvents.map(event => {
                const channel = channels.find(c => c.id === event.channel_id);
                const schedule = getSchedule(event.id);
                return (
                  <div key={event.id} className="flex items-center gap-6 mb-6 group">
                    <div 
                      className="text-white px-6 py-4 rounded-xl min-w-[140px] text-center shadow-lg transform group-hover:scale-105 transition-transform"
                      style={{ backgroundColor: colors.primary }}
                    >
                      <div className="text-3xl font-bold">
                        {format(new Date(event.start_time), "MMM d")}
                      </div>
                      {!false && ( // showDate is true for tomorrowEvents in original
                        <div className="text-sm font-medium mt-1 opacity-90">
                          {format(new Date(event.start_time), "HH:mm")}
                        </div>
                      )}
                    </div>
                    <div 
                      className="flex-1 backdrop-blur-sm p-5 rounded-xl"
                      style={{ 
                        backgroundColor: `${colors.text}1A`,
                        border: `1px solid ${colors.border}33`
                      }}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="text-2xl font-bold leading-tight mb-2" style={{ color: colors.text }}>
                            {event.title}
                          </h3>
                          <div className="flex items-center gap-4" style={{ color: `${colors.text}CC` }}>
                            <div className="flex items-center gap-2">
                              <Tv className="w-4 h-4" />
                              <span className="font-semibold text-lg">{channel?.name || 'Unknown'}</span>
                            </div>
                             <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                <span>{format(new Date(event.start_time), "h:mm a")}</span>
                              </div>
                          </div>
                        </div>
                        {schedule?.show_with_sound && (
                          <div 
                            className="px-4 py-2 rounded-lg font-bold text-sm shadow-lg"
                            style={{ 
                              backgroundColor: colors.secondary,
                              color: colors.text
                            }}
                          >
                            🔊 SOUND ON
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {thisWeekEvents.length > 0 && (
          <div className="mb-12">
            <div className="inline-block mb-6">
              <div 
                className="backdrop-blur-sm px-8 py-4 rounded-r-xl"
                style={{ 
                  borderLeft: `8px solid ${colors.border}`, // Using border color for consistency
                  backgroundColor: `${colors.border}33`
                }}
              >
                <h2 className="text-4xl font-bold" style={{ color: colors.text }}>THIS WEEK</h2>
              </div>
            </div>
            <div>
              {thisWeekEvents.map(event => {
                const channel = channels.find(c => c.id === event.channel_id);
                const schedule = getSchedule(event.id);
                
                return (
                  <div key={event.id} className="flex items-center gap-6 mb-6">
                    <div 
                      className="px-6 py-4 rounded-xl min-w-[140px] text-center shadow-lg"
                      style={{ backgroundColor: colors.primary, color: colors.text }}
                    >
                      <div className="text-3xl font-bold">
                        {format(new Date(event.start_time), "MMM d")}
                      </div>
                      <div className="text-sm font-medium mt-1 opacity-90">
                        {format(new Date(event.start_time), "EEEE")}
                      </div>
                    </div>
                    <div 
                      className="flex-1 p-5 rounded-xl backdrop-blur-sm"
                      style={{ 
                        backgroundColor: `${colors.text}1A`,
                        border: `1px solid ${colors.border}33`
                      }}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="text-2xl font-bold leading-tight mb-2" style={{ color: colors.text }}>
                            {event.title}
                          </h3>
                          <div className="flex items-center gap-4" style={{ color: `${colors.text}CC` }}>
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4" />
                              <span className="font-semibold">{format(new Date(event.start_time), "h:mm a")}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Tv className="w-4 h-4" />
                              <span className="font-bold text-lg">{channel?.name || 'Unknown'}</span>
                            </div>
                          </div>
                        </div>
                        {schedule?.show_with_sound && (
                          <div 
                            className="px-4 py-2 rounded-lg font-bold text-sm shadow-lg"
                            style={{ backgroundColor: colors.secondary, color: colors.text }}
                          >
                            🔊 SOUND ON
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {siteEvents.length === 0 && (
          <div className="text-center py-20">
            <Calendar className="w-24 h-24 mx-auto mb-6" style={{ color: `${colors.text}66` }} />
            <p className="text-3xl" style={{ color: `${colors.text}99` }}>
              No upcoming events scheduled
            </p>
          </div>
        )}

        <div className="mt-12 text-center text-sm" style={{ color: `${colors.text}66` }}>
          <p>This display updates automatically every 5 minutes</p>
        </div>
      </div>
    </div>
  );
}
