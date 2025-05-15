import React from 'react';
import { AnalyticsTest } from '@/components/test/analytics-test';
import { MetaTags } from "@/components/seo/meta-tags";

export default function AnalyticsTestPage() {
  return (
    <div className="container py-8">
      <MetaTags 
        title="Analytics Test | Opian Rewards"
        description="Testing the Google Analytics integration"
      />
      <h1 className="text-3xl font-bold mb-6">Google Analytics Integration Test</h1>
      <p className="text-gray-600 mb-8">
        This page tests the integration with Google Analytics API to confirm that both the client-side tracking 
        and server-side data fetching are functioning correctly.
      </p>
      
      <AnalyticsTest />
    </div>
  );
}