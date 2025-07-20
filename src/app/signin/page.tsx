import Link from "next/link";
import { SignInForm } from "@/app/signin/form";
import { Button } from "@/components/ui/button";

export default function SignInPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center py-12 px-4">
      <h1 className="text-2xl font-bold mb-6">Voicenotes</h1>
      <SignInForm />
      <Link href="/" className="mt-6 w-full flex justify-center">
        <Button variant="outline" size="sm">
          Back to Top Page
        </Button>
      </Link>
    </div>
  );
}
