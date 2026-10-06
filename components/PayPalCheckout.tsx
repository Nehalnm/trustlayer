"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  PayPalProvider,
  PayPalOneTimePaymentButton,
  PayPalCardFieldsProvider,
  PayPalCardNumberField,
  PayPalCardExpiryField,
  PayPalCardCvvField,
  usePayPalCardFields,
  usePayPalCardFieldsOneTimePaymentSession,
} from "@paypal/react-paypal-js/sdk-v6";

type PayPalCheckoutProps = {
  milestoneId: string;
};

async function getClientToken(): Promise<string> {
  const response = await fetch("/api/paypal/client-token");

  if (!response.ok) {
    throw new Error("Failed to get PayPal client token");
  }

  const data = await response.json();

  if (!data.accessToken) {
    throw new Error("PayPal client token was not returned");
  }

  return data.accessToken;
}

async function createMilestoneOrder(milestoneId: string): Promise<string> {
  const response = await fetch(`/api/milestone/${milestoneId}/order`, {
    method: "POST",
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || "Failed to create milestone payment");
  }

  if (!data?.id) {
    throw new Error("PayPal order ID was not returned");
  }

  return data.id;
}

async function authorizeMilestonePayment(milestoneId: string) {
  const response = await fetch(`/api/milestone/${milestoneId}/authorize`, {
    method: "POST",
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || "Failed to authorize milestone payment");
  }

  return data;
}

function CardFieldsForm({
  milestoneId,
  onPaymentProtected,
}: {
  milestoneId: string;
  onPaymentProtected: () => void;
}) {
  const [error, setError] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const { error: cardFieldsError } = usePayPalCardFields();

  const {
    submit,
    submitResponse,
    error: submitError,
  } = usePayPalCardFieldsOneTimePaymentSession();

  useEffect(() => {
    if (cardFieldsError) {
      setError(cardFieldsError.message);
    }
  }, [cardFieldsError]);

  useEffect(() => {
    if (submitError) {
      setError(submitError.message);
      setIsSubmitting(false);
    }
  }, [submitError]);

  useEffect(() => {
    if (!submitResponse) {
      return;
    }

    const message = submitResponse.data?.message;

    if (submitResponse.state === "succeeded") {
      authorizeMilestonePayment(milestoneId)
        .then(() => {
          onPaymentProtected();
          setIsSubmitting(false);
        })
        .catch((authorizationError) => {
          console.error("Milestone authorization error:", authorizationError);

          setError(
            authorizationError instanceof Error
              ? authorizationError.message
              : "Payment authorization failed.",
          );

          setIsSubmitting(false);
        });
    }

    if (submitResponse.state === "failed") {
      setError(message || "PayPal card payment failed.");

      setIsSubmitting(false);
    }
  }, [submitResponse, milestoneId, onPaymentProtected]);

  const handleSubmit = async () => {
    try {
      setError(null);
      setIsSubmitting(true);

      const orderId = await createMilestoneOrder(milestoneId);

      await submit(orderId, {
        billingAddress: {
          addressLine1: "1 Market Street",
          adminArea2: "San Francisco",
          adminArea1: "CA",
          postalCode: "94105",
          countryCode: "US",
        },
      });
    } catch (submitErrorValue) {
      console.error("PayPal Card Fields error:", submitErrorValue);

      setError(
        submitErrorValue instanceof Error
          ? submitErrorValue.message
          : "Unable to process payment.",
      );

      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-800">
          Card number
        </label>

        <PayPalCardNumberField
          placeholder="Card number"
          containerStyles={{
            height: "48px",
            border: "1px solid #cbd5e1",
            borderRadius: "10px",
            padding: "0 12px",
          }}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-800">
            Expiry
          </label>

          <PayPalCardExpiryField
            placeholder="MM/YY"
            containerStyles={{
              height: "48px",
              border: "1px solid #cbd5e1",
              borderRadius: "10px",
              padding: "0 12px",
            }}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-800">
            CVV
          </label>

          <PayPalCardCvvField
            placeholder="CVV"
            containerStyles={{
              height: "48px",
              border: "1px solid #cbd5e1",
              borderRadius: "10px",
              padding: "0 12px",
            }}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={isSubmitting || !!cardFieldsError}
        className="w-full rounded-xl bg-blue-600 px-5 py-3.5 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting ? "Protecting payment..." : "Pay by card"}
      </button>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p className="font-semibold">Card payment error</p>

          <p className="mt-1">{error}</p>
        </div>
      )}
    </div>
  );
}

function PayPalButton({
  milestoneId,
  onPaymentProtected,
}: {
  milestoneId: string;
  onPaymentProtected: () => void;
}) {
  const [error, setError] = useState<string | null>(null);

  const [isAuthorizing, setIsAuthorizing] = useState(false);

  const handleCreateOrder = async () => {
    setError(null);

    return {
      orderId: await createMilestoneOrder(milestoneId),
    };
  };

  const handleApprove = async ({ orderId }: { orderId: string }) => {
    try {
      setError(null);
      setIsAuthorizing(true);

      /*
       * The PayPal button handles buyer approval.
       * TrustLayer then explicitly authorizes the order
       * on the server and stores the authorization ID.
       */
      await authorizeMilestonePayment(milestoneId);

      console.log("PayPal button order approved:", orderId);

      onPaymentProtected();
    } catch (authorizationError) {
      console.error("PayPal button authorization error:", authorizationError);

      setError(
        authorizationError instanceof Error
          ? authorizationError.message
          : "PayPal authorization failed.",
      );
    } finally {
      setIsAuthorizing(false);
    }
  };

  return (
    <div className="space-y-3">
      <PayPalOneTimePaymentButton
        createOrder={handleCreateOrder}
        onApprove={handleApprove}
        onCancel={() => {
          setError("PayPal checkout was cancelled.");
        }}
        onError={(paypalError) => {
          console.error("PayPal button error:", paypalError);

          setError(
            paypalError instanceof Error
              ? paypalError.message
              : "PayPal checkout failed.",
          );
        }}
        presentationMode="auto"
      />

      {isAuthorizing && (
        <p className="text-center text-sm text-slate-600">
          Protecting your milestone payment...
        </p>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p className="font-semibold">PayPal payment error</p>

          <p className="mt-1">{error}</p>
        </div>
      )}
    </div>
  );
}

export default function PayPalCheckout({ milestoneId }: PayPalCheckoutProps) {
  const router = useRouter();

  const [clientToken, setClientToken] = useState<string | null>(null);

  const [tokenError, setTokenError] = useState<string | null>(null);

  const [paymentProtected, setPaymentProtected] = useState(false);

  useEffect(() => {
    getClientToken()
      .then((token) => {
        setClientToken(token);
      })
      .catch((error) => {
        console.error("Failed to load PayPal client token:", error);

        setTokenError(
          error instanceof Error ? error.message : "Failed to load PayPal.",
        );
      });
  }, []);

  const handlePaymentProtected = () => {
    setPaymentProtected(true);

    setTimeout(() => {
      router.refresh();
    }, 700);
  };

  if (tokenError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        <p className="font-semibold">PayPal initialization failed</p>

        <p className="mt-1">{tokenError}</p>
      </div>
    );
  }

  if (!clientToken) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-700">
        Loading secure PayPal checkout...
      </div>
    );
  }

  if (paymentProtected) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4">
        <p className="font-semibold text-emerald-900">✓ Payment protected</p>

        <p className="mt-1 text-sm text-emerald-800">
          Payment authorized. Updating the project...
        </p>
      </div>
    );
  }

  return (
    <PayPalProvider
      clientToken={clientToken}
      environment="sandbox"
      components={["paypal-payments", "card-fields"]}
      pageType="checkout"
      testBuyerCountry="US"
    >
      <div className="space-y-6">
        {/* PayPal */}
        <div>
          <p className="mb-3 text-sm font-semibold text-slate-900">
            Pay with PayPal
          </p>

          <PayPalButton
            milestoneId={milestoneId}
            onPaymentProtected={handlePaymentProtected}
          />
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-slate-200" />

          <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
            or
          </span>

          <div className="h-px flex-1 bg-slate-200" />
        </div>

        {/* Card */}
        <div>
          <p className="mb-3 text-sm font-semibold text-slate-900">
            Pay by card
          </p>

          <PayPalCardFieldsProvider
            amount={{
              value: "0.00",
              currencyCode: "USD",
            }}
          >
            <CardFieldsForm
              milestoneId={milestoneId}
              onPaymentProtected={handlePaymentProtected}
            />
          </PayPalCardFieldsProvider>
        </div>
      </div>
    </PayPalProvider>
  );
}
