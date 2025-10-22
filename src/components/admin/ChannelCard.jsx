import React from "react";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tv } from "lucide-react";

export default function ChannelCard({ channel, onToggle }) {
  return (
    <Card className="p-4 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center">
            <Tv className="w-6 h-6 text-blue-700" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{channel.name}</h3>
            <Badge variant={channel.is_active ? "default" : "secondary"} className="mt-1">
              {channel.is_active ? "Active" : "Inactive"}
            </Badge>
          </div>
        </div>
        <Switch
          checked={channel.is_active}
          onCheckedChange={() => onToggle(channel)}
        />
      </div>
    </Card>
  );
}