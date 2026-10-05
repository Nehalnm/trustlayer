"use client";

import { useEffect, useState } from "react";

import {
  PayPalProvider,
  PayPalCardFieldsProvider,
  PayPalCardNumberField,
  PayPalCardExpiryField,
  PayPalCardCvvField,
  usePayPalCardFields,
  usePayPalCardFieldsOneTimePaymentSession,
} from "@paypal/react-paypal-js/sdk-v6";

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

async function createOrder(): Promise<string> {
  const response = await fetch("/api/orders", {
    method: "POST",
  });

  if (!response.ok) {
    throw new Error("Failed to create PayPal order");
  }

  const data = await response.json();

  if (!data.id) {
    throw new Error("PayPal order ID was not returned");
  }

  console.log("PayPal order created:", data.id);

  return data.id;
}

async function captureOrder(orderId: string) {
  const response = await fetch(`/api/orders/${orderId}/capture`, {
    method: "POST",
  });

  if (!response.ok) {
    throw new Error("Failed to capture PayPal order");
  }

  return response.json();
}

function CardFieldsForm() {
  const [error, setError] = useState<string | null>(null);
  const [paymentComplete, setPaymentComplete] = useState(false);
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

    console.log("PayPal Card Fields response:", submitResponse);

    const { orderId, message } = submitResponse.data;

    if (submitResponse.state === "succeeded") {
      captureOrder(orderId)
        .then(() => {
          console.log("PayPal order captured:", orderId);

          setPaymentComplete(true);
          setIsSubmitting(false);
        })
        .catch((captureError) => {
          console.error("PayPal capture error:", captureError);

          setError(
            captureError instanceof Error
              ? captureError.message
              : "Payment capture failed.",
          );

          setIsSubmitting(false);
        });
    }

    if (submitResponse.state === "failed") {
      console.error("PayPal payment failed:", message);

      setError(message || "PayPal card payment failed.");

      setIsSubmitting(false);
    }
  }, [submitResponse]);

  const handleSubmit = async () => {
    try {
      setError(null);
      setIsSubmitting(true);

      const orderId = await createOrder();

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

  if (paymentComplete) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 font-medium text-emerald-700">
        ✓ Payment successful! Your milestone is now protected.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">
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
          <label className="mb-2 block text-sm font-medium text-slate-700">
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
          <label className="mb-2 block text-sm font-medium text-slate-700">
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
        {isSubmitting ? "Processing..." : "Pay $9.99"}
      </button>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p className="font-semibold">Payment error</p>

          <p className="mt-1">{error}</p>
        </div>
      )}
    </div>
  );
}

export default function PayPalCheckout() {
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
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        <p className="font-semibold">PayPal initialization failed</p>

        <p className="mt-1">{tokenError}</p>
      </div>
    );
  }

  if (!clientToken) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-600">
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
          value: "9.99",
          currencyCode: "USD",
        }}
      >
        <CardFieldsForm />
      </PayPalCardFieldsProvider>
    </PayPalProvider>
  );
}
