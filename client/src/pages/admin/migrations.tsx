import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle, RefreshCw } from "lucide-react";
import { useMigration } from "@/hooks/use-migration";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

export default function Migrations() {
  const { runAgentCustomersMigration, isLoading, isSuccess, results, error } = useMigration();
  const { toast } = useToast();
  const [isConfirming, setIsConfirming] = useState(false);

  const handleRunMigration = async () => {
    if (!isConfirming) {
      setIsConfirming(true);
      return;
    }

    try {
      await runAgentCustomersMigration.mutateAsync();
      toast({
        title: "Migration executed successfully",
        description: "The agent customers migration has been completed.",
        variant: "success",
      });
    } catch (err: any) {
      toast({
        title: "Migration failed",
        description: err?.message || "An unknown error occurred during migration",
        variant: "destructive",
      });
    } finally {
      setIsConfirming(false);
    }
  };

  const handleCancel = () => {
    setIsConfirming(false);
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Database Migrations</h1>
      </div>

      <div className="grid gap-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <RefreshCw className="h-5 w-5 mr-2" />
              Agent Customers Migration
            </CardTitle>
            <CardDescription>
              Add existing customers with agent_id to the agent_commissions table
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4">
              This migration will identify all users who were signed up by an agent (have agent_id)
              but are not yet in the agent_commissions table, and add them with the appropriate
              commission data.
            </p>
            
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Migration Error</AlertTitle>
                <AlertDescription>
                  {error instanceof Error 
                    ? error.message 
                    : typeof error === 'object' && error !== null && 'message' in error
                      ? String(error.message)
                      : "An unknown error occurred during migration"}
                </AlertDescription>
              </Alert>
            )}

            {isSuccess && results && (
              <Alert className="mb-4">
                <CheckCircle className="h-4 w-4" />
                <AlertTitle>Migration Results</AlertTitle>
                <AlertDescription>
                  <div className="mt-2">
                    <p>Users found: {results.usersFound || 0}</p>
                    <p>Users processed: {results.usersProcessed || 0}</p>
                    <p>Users skipped: {results.usersSkipped || 0}</p>
                    {results.errors && results.errors.length > 0 && (
                      <div className="mt-2">
                        <p className="font-semibold">Errors:</p>
                        <ul className="list-disc pl-5">
                          {results.errors.map((err: any, i: number) => (
                            <li key={i}>{typeof err === 'string' ? err : err.error || err.message || JSON.stringify(err)}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
          <CardFooter className="flex justify-end space-x-2">
            {isConfirming && (
              <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
                Cancel
              </Button>
            )}
            <Button 
              onClick={handleRunMigration} 
              disabled={isLoading}
              variant={isConfirming ? "destructive" : "default"}
            >
              {isLoading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Running Migration...
                </>
              ) : isConfirming ? (
                "Confirm Run Migration"
              ) : (
                "Run Migration"
              )}
            </Button>
          </CardFooter>
        </Card>

        <Separator />

        <div className="text-sm text-muted-foreground">
          <h3 className="font-semibold mb-2">Migration Notes:</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>Make sure to back up your database before running any migration</li>
            <li>Migrations are designed to be idempotent (safe to run multiple times)</li>
            <li>Users that already exist in the agent_commissions table will be skipped</li>
            <li>This migration will calculate commission points based on customer selected package</li>
          </ul>
        </div>
      </div>
    </div>
  );
}