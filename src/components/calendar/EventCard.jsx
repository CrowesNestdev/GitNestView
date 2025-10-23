import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Tv, MapPin, EyeOff, Eye } from "lucide-react";
import { format } from "date-fns";

const sportColors = {
  football: "bg-green-100 text-green-800",
  rugby: "bg-blue-100 text-blue-800",
  cricket: "bg-yellow-100 text-yellow-800",
  tennis: "bg-pink-100 text-pink-800",
  formula1: "bg-red-100 text-red-800",
  boxing: "bg-purple-100 text-purple-800",
  golf: "bg-emerald-100 text-emerald-800",
  other: "bg-gray-100 text-gray-800"
};

export default function EventCard({ event, channel, onAssign, onHide, assignedSites = [] }) {
  const eventChannels = event.event_channels?.map(ec => ec.channels).filter(Boolean) || [];
  const allChannels = eventChannels.length > 0 ? eventChannels : (channel ? [channel] : []);

  return (
    <Card className={`p-5 hover:shadow-lg transition-all duration-300 ${event.is_hidden ? 'opacity-60 border-dashed' : ''}`}>
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <h3 className="font-bold text-gray-900 text-lg leading-tight">
              {event.title}
            </h3>
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge className={sportColors[event.sport_type]}>
                {event.sport_type}
              </Badge>
              {assignedSites.length > 0 && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {assignedSites.length} {assignedSites.length === 1 ? 'site' : 'sites'}
                </Badge>
              )}
              {event.is_hidden && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <EyeOff className="w-3 h-3" />
                  Hidden
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <Calendar className="w-4 h-4" />
            <span>{format(new Date(event.start_time), "EEEE, MMMM d, yyyy")}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <Clock className="w-4 h-4" />
            <span>
              {format(new Date(event.start_time), "h:mm a")}
              {event.end_time && ` - ${format(new Date(event.end_time), "h:mm a")}`}
            </span>
          </div>
          {allChannels.length > 0 && (
            <div className="flex items-start gap-2 text-gray-600">
              <Tv className="w-4 h-4 mt-0.5" />
              <div className="flex flex-wrap gap-1">
                {allChannels.map((ch, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {ch.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        {event.description && (
          <p className="text-sm text-gray-500 border-t pt-3">
            {event.description}
          </p>
        )}

        <div className="flex gap-2 pt-2">
          <Button
            onClick={() => onAssign(event)}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
          >
            Assign to Sites
          </Button>
          <Button
            onClick={() => onHide(event)}
            variant="outline"
            size="icon"
            title={event.is_hidden ? "Show event" : "Hide event"}
          >
            {event.is_hidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </Card>
  );
}