import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { brandSchemesService } from "@/services/database";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function BrandSchemes() {
  const { profile } = useAuth();
  const [companyId, setCompanyId] = useState(null);

  useEffect(() => {
    if (!profile) return;
    const viewingCompanyId = localStorage.getItem('superAdminViewingCompany');
    setCompanyId(viewingCompanyId || profile.company_id);
  }, [profile]);

  const { data: schemes = [], isLoading } = useQuery({
    queryKey: ['brandSchemes', companyId],
    queryFn: () => brandSchemesService.getByCompany(companyId),
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
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Brand Schemes</h1>
        <Card>
          <CardContent className="p-6">
            <p className="text-gray-500">Brand scheme management coming soon...</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
