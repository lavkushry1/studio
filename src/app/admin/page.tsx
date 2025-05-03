import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, Edit, BarChart2, Settings, Tag, CheckCircle, Users, AlertCircle, Activity } from 'lucide-react'; // Added icons
import Link from "next/link";
import { Separator } from "@/components/ui/separator";

// Mock Data - Replace with actual data fetching
const mockAdminStats = {
  totalEvents: 15,
  activeEvents: 8,
  draftEvents: 2,
  pendingVerifications: 12,
  totalSales: 156789.50,
  totalBookings: 45,
  registeredUsers: 253,
};

const mockRecentBookings = [
  { id: 'BK123', event: 'IPL Finals 2024', user: 'user@example.com', amount: 6000, status: 'PENDING', date: new Date(Date.now() - 3600000) },
  { id: 'BK124', event: 'Rock Legends Live', user: 'another@example.com', amount: 2500, status: 'CONFIRMED', date: new Date(Date.now() - 7200000) },
  { id: 'BK125', event: 'IPL Finals 2024', user: 'test@example.com', amount: 10000, status: 'PROCESSING', date: new Date(Date.now() - 10800000) },
  { id: 'BK126', event: 'Future of AI Conf', user: 'ai-fan@example.com', amount: 500, status: 'FAILED', date: new Date(Date.now() - 14400000) },
  { id: 'BK127', event: 'Rock Legends Live', user: 'vip@example.com', amount: 7500, status: 'PROCESSING', date: new Date(Date.now() - 18000000) },
];

const mockSystemStatus = {
    api: 'Operational',
    database: 'Operational',
    paymentGateway: 'Degraded Performance', // Example issue
    realtimeService: 'Operational'
};

export default function AdminDashboard() {

  // TODO: Add authentication check for admin role using useAuth hook or server-side check

  return (
    <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
            <h1 className="text-3xl font-bold text-primary">Admin Dashboard</h1>
            <p className="text-muted-foreground">Overview and management portal for TicketFlow.</p>
        </div>
        <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
                <Link href="/admin/settings"><Settings className="mr-1.5 h-4 w-4" /> Platform Settings</Link>
            </Button>
            <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90" size="sm">
                 <Link href="/admin/events/new"><PlusCircle className="mr-1.5 h-4 w-4" /> Create New Event</Link>
            </Button>
        </div>

      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="border border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <BarChart2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{mockAdminStats.totalSales.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
             <Link href="/admin/analytics" className="text-xs text-accent hover:underline">View detailed analytics</Link>
          </CardContent>
        </Card>
         <Card className="border border-border">
           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Verifications</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${mockAdminStats.pendingVerifications > 0 ? 'text-orange-600' : 'text-primary'}`}>{mockAdminStats.pendingVerifications}</div>
             <Link href="/admin/verifications" className="text-xs text-accent hover:underline">Verify payments</Link>
          </CardContent>
        </Card>
        <Card className="border border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockAdminStats.totalEvents}</div>
            <p className="text-xs text-muted-foreground">{mockAdminStats.activeEvents} active / {mockAdminStats.draftEvents} drafts</p>
          </CardContent>
        </Card>
         <Card className="border border-border">
           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Registered Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockAdminStats.registeredUsers}</div>
            <Link href="/admin/users" className="text-xs text-accent hover:underline">Manage users</Link>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions & System Status */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
             <Card className="lg:col-span-2 border border-border">
                <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                    <CardDescription>Common administrative tasks.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-3">
                     <Button asChild variant="secondary">
                        <Link href="/admin/events"><Edit className="mr-1.5 h-4 w-4" /> Manage Events</Link>
                     </Button>
                      <Button asChild variant="secondary">
                        <Link href="/admin/verifications">
                            <CheckCircle className="mr-1.5 h-4 w-4" /> Verify Payments
                             {mockAdminStats.pendingVerifications > 0 && (
                                <Badge variant="destructive" className="ml-2">{mockAdminStats.pendingVerifications}</Badge>
                            )}
                        </Link>
                     </Button>
                     <Button asChild variant="secondary">
                        <Link href="/admin/bookings"><Activity className="mr-1.5 h-4 w-4" /> View Bookings</Link>
                     </Button>
                     <Button asChild variant="secondary">
                        <Link href="/admin/discounts"><Tag className="mr-1.5 h-4 w-4" /> Manage Discounts</Link>
                     </Button>
                      <Button asChild variant="secondary">
                        <Link href="/admin/users"><Users className="mr-1.5 h-4 w-4" /> Manage Users</Link>
                     </Button>
                     <Button asChild variant="secondary">
                        <Link href="/admin/analytics"><BarChart2 className="mr-1.5 h-4 w-4" /> Sales Analytics</Link>
                     </Button>
                </CardContent>
            </Card>
             <Card className="border border-border">
                 <CardHeader>
                     <CardTitle>System Status</CardTitle>
                     <CardDescription>Real-time component health.</CardDescription>
                 </CardHeader>
                 <CardContent className="space-y-2.5 text-sm">
                    {Object.entries(mockSystemStatus).map(([service, status]) => {
                        const isOperational = status === 'Operational';
                        return (
                            <div key={service} className="flex justify-between items-center">
                                <span className="text-muted-foreground">{service.charAt(0).toUpperCase() + service.slice(1).replace(/([A-Z])/g, ' $1')}:</span>
                                <Badge variant={isOperational ? "secondary" : "destructive"} className={`flex items-center gap-1 ${isOperational ? 'bg-green-100 text-green-800 border-green-200' : 'bg-red-100 text-red-800 border-red-200'}`}>
                                    {isOperational ? <CheckCircle className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                                    {status}
                                </Badge>
                            </div>
                        );
                    })}
                 </CardContent>
            </Card>
        </div>


      {/* Recent Bookings */}
      <Card className="border border-border">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest bookings and payments needing verification.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Booking ID</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>User Email</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead>Date / Time</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockRecentBookings.length > 0 ? mockRecentBookings.map((booking) => (
                <TableRow key={booking.id} className="hover:bg-muted/50">
                  <TableCell className="font-mono text-xs">{booking.id}</TableCell>
                  <TableCell className="font-medium">{booking.event}</TableCell>
                  <TableCell className="text-muted-foreground">{booking.user}</TableCell>
                  <TableCell className="text-right">₹{booking.amount.toLocaleString('en-IN')}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={
                        booking.status === 'PENDING' ? 'outline' :
                        booking.status === 'PROCESSING' ? 'secondary' :
                        booking.status === 'CONFIRMED' ? 'default' :
                        'destructive'
                    } className={
                         booking.status === 'PENDING' ? 'border-yellow-500 text-yellow-700' :
                         booking.status === 'PROCESSING' ? 'border-blue-500 text-blue-700' :
                         booking.status === 'CONFIRMED' ? 'bg-green-600 text-white hover:bg-green-700' :
                         booking.status === 'FAILED' ? 'bg-red-600 text-white hover:bg-red-700' : ''
                    }>
                      {booking.status}
                    </Badge>
                  </TableCell>
                   <TableCell className="text-xs text-muted-foreground">{booking.date.toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</TableCell>
                  <TableCell className="text-right space-x-1">
                    {booking.status === 'PROCESSING' && (
                      <Button asChild variant="ghost" size="sm" className="text-accent hover:text-accent/80 h-8 px-2">
                        <Link href={`/admin/verifications/${booking.id}`}>Verify</Link>
                      </Button>
                    )}
                    <Button asChild variant="ghost" size="sm" className="h-8 px-2">
                      <Link href={`/admin/bookings/${booking.id}`}>Details</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              )) : (
                 <TableRow>
                     <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                         No recent bookings found.
                     </TableCell>
                 </TableRow>
              )}
            </TableBody>
          </Table>
           {/* TODO: Add pagination controls if list becomes long */}
           {mockRecentBookings.length > 5 && (
               <div className="flex justify-center mt-4">
                    <Button variant="outline" size="sm">View All Bookings</Button>
               </div>
           )}
        </CardContent>
      </Card>
    </div>
  );
}
