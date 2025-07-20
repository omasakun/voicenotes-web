import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">Voicenotes</CardTitle>
          <CardDescription>Transform your voice recordings into organized text notes</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Link href="/signin" className="w-full">
              <Button className="w-full" size="lg">
                Sign In
              </Button>
            </Link>
            <Link href="/signup" className="w-full">
              <Button variant="outline" className="w-full" size="lg">
                Join with Invitation
              </Button>
            </Link>
          </div>
          <div className="text-center text-sm text-gray-600">
            <p>New users need an invitation code to sign up.</p>
            <p>Contact an existing user to get started.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
