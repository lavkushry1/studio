import { EventForm } from '@/components/admin/EventForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function NewEventPage() {
    return (
        <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8 max-w-4xl">
             <Link href="/admin" className="inline-flex items-center text-sm text-primary hover:text-accent mb-6 transition-colors">
                <ArrowLeft className="mr-1 h-4 w-4" />
                Back to Admin Dashboard
            </Link>
            <h1 className="text-3xl font-bold text-primary mb-8">Create New Event</h1>
            <EventForm />
        </div>
    );
}
