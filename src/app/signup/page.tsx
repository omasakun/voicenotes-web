import { SignUpForm } from "@/app/signup/form";
import { Suspense } from "react";

export default function SignUpPage() {
  // TODO; proper useSearchParams usage
  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4">
      <Suspense>
        <SignUpForm />
      </Suspense>
    </div>
  );
}
