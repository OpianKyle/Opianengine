import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle, RefreshCw, Wrench, Layers } from "lucide-react";
import { useMigration } from "@/hooks/use-migration";
import { useManualMigration } from "@/hooks/use-manual-migration";
import { usePackageTypes } from "@/hooks/use-package-types";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export default function Migrations() {
  const { runAgentCustomersMigration, isLoading, isSuccess, results, error } = useMigration();
  const { runManualMigration, isManualMigrationRunning, manualMigrationResults, isManualMigrationSuccess, manualMigrationError } = useManualMigration();
  const { updatePackageTypes, isUpdating, isSuccess: isPackageTypesSuccess, error: packageTypesError } = usePackageTypes();
  const { toast } = useToast();
  const [isConfirming, setIsConfirming] = useState(false);
  const [isConfirmingManual, setIsConfirmingManual] = useState(false);
  const [isConfirmingPackageTypesUpdate, setIsConfirmingPackageTypesUpdate] = useState(false);
  const [forceProductionMode, setForceProductionMode] = useState(false);

  const handleRunMigration = async () => {
    if (!isConfirming) {
      setIsConfirming(true);
      return;
    }

    try {
      await runAgentCustomersMigration.mutateAsync({ forceProductionMode });
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

  const handleCancelManual = () => {
    setIsConfirmingManual(false);
  };

  const handleCancelPackageTypesUpdate = () => {
    setIsConfirmingPackageTypesUpdate(false);
  };

  const handleRunManualMigration = () => {
    if (!isConfirmingManual) {
      setIsConfirmingManual(true);
      return;
    }

    try {
      runManualMigration();
      toast({
        title: "Manual migration initiated",
        description: "The direct SQL migration has been started. Please wait for results.",
        variant: "default",
      });
    } catch (err: any) {
      toast({
        title: "Manual migration failed",
        description: err?.message || "An unknown error occurred during manual migration",
        variant: "destructive",
      });
    } finally {
      setIsConfirmingManual(false);
    }
  };

  const handleUpdatePackageTypes = () => {
    if (!isConfirmingPackageTypesUpdate) {
      setIsConfirmingPackageTypesUpdate(true);
      return;
    }

    try {
      updatePackageTypes();
      toast({
        title: "Package types update initiated",
        description: "The standardization of package types has been started. This may take a moment to complete.",
        variant: "default",
      });
    } catch (err: any) {
      toast({
        title: "Package types update failed",
        description: err?.message || "An unknown error occurred during the update process",
        variant: "destructive",
      });
    } finally {
      setIsConfirmingPackageTypesUpdate(false);
    }
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
            
            <div className="flex items-center space-x-2 mb-6">
              <Checkbox 
                id="force-production-mode" 
                checked={forceProductionMode}
                onCheckedChange={(checked) => setForceProductionMode(checked as boolean)}
              />
              <Label
                htmlFor="force-production-mode"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Force production mode (apply actual database changes)
              </Label>
            </div>
            
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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Wrench className="h-5 w-5 mr-2" />
              Manual Agent Commissions Migration
            </CardTitle>
            <CardDescription>
              Direct SQL migration for agent customer commissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4">
              This alternative migration uses direct SQL commands to migrate agent customers to the 
              agent_commissions table. Use this if the standard migration times out or encounters errors.
            </p>
            
            {manualMigrationError && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Manual Migration Error</AlertTitle>
                <AlertDescription>
                  {manualMigrationError instanceof Error 
                    ? manualMigrationError.message 
                    : "An unknown error occurred during manual migration"}
                </AlertDescription>
              </Alert>
            )}

            {isManualMigrationSuccess && manualMigrationResults && (
              <Alert className="mb-4">
                <CheckCircle className="h-4 w-4" />
                <AlertTitle>Manual Migration Results</AlertTitle>
                <AlertDescription>
                  <div className="mt-2">
                    <p>Users found: {manualMigrationResults.usersFound || 0}</p>
                    <p>Users migrated: {manualMigrationResults.usersMigrated || 0}</p>
                    <p>Users skipped: {manualMigrationResults.usersSkipped || 0}</p>
                    <p>Errors: {manualMigrationResults.errors || 0}</p>
                    {manualMigrationResults.output && (
                      <div className="mt-2">
                        <p className="font-semibold">Output:</p>
                        <pre className="text-xs bg-secondary p-2 rounded mt-1 max-h-40 overflow-auto">
                          {manualMigrationResults.output}
                        </pre>
                      </div>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
          <CardFooter className="flex justify-end space-x-2">
            {isConfirmingManual && (
              <Button variant="outline" onClick={handleCancelManual} disabled={isManualMigrationRunning}>
                Cancel
              </Button>
            )}
            <Button 
              onClick={handleRunManualMigration} 
              disabled={isManualMigrationRunning}
              variant={isConfirmingManual ? "destructive" : "default"}
            >
              {isManualMigrationRunning ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Running Manual Migration...
                </>
              ) : isConfirmingManual ? (
                "Confirm Run Manual Migration"
              ) : (
                "Run Manual Migration"
              )}
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Layers className="h-5 w-5 mr-2" />
              Package Types Standardization
            </CardTitle>
            <CardDescription>
              Update package types to use consistent naming convention
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4">
              This migration standardizes package types in the agent_commissions table to use the following naming convention:
            </p>
            <ul className="list-disc pl-5 mb-4 space-y-1">
              <li>OPPORTUNITY (previously BASIC/STANDARD): R350 - 2500 points</li>
              <li>MOMENTUM: R450 - 5000 points</li>
              <li>PROSPER (previously PREMIUM): R550 - 7500 points</li>
              <li>PRESTIGE (previously ELITE): R695 - 10000 points</li>
              <li>PINNACLE (previously EXECUTIVE): R825 - 12500 points</li>
            </ul>
            
            {packageTypesError && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Package Types Update Error</AlertTitle>
                <AlertDescription>
                  {packageTypesError instanceof Error 
                    ? packageTypesError.message 
                    : "An unknown error occurred during package types update"}
                </AlertDescription>
              </Alert>
            )}

            {isPackageTypesSuccess && (
              <Alert className="mb-4">
                <CheckCircle className="h-4 w-4" />
                <AlertTitle>Package Types Update Successful</AlertTitle>
                <AlertDescription>
                  <div className="mt-2">
                    <p>Package types have been successfully standardized across the system.</p>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
          <CardFooter className="flex justify-end space-x-2">
            {isConfirmingPackageTypesUpdate && (
              <Button 
                variant="outline" 
                onClick={handleCancelPackageTypesUpdate} 
                disabled={isUpdating}
              >
                Cancel
              </Button>
            )}
            <Button 
              onClick={handleUpdatePackageTypes} 
              disabled={isUpdating}
              variant={isConfirmingPackageTypesUpdate ? "destructive" : "default"}
            >
              {isUpdating ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Updating Package Types...
                </>
              ) : isConfirmingPackageTypesUpdate ? (
                "Confirm Package Types Update"
              ) : (
                "Update Package Types"
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
            <li>If the standard migration times out, try the manual migration option which uses a different approach</li>
          </ul>
        </div>
      </div>
    </div>
  );
}