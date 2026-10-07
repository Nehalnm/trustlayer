type PaymentProtectionBannerProps = {
  currency: string;
  totalAmount: number;
  protectedAmount: number;
};

export default function PaymentProtectionBanner({
  currency,
  totalAmount,
  protectedAmount,
}: PaymentProtectionBannerProps) {
  const progress =
    totalAmount > 0
      ? Math.min(100, Math.round((protectedAmount / totalAmount) * 100))
      : 0;

  return (
    <section className="overflow-hidden border border-[#1b2940] bg-[#111c2d]">
      <div className="grid lg:grid-cols-[1fr_380px]">
        <div className="p-7 sm:p-9">
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <span className="h-2 w-2 bg-emerald-400" />
            Payment protection
          </div>

          <h2 className="mt-5 max-w-2xl text-3xl font-semibold leading-tight tracking-tight text-white sm:text-4xl">
            Your payment stays protected while the work is verified.
          </h2>

          <p className="mt-4 max-w-xl text-sm leading-6 text-slate-300 sm:text-base">
            Money is authorized through PayPal first. It only moves after the
            submitted work satisfies the agreed milestone requirements.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-y-4 text-sm">
            <div className="flex items-center gap-2 text-white">
              <span className="flex h-7 w-7 items-center justify-center border border-slate-600 text-[11px]">
                01
              </span>
              Payment authorized
            </div>

            <span className="mx-3 hidden text-slate-600 sm:inline">→</span>

            <div className="flex items-center gap-2 text-white">
              <span className="flex h-7 w-7 items-center justify-center border border-slate-600 text-[11px]">
                02
              </span>
              Work verified
            </div>

            <span className="mx-3 hidden text-slate-600 sm:inline">→</span>

            <div className="flex items-center gap-2 text-white">
              <span className="flex h-7 w-7 items-center justify-center border border-slate-600 text-[11px]">
                03
              </span>
              Payment released
            </div>
          </div>
        </div>

        {/* PayPal payment visual */}
        <div className="flex items-center justify-center border-t border-slate-700 bg-[#0d1727] p-7 lg:border-l lg:border-t-0">
          <div className="w-full max-w-[300px] border border-slate-300 bg-white p-5 text-slate-950">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div className="flex items-center gap-2.5">
                <img
                  src="https://www.paypalobjects.com/digitalassets/c/website/logo/full-text/pp_fc_hl.svg"
                  alt="PayPal"
                  className="h-7 w-auto"
                />
              </div>

              <div className="text-[10px] font-semibold tracking-widest text-emerald-700">
                AUTHORIZED
              </div>
            </div>

            <div className="mt-5">
              <p className="text-xs text-slate-500">Protected amount</p>

              <p className="mt-1 text-2xl font-semibold tracking-tight">
                {currency} {protectedAmount.toFixed(2)}
              </p>
            </div>

            <div className="mt-5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Project protection</span>
                <span className="font-semibold text-slate-900">
                  {progress}%
                </span>
              </div>

              <div className="mt-2 h-1 bg-slate-200">
                <div
                  className="h-1 bg-[#003087]"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between border-t border-slate-200 pt-4">
              <span className="text-xs text-slate-500">
                Total project value
              </span>

              <span className="text-sm font-semibold">
                {currency} {totalAmount.toFixed(2)}
              </span>
            </div>

            <p className="mt-4 text-[11px] leading-5 text-slate-500">
              Authorization protects the payment. Capture happens only after the
              milestone passes TrustLayer's payment policy.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
