'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogIn, UserPlus } from 'lucide-react';

export default function LoginPage() {
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    console.log("Logging in with:", loginEmail, loginPassword);
    // TODO: Implement actual login logic using API call
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay
    console.log("Login simulation complete");
    // Handle response, redirect on success, show error on failure
    setIsSubmitting(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    console.log("Signing up with:", signupName, signupEmail, signupPassword);
    // TODO: Implement actual signup logic using API call
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API delay
    console.log("Signup simulation complete");
     // Handle response, potentially switch to login tab or show message
    setIsSubmitting(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary p-4">
      <Tabs defaultValue="login" className="w-full max-w-md">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="login"><LogIn className="mr-2 h-4 w-4"/>Login</TabsTrigger>
          <TabsTrigger value="signup"><UserPlus className="mr-2 h-4 w-4"/>Sign Up</TabsTrigger>
        </TabsList>

        {/* Login Tab */}
        <TabsContent value="login">
          <Card>
            <CardHeader>
              <CardTitle>Login</CardTitle>
              <CardDescription>Access your TicketFlow account.</CardDescription>
            </CardHeader>
            <form onSubmit={handleLogin}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="you@example.com"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <Input
                    id="login-password"
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    disabled={isSubmitting}
                   />
                </div>
                 {/* TODO: Add "Forgot Password" link */}
              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={isSubmitting}>
                   {isSubmitting ? 'Logging in...' : 'Login'}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        {/* Signup Tab */}
        <TabsContent value="signup">
          <Card>
            <CardHeader>
              <CardTitle>Sign Up</CardTitle>
              <CardDescription>Create a new TicketFlow account.</CardDescription>
            </CardHeader>
             <form onSubmit={handleSignup}>
              <CardContent className="space-y-4">
                 <div className="space-y-2">
                  <Label htmlFor="signup-name">Full Name</Label>
                  <Input
                    id="signup-name"
                    placeholder="Your Name"
                    required
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="you@example.com"
                    required
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    disabled={isSubmitting}
                   />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="Create a password"
                    required
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    disabled={isSubmitting}
                  />
                   {/* TODO: Add password confirmation field */}
                </div>
              </CardContent>
              <CardFooter>
                 <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={isSubmitting}>
                    {isSubmitting ? 'Creating Account...' : 'Sign Up'}
                 </Button>
              </CardFooter>
             </form>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
