import { Suspense } from "react";
import { AppWrapper } from "@/components/app-wrapper";
import { Button } from "@/components/ui/button";
import { SignUpForm } from "./form";

export default function SignUpPage() {
  return (
    <AppWrapper>
      <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
        <h1 className="mb-6 text-2xl font-bold">Voicenotes</h1>
        <Suspense>
          <SignUpForm />
        </Suspense>
        <a href="/" className="mt-6 flex w-full justify-center">
          <Button variant="outline" size="sm">
            Back to Top Page
          </Button>
        </a>
      </div>
    </AppWrapper>
  );
}
