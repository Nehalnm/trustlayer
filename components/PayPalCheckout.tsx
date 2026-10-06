"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  PayPalProvider,
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

function CardFieldsForm({ milestoneId }: { milestoneId: string }) {
  const router = useRouter();

  const [error, setError] = useState<string | null>(null);

  const [paymentProtected, setPaymentProtected] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const { error: cardFieldsError } = usePayPalCardFields();

  const {
    submit,
    submitResponse,
    error: submitError,
  } = usePayPalCardFieldsOneTimePaymentSession();

  useEffect(() => {
    if (cardFieldsError) {
      console.error("PayPal Card Fields loading error:", cardFieldsError);

      setError(cardFieldsError.message);
    }
  }, [cardFieldsError]);

  useEffect(() => {
    if (submitError) {
      console.error("PayPal Card Fields submit error:", submitError);

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
          setPaymentProtected(true);
          setIsSubmitting(false);

          /*
           * Refresh the parent Server Component.
           * This causes Supabase to be queried again,
           * so the milestone immediately changes from
           * PENDING → FUNDED without a manual refresh.
           */
          setTimeout(() => {
            router.refresh();
          }, 700);
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
  }, [submitResponse, milestoneId, router]);

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
        {isSubmitting ? "Protecting payment..." : "Protect milestone payment"}
      </button>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p className="font-semibold">Payment error</p>

          <p className="mt-1">{error}</p>
        </div>
      )}
    </div>
  );
}

export default function PayPalCheckout({ milestoneId }: PayPalCheckoutProps) {
  const [clientToken, setClientToken] = useState<string | null>(null);

  const [tokenError, setTokenError] = useState<string | null>(null);

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

  return (
    <PayPalProvider
      clientToken={clientToken}
      environment="sandbox"
      components={["card-fields"]}
      pageType="checkout"
      testBuyerCountry="US"
    >
      <PayPalCardFieldsProvider
        amount={{
          value: "0.00",
          currencyCode: "USD",
        }}
      >
        <CardFieldsForm milestoneId={milestoneId} />
      </PayPalCardFieldsProvider>
    </PayPalProvider>
  );
}
