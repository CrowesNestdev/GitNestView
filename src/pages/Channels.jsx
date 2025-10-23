import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { channelsService } from "@/services/database";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

export default function Channels() {
  const { profile } = useAuth();
  const [companyId, setCompanyId] = useState(null);

  useEffect(() => {
    if (!profile) return;
    const viewingCompanyId = localStorage.getItem('superAdminViewingCompany');
    setCompanyId(viewingCompanyId || profile.company_id);
  }, [profile]);

  const { data: channels = [], isLoading } = useQuery({
    queryKey: ['channels', companyId],
    queryFn: () => channelsService.getByCompany(companyId),
    enabled: !!companyId,
  });

  if (!companyId || isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Channels</h1>
        <Card>
          <CardContent className="p-6">
            <p className="text-gray-500">Channel management coming soon...</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
