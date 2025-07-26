import { Suspense } from "react";
import { AppWrapper } from "@/components/app-wrapper";
import { Button } from "@/components/ui/button";
import { SignUpForm } from "./form";

export default function SignUpPage() {
  return (
    <AppWrapper>
      <div className="min-h-screen flex flex-col items-center justify-center py-12 px-4">
        <h1 className="text-2xl font-bold mb-6">Voicenotes</h1>
        <Suspense>
          <SignUpForm />
        </Suspense>
        <a href="/" className="mt-6 w-full flex justify-center">
          <Button variant="outline" size="sm">
            Back to Top Page
          </Button>
        </a>
      </div>
    </AppWrapper>
  );
}
