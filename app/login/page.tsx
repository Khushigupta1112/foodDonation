import { Suspense } from "react";
import { redirect } from "next/navigation";
import AuthForm from "@/components/AuthForm";
import { getCurrentUser } from "@/lib/auth";

export const metadata = { title: "Log in" };

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-3xl font-bold text-gray-900">Welcome back</h1>
      <p className="mt-1 text-gray-600">Log in to manage your donations and claims.</p>
      <div className="mt-6">
        <Suspense>
          <AuthForm mode="login" />
        </Suspense>
      </div>
    </div>
  );
}
