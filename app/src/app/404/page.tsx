import { AppWrapper } from "@/components/app-wrapper";
import { Button } from "@/components/ui/button";

export default function NotFoundPage() {
  return (
    <AppWrapper>
      <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
        <div className="text-center">
          <h1 className="mb-4 text-6xl font-bold text-gray-900">404</h1>
          <h2 className="mb-6 text-2xl font-semibold text-gray-700">Page Not Found</h2>
          <p className="mb-8 max-w-md text-gray-600">
            {
              "Sorry, we couldn't find the page you're looking for. It might have been moved, deleted, or you entered the wrong URL."
            }
          </p>
          <a href="/" className="flex justify-center">
            <Button variant="outline" size="sm">
              Back to Top Page
            </Button>
          </a>
        </div>
      </div>
    </AppWrapper>
  );
}
