import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle, RefreshCw, Wrench, Layers, DollarSign, AlertTriangle } from "lucide-react";
import { useMigration } from "@/hooks/use-migration";
import { useManualMigration } from "@/hooks/use-manual-migration";
import { usePackageTypes } from "@/hooks/use-package-types";
import { useCommissionConversion } from "@/hooks/use-commission-conversion";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Migrations() {
  const { runAgentCustomersMigration, isLoading, isSuccess, results, error } = useMigration();
  const { runManualMigration, isManualMigrationRunning, manualMigrationResults, isManualMigrationSuccess, manualMigrationError } = useManualMigration();
  const { updatePackageTypes, isUpdating, isSuccess: isPackageTypesSuccess, error: packageTypesError } = usePackageTypes();
  const { 
    convertSignupsToRenewals, 
    isLoading: isConverting, 
    isSuccess: isConversionSuccess, 
    results: conversionResults, 
    error: conversionError,
    convertAllSignupsToRenewals,
    isAllLoading,
    isAllSuccess,
    allResults,
    allError
  } = useCommissionConversion();
  const { toast } = useToast();
  const [isConfirming, setIsConfirming] = useState(false);
  const [isConfirmingManual, setIsConfirmingManual] = useState(false);
  const [isConfirmingPackageTypesUpdate, setIsConfirmingPackageTypesUpdate] = useState(false);
  const [isConfirmingConversion, setIsConfirmingConversion] = useState(false);
  const [isConfirmingAllConversion, setIsConfirmingAllConversion] = useState(false);
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
  
  const handleCancelConversion = () => {
    setIsConfirmingConversion(false);
  };
  
  const handleCancelAllConversion = () => {
    setIsConfirmingAllConversion(false);
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
  
  const handleRunCommissionConversion = async () => {
    if (!isConfirmingConversion) {
      setIsConfirmingConversion(true);
      return;
    }
    
    try {
      await convertSignupsToRenewals.mutateAsync();
      toast({
        title: "Commission conversion successful",
        description: "Sign-up commissions were successfully converted to renewal type.",
        variant: "success",
      });
    } catch (err: any) {
      toast({
        title: "Commission conversion failed",
        description: err?.message || "An unknown error occurred during commission conversion",
        variant: "destructive",
      });
    } finally {
      setIsConfirmingConversion(false);
    }
  };
  
  const handleRunAllCommissionConversion = async () => {
    if (!isConfirmingAllConversion) {
      setIsConfirmingAllConversion(true);
      return;
    }
    
    try {
      await convertAllSignupsToRenewals.mutateAsync();
      toast({
        title: "Full database conversion successful",
        description: "ALL sign-up commissions in the database were successfully converted to renewal type.",
        variant: "success",
      });
    } catch (err: any) {
      toast({
        title: "Full database conversion failed",
        description: err?.message || "An unknown error occurred during the full database conversion",
        variant: "destructive",
      });
    } finally {
      setIsConfirmingAllConversion(false);
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
              referral fee data.
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
              Manual Agent Referral Fees Migration
            </CardTitle>
            <CardDescription>
              Direct SQL migration for agent customer referral fees
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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <DollarSign className="h-5 w-5 mr-2" />
              Commission Type Conversion
            </CardTitle>
            <CardDescription>
              Convert SIGNUP commissions to RENEWAL type
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4">
              This utility converts agent commissions from SIGNUP type (30%) to RENEWAL type (10%).
              Two modes are available: monthly conversion for routine maintenance, and one-time full database conversion.
            </p>
            
            <div className="bg-amber-50 dark:bg-amber-950 p-4 rounded-md mb-4 border border-amber-200 dark:border-amber-800">
              <h4 className="text-amber-800 dark:text-amber-300 font-medium mb-2 flex items-center">
                <AlertCircle className="h-4 w-4 mr-2" />
                Important Information
              </h4>
              <ul className="text-amber-700 dark:text-amber-400 text-sm space-y-1 list-disc pl-5">
                <li>This operation changes commission types from SIGNUP (30%) to RENEWAL (10%)</li>
                <li>Commission amounts will be recalculated based on the 10% rate</li>
                <li>This operation uses database transactions and will roll back if any errors occur</li>
              </ul>
            </div>
            
            <Tabs defaultValue="monthly" className="mt-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="monthly">Monthly Conversion</TabsTrigger>
                <TabsTrigger value="all">Full Conversion (One-time)</TabsTrigger>
              </TabsList>
              
              <TabsContent value="monthly">
                <div className="p-4 border rounded-md mt-4">
                  <h3 className="text-lg font-semibold mb-2">Previous Month Conversion</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Convert SIGNUP commissions from the previous month to RENEWAL type (10%).
                    This should be run at the beginning of each month as part of routine maintenance.
                  </p>
                  
                  {conversionError && (
                    <Alert variant="destructive" className="mb-4">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Conversion Error</AlertTitle>
                      <AlertDescription>
                        {conversionError instanceof Error 
                          ? conversionError.message 
                          : "An unknown error occurred during commission conversion"}
                      </AlertDescription>
                    </Alert>
                  )}

                  {isConversionSuccess && conversionResults && (
                    <Alert className="mb-4">
                      <CheckCircle className="h-4 w-4" />
                      <AlertTitle>Conversion Results</AlertTitle>
                      <AlertDescription>
                        <div className="mt-2">
                          <p>Records found: {conversionResults.recordsFound || 0}</p>
                          <p>Records converted: {conversionResults.recordsConverted || 0}</p>
                          {conversionResults.errors && conversionResults.errors.length > 0 && (
                            <div className="mt-2">
                              <p className="font-semibold">Errors:</p>
                              <ul className="list-disc pl-5">
                                {conversionResults.errors.map((err: any, i: number) => (
                                  <li key={i}>{typeof err === 'string' ? err : err.error || err.message || JSON.stringify(err)}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  <div className="flex justify-end space-x-2 mt-4">
                    {isConfirmingConversion && (
                      <Button 
                        variant="outline" 
                        onClick={handleCancelConversion} 
                        disabled={isConverting}
                      >
                        Cancel
                      </Button>
                    )}
                    <Button 
                      onClick={handleRunCommissionConversion} 
                      disabled={isConverting}
                      variant={isConfirmingConversion ? "destructive" : "default"}
                    >
                      {isConverting ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          Converting Month...
                        </>
                      ) : isConfirmingConversion ? (
                        "Confirm Monthly Conversion"
                      ) : (
                        "Run Monthly Conversion"
                      )}
                    </Button>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="all">
                <div className="p-4 border rounded-md mt-4 border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950">
                  <div className="flex items-center mb-3">
                    <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mr-2" />
                    <h3 className="text-lg font-semibold text-red-700 dark:text-red-400">ONE-TIME Full Database Conversion</h3>
                  </div>
                  
                  <p className="text-sm text-red-700 dark:text-red-400 mb-4">
                    <strong>CAUTION:</strong> This operation will convert <u>ALL</u> SIGNUP commissions in the database to RENEWAL type, 
                    regardless of date. This is a one-time operation intended to fix historical data issues, and should only be 
                    run once with administrative approval.
                  </p>
                  
                  {allError && (
                    <Alert variant="destructive" className="mb-4">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Full Conversion Error</AlertTitle>
                      <AlertDescription>
                        {allError instanceof Error 
                          ? allError.message 
                          : "An unknown error occurred during full database conversion"}
                      </AlertDescription>
                    </Alert>
                  )}

                  {isAllSuccess && allResults && (
                    <Alert className="mb-4">
                      <CheckCircle className="h-4 w-4" />
                      <AlertTitle>Full Conversion Results</AlertTitle>
                      <AlertDescription>
                        <div className="mt-2">
                          <p>Records found: {allResults.recordsFound || 0}</p>
                          <p>Records converted: {allResults.recordsConverted || 0}</p>
                          {allResults.errors && allResults.errors.length > 0 && (
                            <div className="mt-2">
                              <p className="font-semibold">Errors:</p>
                              <ul className="list-disc pl-5">
                                {allResults.errors.map((err: any, i: number) => (
                                  <li key={i}>{typeof err === 'string' ? err : err.error || err.message || JSON.stringify(err)}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  <div className="flex justify-end space-x-2 mt-4">
                    {isConfirmingAllConversion && (
                      <Button 
                        variant="outline" 
                        onClick={handleCancelAllConversion} 
                        disabled={isAllLoading}
                      >
                        Cancel
                      </Button>
                    )}
                    <Button 
                      onClick={handleRunAllCommissionConversion} 
                      disabled={isAllLoading}
                      variant={isConfirmingAllConversion ? "destructive" : "default"}
                    >
                      {isAllLoading ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          Converting ALL Records...
                        </>
                      ) : isConfirmingAllConversion ? (
                        "Confirm FULL DATABASE Conversion"
                      ) : (
                        "Run Full Database Conversion"
                      )}
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Separator />

        <div className="text-sm text-muted-foreground">
          <h3 className="font-semibold mb-2">Migration Notes:</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>Make sure to back up your database before running any migration</li>
            <li>Migrations are designed to be idempotent (safe to run multiple times)</li>
            <li>Users that already exist in the agent_commissions table will be skipped</li>
            <li>This migration will calculate referral fee points based on customer selected package</li>
            <li>If the standard migration times out, try the manual migration option which uses a different approach</li>
            <li>Commission conversion (monthly) should be run at the beginning of each month</li>
            <li>The full database conversion is a one-time operation to fix historical SIGNUP commissions</li>
            <li>All commission conversions recalculate amounts based on package price (30% → 10%)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}