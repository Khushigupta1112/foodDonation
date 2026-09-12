import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import LogoutButton from "./LogoutButton";

export default async function NavBar() {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-40 border-b border-black/8 bg-white/90 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold text-brand">
          <span className="text-2xl">🍽️</span> FoodShare
        </Link>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link href="/browse" className="hidden px-2 text-sm font-medium text-gray-700 hover:text-brand sm:block">
            Browse food
          </Link>
          {user ? (
            <>
              <Link href="/dashboard" className="px-2 text-sm font-medium text-gray-700 hover:text-brand">
                Dashboard
              </Link>
              {user.role === "donor" && (
                <Link href="/donate" className="btn-primary">
                  + Donate food
                </Link>
              )}
              <LogoutButton />
            </>
          ) : (
            <>
              <Link href="/login" className="btn-secondary">
                Log in
              </Link>
              <Link href="/register" className="btn-primary">
                Sign up
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
