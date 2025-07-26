"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import React, { useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { useTRPC } from "@/trpc/client";

export function SignUpForm() {
  const trpc = useTRPC();
  const searchParams = useSearchParams();
  const [invitationCode, setInvitationCode] = useState(searchParams.get("code") || "");
  const [error, setError] = useState<string | null>(null);
  const emailInputRef = React.useRef<HTMLInputElement>(null);

  const { data: invitationValidation, isLoading: isValidatingInvitation } = useQuery(
    trpc.invitations.validate.queryOptions(
      {
        code: invitationCode.toUpperCase(),
      },
      {
        enabled: invitationCode.length >= 8,
        retry: false,
      },
    ),
  );

  const signUpMutation = useMutation({
    mutationFn: async (formData: { email: string; password: string; name: string; invitationCode: string }) => {
      const { data, error } = await authClient.signUp.email(formData);
      if (error) throw new Error(error.message || "An error occurred during sign up");
      return data;
    },
    onSuccess: () => {
      // TODO: why router.push() does not work here?
      // router.push("/recordings");
      location.href = "/recordings";
    },
    onError: (error: Error) => {
      setError(error.message);
    },
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    const email = (formData.get("email") as string) || emailInputRef.current?.value || "";
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;
    const name = formData.get("name") as string;

    if (!email || !password || !name || !invitationCode) {
      setError("All fields are required.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    // Check if invitation is valid
    if (!invitationValidation?.valid) {
      setError("Valid invitation code is required to sign up.");
      return;
    }

    // If invitation is for a specific email, verify it matches
    if (invitationValidation.invitation?.email && invitationValidation.invitation.email !== email) {
      setError("This invitation is for a different email address.");
      return;
    }

    signUpMutation.mutate({ email, password, name, invitationCode: invitationCode.toUpperCase() });
  };

  // Pre-fill email if invitation specifies one
  useEffect(() => {
    if (invitationValidation?.valid && invitationValidation.invitation?.email) {
      const emailInput = emailInputRef.current;
      if (emailInput) {
        emailInput.value = invitationValidation.invitation.email;
      }
    }
  }, [invitationValidation]);

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Create Account</CardTitle>
        <CardDescription>Sign up to get started</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="invitationCode">Invitation Code</Label>
            <Input
              id="invitationCode"
              name="invitationCode"
              type="text"
              placeholder="8-character code"
              defaultValue={invitationCode}
              onChange={(e) => setInvitationCode(e.target.value)}
              maxLength={8}
              style={{ textTransform: "uppercase" }}
              required
            />
            {isValidatingInvitation && <p className="text-sm text-muted-foreground">Validating invitation...</p>}
            {invitationValidation && (
              <Alert variant={invitationValidation.valid ? "default" : "destructive"}>
                {invitationValidation.valid ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <AlertDescription>
                  {invitationValidation.valid
                    ? `You've been invited by ${invitationValidation.invitation?.inviterName}!`
                    : invitationValidation.error}
                </AlertDescription>
              </Alert>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" type="text" placeholder="Enter your name" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="Enter your email"
              disabled={!!invitationValidation?.invitation?.email}
              required
              ref={emailInputRef}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="Enter your password (min. 8 characters)"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              placeholder="Confirm your password"
              required
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" className="w-full" disabled={signUpMutation.isPending || signUpMutation.isSuccess}>
            {signUpMutation.isPending ? "Creating Account..." : "Create Account"}
          </Button>

          <div className="text-center text-sm">
            <span className="text-muted-foreground">Already have an account?</span>{" "}
            <Link href="/signin" className="hover:underline">
              Sign in
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
