'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation'; // Import useSearchParams
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogIn, UserPlus } from 'lucide-react';
import Link from 'next/link'; // Import Link

export default function LoginPage() {
  const searchParams = useSearchParams(); // Get search params
  const initialTab = searchParams.get('tab') === 'signup' ? 'signup' : 'login'; // Check for 'tab' query param

  const [activeTab, setActiveTab] = useState(initialTab); // Control active tab state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null); // State for error messages

   // Update active tab if query param changes after initial load
   useEffect(() => {
       const tabParam = searchParams.get('tab');
       if (tabParam === 'signup' && activeTab !== 'signup') {
           setActiveTab('signup');
       } else if (tabParam !== 'signup' && activeTab === 'signup') {
           setActiveTab('login');
       }
   }, [searchParams, activeTab]);


  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null); // Clear previous errors
    console.log("Logging in with:", loginEmail, loginPassword);
    // TODO: Implement actual login logic using API call
    try {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay
        console.log("Login simulation complete");
        // Handle success: Store tokens, redirect user (e.g., using router.push('/dashboard'))
        // import { useRouter } from 'next/navigation'; const router = useRouter();
    } catch (err: any) {
        setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
     setError(null); // Clear previous errors
    console.log("Signing up with:", signupName, signupEmail, signupPassword);
    // TODO: Implement actual signup logic using API call
     try {
        await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API delay
        console.log("Signup simulation complete");
        // Handle success: Maybe show success message and switch to login tab
        setActiveTab('login'); // Switch to login tab on successful signup
        // Optionally show a success toast/message
     } catch (err: any) {
        setError(err.message || 'Signup failed. Please try again.');
     } finally {
        setIsSubmitting(false);
     }
  };

  return (
    <div className="flex min-h-[calc(100vh-theme(spacing.14))] items-center justify-center bg-gradient-to-br from-secondary via-background to-secondary p-4">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full max-w-md"> {/* Control Tabs component */}
        <TabsList className="grid w-full grid-cols-2 bg-muted/80">
          <TabsTrigger value="login"><LogIn className="mr-1.5 h-4 w-4"/>Login</TabsTrigger>
          <TabsTrigger value="signup"><UserPlus className="mr-1.5 h-4 w-4"/>Sign Up</TabsTrigger>
        </TabsList>

        {/* Login Tab */}
        <TabsContent value="login">
          <Card className="shadow-lg border border-border">
            <CardHeader>
              <CardTitle className="text-primary">Welcome Back!</CardTitle>
              <CardDescription>Login to access your TicketFlow account.</CardDescription>
            </CardHeader>
            <form onSubmit={handleLogin}>
              <CardContent className="space-y-4">
                {error && <p className="text-sm text-destructive text-center">{error}</p>}
                <div className="space-y-1.5">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="you@example.com"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    disabled={isSubmitting}
                    className="bg-background"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="login-password">Password</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="Enter your password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    disabled={isSubmitting}
                    className="bg-background"
                   />
                </div>
                 <div className="text-right text-sm">
                    <Link href="/forgot-password" className="text-accent hover:underline">
                        Forgot password?
                    </Link>
                 </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-4">
                <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={isSubmitting}>
                   {isSubmitting ? 'Logging in...' : 'Login'}
                </Button>
                 <p className="text-sm text-muted-foreground">
                     Don't have an account?{' '}
                     <Button variant="link" className="p-0 h-auto text-accent" onClick={() => setActiveTab('signup')}>
                        Sign up
                     </Button>
                 </p>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        {/* Signup Tab */}
        <TabsContent value="signup">
          <Card className="shadow-lg border border-border">
            <CardHeader>
              <CardTitle className="text-primary">Create Account</CardTitle>
              <CardDescription>Join TicketFlow to start booking events.</CardDescription>
            </CardHeader>
             <form onSubmit={handleSignup}>
              <CardContent className="space-y-4">
                 {error && <p className="text-sm text-destructive text-center">{error}</p>}
                 <div className="space-y-1.5">
                  <Label htmlFor="signup-name">Full Name</Label>
                  <Input
                    id="signup-name"
                    placeholder="Your Name"
                    required
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    disabled={isSubmitting}
                    className="bg-background"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="you@example.com"
                    required
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    disabled={isSubmitting}
                    className="bg-background"
                   />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="Create a strong password (min. 6 chars)"
                    required
                    minLength={6} // Add basic validation
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    disabled={isSubmitting}
                    className="bg-background"
                  />
                   {/* TODO: Add password confirmation field */}
                </div>
                 <p className="text-xs text-muted-foreground pt-2">
                     By signing up, you agree to our{' '}
                     <Link href="/terms" className="underline hover:text-accent">Terms of Service</Link> and{' '}
                     <Link href="/privacy" className="underline hover:text-accent">Privacy Policy</Link>.
                 </p>
              </CardContent>
              <CardFooter className="flex flex-col gap-4">
                 <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={isSubmitting}>
                    {isSubmitting ? 'Creating Account...' : 'Sign Up'}
                 </Button>
                 <p className="text-sm text-muted-foreground">
                     Already have an account?{' '}
                     <Button variant="link" className="p-0 h-auto text-accent" onClick={() => setActiveTab('login')}>
                        Login
                     </Button>
                 </p>
              </CardFooter>
             </form>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
