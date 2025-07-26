import { AppWrapper } from "@/components/app-wrapper";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function HomePage() {
  return (
    <AppWrapper>
      <div className="min-h-screen flex items-center justify-center py-12 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold">Voicenotes</CardTitle>
            <CardDescription>Transform your voice recordings into organized text notes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <a href="/signin" className="block w-full">
                <Button className="w-full" size="lg">
                  Sign In
                </Button>
              </a>
              <a href="/signup" className="block w-full">
                <Button variant="outline" className="w-full" size="lg">
                  Join with Invitation
                </Button>
              </a>
            </div>
            <div className="text-center text-sm text-gray-600">
              <p>New users need an invitation code to sign up.</p>
              <p>Contact an existing user to get started.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppWrapper>
  );
}
