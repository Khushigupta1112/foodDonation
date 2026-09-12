import { Suspense } from "react";
import { redirect } from "next/navigation";
import AuthForm from "@/components/AuthForm";
import { getCurrentUser } from "@/lib/auth";

export const metadata = { title: "Sign up" };

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-3xl font-bold text-gray-900">Join FoodShare</h1>
      <p className="mt-1 text-gray-600">
        Donors post surplus food; NGOs and volunteers claim and pick it up.
      </p>
      <div className="mt-6">
        <Suspense>
          <AuthForm mode="register" />
        </Suspense>
      </div>
    </div>
  );
}
