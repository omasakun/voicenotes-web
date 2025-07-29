import { AppWrapper } from "@/components/app-wrapper";
import { Button } from "@/components/ui/button";

export default function ServerErrorPage() {
  return (
    <AppWrapper>
      <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
        <div className="text-center">
          <h1 className="mb-4 text-6xl font-bold text-gray-900">500</h1>
          <h2 className="mb-6 text-2xl font-semibold text-gray-700">Internal Server Error</h2>
          <p className="mb-8 max-w-md text-gray-600">
            Something went wrong on our end. This could be due to a temporary issue or a bug in our system.
          </p>
          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <Button variant="outline" size="sm" asChild>
              <a href="/">Back to Top Page</a>
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </div>
        </div>
      </div>
    </AppWrapper>
  );
}
