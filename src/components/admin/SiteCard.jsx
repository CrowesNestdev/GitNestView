import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SiteCard({ site, onEdit }) {
  return (
    <Card className="p-5 hover:shadow-md transition-all duration-200">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl flex items-center justify-center flex-shrink-0">
            <MapPin className="w-6 h-6 text-purple-700" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-lg">{site.name}</h3>
            {site.location && (
              <p className="text-sm text-gray-500 mt-1">{site.location}</p>
            )}
            <Badge 
              variant={site.is_active ? "default" : "secondary"} 
              className="mt-2"
            >
              {site.is_active ? "Active" : "Inactive"}
            </Badge>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onEdit(site)}
          className="hover:bg-gray-100"
        >
          <Edit2 className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
}