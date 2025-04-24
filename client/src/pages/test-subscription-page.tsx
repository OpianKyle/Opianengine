import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TestTube, AlertTriangle, CheckCircle2, HelpCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import TestSubscriptionTool from '@/components/test-subscription';

export default function TestSubscriptionPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Test Subscription</h1>
          <p className="text-muted-foreground">
            Test Paystack subscription creation and cancellation safely without real payments
          </p>
        </div>
        <TestTube className="h-8 w-8 text-primary" />
      </div>

      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-amber-500" />
              Test Environment Information
            </CardTitle>
            <CardDescription>
              This test environment lets you simulate Paystack subscription flows without processing real payments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div className="border rounded-md p-4 bg-yellow-50/50">
                <h3 className="font-medium flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  Important Notes
                </h3>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  <li>All test subscriptions use the <strong>TEST</strong> package (R10/month)</li>
                  <li>Subscription events will be created in the database, but no real money is charged</li>
                  <li>This tool is only available to admin users</li>
                  <li>Use this to verify subscription creation, webhook handling, and cancellation processes</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <TestSubscriptionTool />
      </div>
    </div>
  );
}