import {
  getWireBankDetailsForCurrency,
  getWireBankDetailsMx,
  getWireBankDetailsSepa,
} from "@/lib/billing/wire-config";
import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default function WirePreviewPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  const mx = getWireBankDetailsMx();
  const sepa = getWireBankDetailsSepa();

  return (
    <div className="mx-auto max-w-2xl space-y-10 p-8 font-sans text-sm text-ns-tertiary">
      <div>
        <h1 className="text-xl font-bold">Wire preview (dev only)</h1>
        <p className="mt-2 text-ns-secondary">
          Both payment rails are available in every locale. Users pick MXN or EUR on{" "}
          <Link href="/upgrade" className="underline">/upgrade</Link>.
          Env vars: <code>WIRE_MX_*</code> and <code>WIRE_SEPA_*</code>.
        </p>
      </div>

      <section className="rounded-xl border border-amber-200 bg-amber-50/80 p-5">
        <h2 className="font-bold">MXN — NU México (CLABE)</h2>
        {mx.configured && mx.rail === "mx_clabe" ? (
          <ul className="mt-3 space-y-1.5">
            <li>
              <strong>Entidad:</strong> {mx.entity}
            </li>
            <li>
              <strong>CLABE:</strong>{" "}
              <code className="rounded bg-white px-1">{mx.clabe}</code>
            </li>
            <li>
              <strong>Cuenta:</strong> {mx.accountNumber}
            </li>
            <li>
              <strong>Titular:</strong> {mx.accountHolder}
            </li>
            <li>
              <strong>Pro:</strong> $330 MXN/mo · <strong>Pro+:</strong> $570 MXN/mo
            </li>
          </ul>
        ) : (
          <p className="mt-2 text-red-600">WIRE_MX_* missing in .env.local</p>
        )}
      </section>

      <section className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-5">
        <h2 className="font-bold">EUR — SEPA (Trade Republic)</h2>
        {sepa.configured && sepa.rail === "sepa" ? (
          <ul className="mt-3 space-y-1.5">
            <li>
              <strong>Titulaire:</strong> {sepa.accountHolder}
            </li>
            <li>
              <strong>IBAN:</strong> <code className="rounded bg-white px-1">{sepa.iban}</code>
            </li>
            <li>
              <strong>BIC:</strong> {sepa.bic}
            </li>
            <li>
              <strong>Banque:</strong> {sepa.bankName}
            </li>
            <li>
              <strong>Pro:</strong> 16 €/mo · <strong>Pro+:</strong> 28 €/mo
            </li>
          </ul>
        ) : (
          <p className="mt-2 text-red-600">WIRE_SEPA_* missing in .env.local</p>
        )}
      </section>

      <p className="text-xs text-ns-secondary">
        API check: <code>getWireBankDetailsForCurrency(&quot;mxn&quot;)</code> configured={" "}
        {String(getWireBankDetailsForCurrency("mxn").configured)} · EUR configured={" "}
        {String(getWireBankDetailsForCurrency("eur").configured)}
      </p>
    </div>
  );
}
