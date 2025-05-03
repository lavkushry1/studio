// src/app/admin/settings/page.tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminUpiManagement } from "@/components/admin/AdminUpiManagement"; // Import the component
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function AdminSettingsPage() {
  return (
    <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8">
       <Link href="/admin" className="inline-flex items-center text-sm text-primary hover:text-accent mb-6 transition-colors">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Admin Dashboard
        </Link>
      <h1 className="text-3xl font-bold text-primary mb-8">Platform Settings</h1>

      <div className="space-y-8 max-w-2xl">
        {/* UPI Settings Section */}
        <AdminUpiManagement />

        {/* Placeholder for other settings */}
        <Card>
          <CardHeader>
            <CardTitle>Other Settings</CardTitle>
            <CardDescription>Configure other platform parameters here.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">More settings options will be available here.</p>
            {/* Example: <FormField name="siteName" label="Site Name" /> */}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
