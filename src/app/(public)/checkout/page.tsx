import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { CheckoutForm } from "@/components/shop/checkout-form";

export const metadata = { title: "ชำระเงิน" };

interface WcBilling {
  city?: string;
  state?: string;
  phone?: string;
}

function parseBilling(raw: string | null): WcBilling {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as WcBilling;
  } catch {
    return {};
  }
}

export default async function CheckoutPage() {
  const user = await getSessionUser();
  if (!user) redirect("/auth/login?next=/checkout");
  const billing = parseBilling(user.billingAddress);
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-teal-600 font-bold mb-6">
        ชำระเงิน
      </h1>
      <CheckoutForm
        user={{
          email: user.email ?? "",
          displayName: user.displayName ?? "",
          phone: user.phone ?? billing.phone ?? "",
          district: billing.city ?? "",
          province: billing.state ?? "",
        }}
      />
    </div>
  );
}
