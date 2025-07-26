import { FileAudio, LogOut, type LucideIcon, Menu, Settings, UserIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useStopImpersonatingMutation } from "@/hooks/auth-admin";
import { authClient } from "@/lib/auth-client";
import { TRPCReactProvider } from "@/trpc/client";
import type { User } from "@/lib/auth";

const targetPaths = ["/account", "/dashboard", "/recordings"];

export function Navigation({ pathname, user }: { pathname: string; user: User }) {
  return (
    <TRPCReactProvider>
      <NavigationBody pathname={pathname} user={user} />
    </TRPCReactProvider>
  );
}

function NavigationBody({ pathname, user: initialUser }: { pathname: string; user: User }) {
  const { data: session } = authClient.useSession();
  const user = session?.user || initialUser;
  const stopImpersonatingMutation = useStopImpersonatingMutation();

  const isImpersonating = session?.session?.impersonatedBy;

  const handleSignOut = async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          window.location.href = "/";
        },
      },
    });
  };

  const handleStopImpersonating = async () => {
    await stopImpersonatingMutation.mutateAsync();
  };

  const isActive = (path: string) => pathname === path;

  if (!targetPaths.some((path) => pathname.startsWith(path))) {
    return null;
  }

  return (
    <nav className="border-b border-gray-200 bg-white shadow-sm">
      <div className="container mx-auto flex h-16 items-center justify-between gap-4 px-4">
        <a href="/recordings" className="flex items-center gap-2">
          <FileAudio className="h-6 w-6 text-blue-600" />
          <span className="text-xl font-bold text-gray-900">Voicenotes</span>
        </a>

        <div className="hidden items-center gap-2 md:flex">
          <NavigationButton href="/recordings" icon={FileAudio} label="Recordings" isActive={isActive("/recordings")} />
          <NavigationButton href="/account" icon={UserIcon} label="Account" isActive={isActive("/account")} />
          {user?.role === "admin" && (
            <NavigationButton href="/dashboard" icon={Settings} label="Admin" isActive={isActive("/dashboard")} />
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden items-center gap-2 md:flex">
            <span className="text-sm text-gray-700">{user?.name || ""}</span>
            {user?.role === "admin" && (
              <Badge variant="outline" className="text-xs">
                Admin
              </Badge>
            )}
            {isImpersonating && (
              <Badge variant="destructive" className="text-xs">
                Impersonating
              </Badge>
            )}
          </div>
          {isImpersonating ? (
            <Button variant="outline" size="sm" onClick={handleStopImpersonating}>
              Stop Impersonating
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={handleSignOut} className="hidden md:flex">
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          )}

          <div className="md:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Menu className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent collisionPadding={8}>
                <DropdownMenuLabel>Navigation</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    window.location.href = "/recordings";
                  }}
                >
                  Recordings
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    window.location.href = "/account";
                  }}
                >
                  Account
                </DropdownMenuItem>
                {user?.role === "admin" && (
                  <DropdownMenuItem
                    onClick={() => {
                      window.location.href = "/dashboard";
                    }}
                  >
                    Admin
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                {isImpersonating ? (
                  <>
                    <DropdownMenuLabel className="text-destructive">Impersonating</DropdownMenuLabel>
                    <DropdownMenuItem onClick={handleStopImpersonating}>Stop Impersonating</DropdownMenuItem>
                  </>
                ) : (
                  <DropdownMenuItem onClick={handleSignOut}>Sign Out</DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </nav>
  );
}

interface NavigationButtonProps {
  href: string;
  icon: LucideIcon;
  label: string;
  isActive: boolean;
}

export function NavigationButton({ href, icon, label, isActive }: NavigationButtonProps) {
  const IconComponent = icon;
  return (
    <a href={href}>
      <Button variant={isActive ? "default" : "ghost"} className="flex items-center gap-2">
        <IconComponent className="h-4 w-4" />
        {label}
      </Button>
    </a>
  );
}
