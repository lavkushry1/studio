import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, Edit, BarChart2, Settings, Tag, CheckCircle } from 'lucide-react';
import Link from "next/link";

// Mock Data - Replace with actual data fetching
const mockAdminStats = {
  totalEvents: 5,
  activeEvents: 3,
  pendingVerifications: 12,
  totalSales: 150000,
};

const mockRecentBookings = [
  { id: 'BK123', event: 'IPL Finals 2024', user: 'user@example.com', amount: 6000, status: 'PENDING', date: new Date(Date.now() - 3600000) },
  { id: 'BK124', event: 'Music Concert', user: 'another@example.com', amount: 2500, status: 'CONFIRMED', date: new Date(Date.now() - 7200000) },
  { id: 'BK125', event: 'IPL Finals 2024', user: 'test@example.com', amount: 10000, status: 'PROCESSING', date: new Date(Date.now() - 10800000) },
];

export default function AdminDashboard() {

  // TODO: Add authentication check for admin role

  return (
    <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-primary">Admin Dashboard</h1>
        <div className="space-x-2">
            <Button asChild variant="outline" size="sm">
                <Link href="/admin/settings"><Settings className="mr-2 h-4 w-4" /> Settings</Link>
            </Button>
            <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90" size="sm">
                 <Link href="/admin/events/new"><PlusCircle className="mr-2 h-4 w-4" /> Create Event</Link>
            </Button>
        </div>

      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockAdminStats.totalEvents}</div>
            <p className="text-xs text-muted-foreground">{mockAdminStats.activeEvents} active</p>
          </CardContent>
        </Card>
        <Card>
           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Verifications</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{mockAdminStats.pendingVerifications}</div>
             <Link href="/admin/verifications" className="text-xs text-accent hover:underline">View pending</Link>
          </CardContent>
        </Card>
         <Card>
           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <BarChart2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{mockAdminStats.totalSales.toLocaleString('en-IN')}</div>
             <Link href="/admin/analytics" className="text-xs text-accent hover:underline">View analytics</Link>
          </CardContent>
        </Card>
        {/* Add more relevant stats cards */}
      </div>

      {/* Quick Actions */}
        <Card className="mb-8">
            <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-4">
                 <Button asChild variant="secondary">
                    <Link href="/admin/events"><Edit className="mr-2 h-4 w-4" /> Manage Events</Link>
                 </Button>
                  <Button asChild variant="secondary">
                    <Link href="/admin/verifications"><CheckCircle className="mr-2 h-4 w-4" /> Verify Payments ({mockAdminStats.pendingVerifications})</Link>
                 </Button>
                 <Button asChild variant="secondary">
                    <Link href="/admin/discounts"><Tag className="mr-2 h-4 w-4" /> Manage Discounts</Link>
                 </Button>
                  <Button asChild variant="secondary">
                    <Link href="/admin/analytics"><BarChart2 className="mr-2 h-4 w-4" /> View Sales Analytics</Link>
                 </Button>
            </CardContent>
        </Card>


      {/* Recent Bookings */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Bookings / Verifications</CardTitle>
          <CardDescription>A quick look at recent activity.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Booking ID</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockRecentBookings.map((booking) => (
                <TableRow key={booking.id}>
                  <TableCell className="font-mono text-xs">{booking.id}</TableCell>
                  <TableCell>{booking.event}</TableCell>
                  <TableCell className="text-muted-foreground">{booking.user}</TableCell>
                  <TableCell>₹{booking.amount.toLocaleString('en-IN')}</TableCell>
                  <TableCell>
                    <Badge variant={
                        booking.status === 'PENDING' ? 'outline' :
                        booking.status === 'PROCESSING' ? 'secondary' : // Use secondary for processing
                        booking.status === 'CONFIRMED' ? 'default' : // Use default (primary) for confirmed
                        'destructive' // For FAILED/CANCELLED
                    } className={
                        booking.status === 'CONFIRMED' ? 'bg-green-600 text-white' : ''
                    }>
                      {booking.status}
                    </Badge>
                  </TableCell>
                   <TableCell className="text-xs text-muted-foreground">{booking.date.toLocaleTimeString()} {booking.date.toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    {booking.status === 'PROCESSING' && (
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/admin/verifications/${booking.id}`}>Verify</Link>
                      </Button>
                    )}
                     {(booking.status === 'PENDING' || booking.status === 'CONFIRMED') && (
                       <Button asChild variant="ghost" size="sm">
                        <Link href={`/admin/bookings/${booking.id}`}>Details</Link>
                      </Button>
                     )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
           {/* Add pagination if needed */}
        </CardContent>
      </Card>
    </div>
  );
}
