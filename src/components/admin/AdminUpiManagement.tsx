// src/components/admin/AdminUpiManagement.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getUpiSettings, updateUpiSettings } from '@/services/adminService'; // Assuming admin service exists
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { z } from 'zod';

// Frontend validation schema matching backend
const upiIdSchema = z.string()
    .min(3, { message: 'UPI ID must be at least 3 characters' })
    .regex(/^[a-zA-Z0-9.\-_]+@[a-zA-Z0-9]+$/, { message: 'Invalid UPI ID format (e.g., user@bank)' });

interface UpiSetting {
    id: string;
    upiId: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export function AdminUpiManagement() {
    const { getAccessToken } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [currentUpiId, setCurrentUpiId] = useState<string>('');
    const [newUpiId, setNewUpiId] = useState<string>('');
    const [validationError, setValidationError] = useState<string | null>(null);

    const token = getAccessToken();

    // Fetch current UPI setting
    const { data: upiSetting, isLoading: isLoadingSettings, isError, error } = useQuery<UpiSetting>({
        queryKey: ['upiSettings'],
        queryFn: () => getUpiSettings(token!),
        enabled: !!token,
        staleTime: 5 * 60 * 1000, // Cache for 5 minutes
        onSuccess: (data) => {
            setCurrentUpiId(data?.upiId || '');
            setNewUpiId(data?.upiId || ''); // Initialize input field with current value
        },
        // Handle 404 specifically - means no setting exists yet
        onError: (err: any) => {
            if (err.message?.includes('404')) {
                console.warn("No active UPI setting found. Prompting admin to set one.");
                setCurrentUpiId(''); // Ensure it's empty
                setNewUpiId('');
            } else {
                 toast({
                    title: "Error Loading Settings",
                    description: err.message || "Could not fetch UPI settings.",
                    variant: "destructive",
                });
            }
        }
    });

    // Mutation for updating UPI setting
    const { mutate: saveUpiSetting, isLoading: isSaving } = useMutation({
        mutationFn: (upiId: string) => updateUpiSettings(upiId, token!),
        onSuccess: (data) => {
            toast({ title: "UPI Setting Updated", description: `Active UPI ID set to ${data.setting.upiId}` });
            queryClient.invalidateQueries(['upiSettings']); // Refetch after update
            setCurrentUpiId(data.setting.upiId); // Update displayed current ID
        },
        onError: (error: any) => {
            toast({
                title: "Update Failed",
                description: error.message || "Could not update UPI setting.",
                variant: "destructive",
            });
        },
    });

    const handleSave = () => {
         setValidationError(null); // Clear previous errors
         const validation = upiIdSchema.safeParse(newUpiId);

         if (!validation.success) {
             setValidationError(validation.error.errors[0]?.message || "Invalid UPI ID format.");
             return;
         }

        if (newUpiId === currentUpiId) {
             toast({ title: "No Change", description: "The entered UPI ID is the same as the current one." });
             return;
        }

        saveUpiSetting(newUpiId);
    };

    const isNoSettingFound = !isLoadingSettings && !currentUpiId && !isError; // Check for the 404 case handled in onError

    return (
        <Card>
            <CardHeader>
                <CardTitle>UPI Payment Settings</CardTitle>
                <CardDescription>Configure the UPI ID (VPA) where customer payments will be received.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 {isLoadingSettings && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
                 {isError && !error.message?.includes('404') && (
                      <div className="text-destructive flex items-center gap-2">
                          <AlertCircle className="h-5 w-5" /> Error loading settings.
                      </div>
                 )}
                {isNoSettingFound && (
                      <div className="text-orange-600 flex items-center gap-2 p-3 bg-orange-50 border border-orange-200 rounded-md">
                          <AlertCircle className="h-5 w-5" /> No active UPI ID found. Please set one below.
                      </div>
                )}
                 {!isLoadingSettings && !isError && currentUpiId && (
                    <p className="text-sm text-muted-foreground">
                        Current Active UPI ID: <strong className="text-primary font-mono">{currentUpiId}</strong>
                    </p>
                 )}
                <div className="space-y-1">
                    <Label htmlFor="upiId">New UPI ID (VPA)</Label>
                    <Input
                        id="upiId"
                        placeholder="e.g., yourbusiness@bankupi"
                        value={newUpiId}
                        onChange={(e) => setNewUpiId(e.target.value)}
                        disabled={isSaving || isLoadingSettings}
                        className={validationError ? 'border-destructive' : ''}
                    />
                     {validationError && <p className="text-xs text-destructive mt-1">{validationError}</p>}
                    <p className="text-xs text-muted-foreground">This is the address customers will pay to. Ensure it's correct.</p>
                </div>
            </CardContent>
            <CardFooter>
                <Button onClick={handleSave} disabled={isSaving || isLoadingSettings || !newUpiId}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save UPI Setting
                </Button>
            </CardFooter>
        </Card>
    );
}
