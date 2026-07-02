import { AuthProvider } from "@/components/auth/auth-provider";
import { PricingPageContent } from "@/components/pricing/pricing-page";

export default function PricingPage() {
  return (
    <AuthProvider>
      <PricingPageContent />
    </AuthProvider>
  );
}
