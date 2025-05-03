// src/app/admin/verifications/page.tsx
import { AdminPaymentVerification } from "@/components/admin/AdminPaymentVerification";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, CheckCircle } from "lucide-react";
import Link from "next/link";

export default function AdminVerificationsPage() {
  return (
    <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8">
      <Link href="/admin" className="inline-flex items-center text-sm text-primary hover:text-accent mb-6 transition-colors">
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back to Admin Dashboard
      </Link>
      <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
              <CheckCircle className="h-7 w-7 text-accent"/> Payment Verification
          </h1>
          {/* Add any high-level actions or info here */}
      </div>

      {/* Payment Verification Table Component */}
      <AdminPaymentVerification />

    </div>
  );
}
