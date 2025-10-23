import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function SiteView() {
  const { profile, loading } = useAuth();

  if (loading || !profile) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">My Site View</h1>
        <Card>
          <CardContent className="p-6">
            <p className="text-gray-500">Site schedule view coming soon...</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
