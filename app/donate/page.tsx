import { redirect } from "next/navigation";
import NewDonationForm from "@/components/NewDonationForm";
import { getCurrentUser } from "@/lib/auth";

export const metadata = { title: "Donate food" };

export default async function DonatePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/donate");
  if (user.role !== "donor") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <div className="card p-10">
          <div className="text-4xl">🙋</div>
          <h1 className="mt-3 text-xl font-bold text-gray-900">You&apos;re on the receiving side</h1>
          <p className="mt-2 text-gray-600">
            Your account is a claimer account (NGO / volunteer). Only donor accounts can post
            donations — you can <a href="/browse" className="font-semibold text-brand hover:underline">browse and claim food</a> instead.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-bold text-gray-900">Post surplus food</h1>
      <p className="mt-1 text-gray-600">
        Give it a clear title, honest best-before time, and an easy pickup window — that&apos;s all
        it takes to rescue a meal.
      </p>
      <div className="mt-6">
        <NewDonationForm />
      </div>
    </div>
  );
}
