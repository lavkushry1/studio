'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogIn, UserPlus, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { loginSchema, registerSchema, type LoginFormValues, type RegisterFormValues } from '@/lib/validation/auth';
import { useAuth } from '@/hooks/useAuth'; // Import useAuth hook
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'; // Import Form components

export default function LoginPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { login, register, isLoading: authIsLoading, isAuthenticated } = useAuth(); // Get auth functions and state
  const initialTab = searchParams.get('tab') === 'signup' ? 'signup' : 'login';
  const [activeTab, setActiveTab] = useState(initialTab);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !authIsLoading) {
        router.push('/events'); // Redirect to events or dashboard page
    }
  }, [isAuthenticated, authIsLoading, router]);


  // Login Form setup
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  // Signup Form setup
  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
    },
  });

  // Update active tab based on URL param
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    const newTab = tabParam === 'signup' ? 'signup' : 'login';
    if (newTab !== activeTab) {
        setActiveTab(newTab);
        // Reset form errors when switching tabs
        loginForm.reset();
        registerForm.reset();
    }
  }, [searchParams, activeTab, loginForm, registerForm]);

  const handleLogin = async (values: LoginFormValues) => {
    const success = await login(values);
    if (success) {
      router.push('/events'); // Redirect on successful login
    } else {
      loginForm.setError('root', { message: 'Login failed. Please check credentials.' }); // Set root error if specific field isn't known
    }
  };

  const handleSignup = async (values: RegisterFormValues) => {
    const success = await register(values);
    if (success) {
       setActiveTab('login'); // Switch to login tab
       loginForm.reset(); // Clear login form for potential immediate login
       registerForm.reset(); // Clear signup form
       // Toast is handled within the useAuth hook now
    } else {
        registerForm.setError('root', { message: 'Signup failed. The email might already be in use.' });
    }
  };

  const handleTabChange = (value: string) => {
      setActiveTab(value);
      const url = new URL(window.location.href);
      if (value === 'signup') {
          url.searchParams.set('tab', 'signup');
      } else {
          url.searchParams.delete('tab');
      }
      // Update URL without full page reload, only if the tab actually changes
      if (value !== activeTab) {
         router.replace(url.toString(), { scroll: false }); // Use replace to avoid history stack pollution
      }
       loginForm.reset(); // Reset forms on tab change
       registerForm.reset();
  }

  return (
    <div className="flex min-h-[calc(100vh-theme(spacing.14))] items-center justify-center bg-gradient-to-br from-secondary via-background to-secondary p-4">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full max-w-md">
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
            <Form {...loginForm}>
              <form onSubmit={loginForm.handleSubmit(handleLogin)}>
                <CardContent className="space-y-4">
                   {loginForm.formState.errors.root && <p className="text-sm text-destructive text-center">{loginForm.formState.errors.root.message}</p>}
                  <FormField
                    control={loginForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="you@example.com" {...field} disabled={authIsLoading} className="bg-background"/>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Enter your password" {...field} disabled={authIsLoading} className="bg-background"/>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="text-right text-sm">
                    <Link href="/forgot-password" className="text-accent hover:underline">
                        Forgot password?
                    </Link>
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-4">
                  <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={authIsLoading}>
                    {authIsLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {authIsLoading ? 'Logging in...' : 'Login'}
                  </Button>
                  <p className="text-sm text-muted-foreground">
                     Don't have an account?{' '}
                     <Button variant="link" type="button" className="p-0 h-auto text-accent" onClick={() => handleTabChange('signup')}>
                        Sign up
                     </Button>
                  </p>
                </CardFooter>
              </form>
            </Form>
          </Card>
        </TabsContent>

        {/* Signup Tab */}
        <TabsContent value="signup">
          <Card className="shadow-lg border border-border">
            <CardHeader>
              <CardTitle className="text-primary">Create Account</CardTitle>
              <CardDescription>Join TicketFlow to start booking events.</CardDescription>
            </CardHeader>
            <Form {...registerForm}>
              <form onSubmit={registerForm.handleSubmit(handleSignup)}>
                <CardContent className="space-y-4">
                   {registerForm.formState.errors.root && <p className="text-sm text-destructive text-center">{registerForm.formState.errors.root.message}</p>}
                  <FormField
                    control={registerForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Your Name" {...field} disabled={authIsLoading} className="bg-background"/>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                   <FormField
                    control={registerForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="you@example.com" {...field} disabled={authIsLoading} className="bg-background"/>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Create a strong password (min. 6 chars)" {...field} disabled={authIsLoading} className="bg-background"/>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                   {/* Optional: Add Confirm Password field here */}
                  <p className="text-xs text-muted-foreground pt-2">
                     By signing up, you agree to our{' '}
                     <Link href="/terms" className="underline hover:text-accent">Terms of Service</Link> and{' '}
                     <Link href="/privacy" className="underline hover:text-accent">Privacy Policy</Link>.
                  </p>
                </CardContent>
                <CardFooter className="flex flex-col gap-4">
                  <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={authIsLoading}>
                     {authIsLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {authIsLoading ? 'Creating Account...' : 'Sign Up'}
                  </Button>
                  <p className="text-sm text-muted-foreground">
                     Already have an account?{' '}
                     <Button variant="link" type="button" className="p-0 h-auto text-accent" onClick={() => handleTabChange('login')}>
                        Login
                     </Button>
                  </p>
                </CardFooter>
              </form>
            </Form>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
