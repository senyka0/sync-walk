"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useAppStore } from "@/store";
import { useI18n } from "@/lib/i18n";
import { ArrowLeft, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

type PaymentPayload = {
  paymentUrl: string;
  returnUrl: string;
  serviceUrl: string;
  merchantAuthType: string;
  merchantTransactionSecureType: string;
  orderTimeout: number;
  language: string;
  merchantAccount: string;
  merchantDomainName: string;
  orderReference: string;
  orderDate: number;
  amount: number;
  currency: string;
  productName: string[];
  productCount: number[];
  productPrice: number[];
  merchantSignature: string;
};

export function PaymentContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const tourId = params.tourId as string;
  const orderRef = searchParams.get("orderRef");
  const groupType = (searchParams.get("type") ?? "individual") as
    | "individual"
    | "group";

  const {
    tours,
    paymentStatus,
    createPayment,
    checkPaymentStatus,
    resetPayment,
    language,
  } = useAppStore();
  const tour = tours.find((t) => t.id === tourId);
  const dict = useI18n();
  const localizedTitle =
    language === "uk" ? (tour?.titleUk ?? tour?.title ?? "") : (tour?.title ?? "");
  const cityLabel =
    language === "uk"
      ? tour?.city === "kyiv"
        ? "Київ"
        : "Харків"
      : tour?.city === "kyiv"
        ? "Kyiv"
        : "Kharkiv";
  const paymentSuccessTitle = dict.payment.successToastTitle;
  const paymentSuccessDescription = dict.payment.successToastDescription;

  const price =
    groupType === "group" ? tour?.groupPrice : tour?.individualPrice;

  const [hasStarted, setHasStarted] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const submitWayForPayForm = useCallback((payload: PaymentPayload) => {
    const form = document.createElement("form");
    form.method = "POST";
    form.action = payload.paymentUrl;
    form.acceptCharset = "utf-8";
    form.style.display = "none";

    const addField = (name: string, value: string) => {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = name;
      input.value = value;
      form.appendChild(input);
    };

    addField("merchantAccount", payload.merchantAccount);
    addField("merchantDomainName", payload.merchantDomainName);
    addField("orderReference", payload.orderReference);
    addField("orderDate", String(payload.orderDate));
    addField("amount", String(payload.amount));
    addField("currency", payload.currency);
    addField("merchantSignature", payload.merchantSignature);
    addField("merchantAuthType", payload.merchantAuthType);
    addField(
      "merchantTransactionSecureType",
      payload.merchantTransactionSecureType,
    );
    addField("orderTimeout", String(payload.orderTimeout));
    addField("language", payload.language);
    addField("returnUrl", payload.returnUrl);
    addField("serviceUrl", payload.serviceUrl);

    payload.productName.forEach((name) => addField("productName[]", name));
    payload.productPrice.forEach((value) =>
      addField("productPrice[]", String(value)),
    );
    payload.productCount.forEach((value) =>
      addField("productCount[]", String(value)),
    );

    document.body.appendChild(form);
    form.submit();
  }, []);

  const handlePay = useCallback(async () => {
    if (!tour) return;
    setHasStarted(true);
    try {
      const payment = await createPayment(tourId, groupType);
      submitWayForPayForm(payment);
    } catch {
      setHasStarted(false);
    }
  }, [tour, tourId, groupType, createPayment, submitWayForPayForm]);

  useEffect(() => {
    if (!orderRef) return;
    let isActive = true;
    setHasStarted(true);
    setIsVerifying(true);

    const runVerification = async () => {
      for (let attempt = 0; attempt < 15; attempt += 1) {
        const status = await checkPaymentStatus(orderRef, tourId, groupType);
        if (!isActive) return;
        if (status === "success") {
          setIsVerifying(false);
          return;
        }
        if (status === "failed") {
          setIsVerifying(false);
          router.replace(`/pay/${tourId}?type=${groupType}`);
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
      if (isActive) {
        setIsVerifying(false);
        resetPayment();
        setHasStarted(false);
        router.replace(`/pay/${tourId}?type=${groupType}`);
      }
    };

    void runVerification();

    return () => {
      isActive = false;
    };
  }, [
    orderRef,
    tourId,
    groupType,
    checkPaymentStatus,
    resetPayment,
    router,
  ]);

  useEffect(() => {
    if (paymentStatus === "success" && hasStarted) {
      toast.success(paymentSuccessTitle, {
        description: paymentSuccessDescription,
      });
      const timer = setTimeout(() => {
        resetPayment();
        if (groupType === "group") {
          router.push(`/room/create/${tourId}`);
        } else {
          router.push(`/room/solo/${tourId}/live`);
        }
      }, 1800);
      return () => clearTimeout(timer);
    }
  }, [
    paymentStatus,
    hasStarted,
    groupType,
    tourId,
    router,
    resetPayment,
    paymentSuccessTitle,
    paymentSuccessDescription,
  ]);

  const handleRetry = () => {
    resetPayment();
    setHasStarted(false);
  };

  if (!tour) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">{dict.payment.notFound}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen px-5 page-enter">
      <div className="flex items-center gap-3 pt-4 pb-6">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center active-scale"
          aria-label={dict.common.back}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold text-foreground">
          {dict.payment.checkout}
        </h1>
      </div>

      <div className="bg-card rounded-2xl border border-border p-5 mb-5 shadow-sm">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">
          {dict.payment.orderSummary}
        </h2>
        <div className="flex items-start gap-4">
          <img
            src={tour.coverImage}
            alt={localizedTitle}
            className="w-16 h-16 rounded-xl object-cover shrink-0"
          />
          <div className="flex-1 min-w-0">
            <p className="font-bold text-foreground leading-tight text-balance">
              {localizedTitle}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {cityLabel} &middot; {tour.durationMin} {dict.common.min}
            </p>
            <div className="mt-2">
              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-coral/10 text-coral text-xs font-semibold">
                {groupType === "group"
                  ? dict.payment.groupLabel.replace(
                      "{count}",
                      String(tour.maxParticipants),
                    )
                  : dict.payment.soloLabel}
              </span>
            </div>
          </div>
        </div>
        <div className="border-t border-border mt-4 pt-4 flex items-center justify-between">
          <span className="text-muted-foreground text-sm">
            {dict.payment.total}
          </span>
          <span className="text-2xl font-bold text-foreground">₴{price}</span>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border p-4 mb-8">
        <p className="text-xs text-muted-foreground text-center">
          {dict.payment.securePayment}
        </p>
      </div>
      {paymentStatus === "success" && hasStarted ? (
        <div className="flex flex-col items-center gap-3 py-8">
          <CheckCircle
            className="w-16 h-16 text-emerald-500"
            strokeWidth={1.5}
          />
          <p className="text-lg font-bold text-foreground">
            {dict.payment.successTitle}
          </p>
          <p className="text-sm text-muted-foreground text-center">
            {dict.payment.successSubtitle}
          </p>
        </div>
      ) : paymentStatus === "failed" && hasStarted ? (
        <div className="flex flex-col items-center gap-4 py-8">
          <XCircle className="w-16 h-16 text-coral" strokeWidth={1.5} />
          <p className="text-lg font-bold text-foreground">
            {dict.payment.failedTitle}
          </p>
          <p className="text-sm text-muted-foreground text-center">
            {dict.payment.failedSubtitle}
          </p>
          <button
            onClick={handleRetry}
            className="px-8 py-3 bg-coral text-white rounded-2xl font-bold active-scale"
          >
            {dict.payment.tryAgain}
          </button>
        </div>
      ) : (
        <button
          onClick={handlePay}
          disabled={paymentStatus === "processing" || isVerifying}
          className="w-full bg-coral text-white rounded-2xl py-4 font-bold text-lg active-scale shadow-lg disabled:opacity-70 flex items-center justify-center gap-2"
        >
          {paymentStatus === "processing" || isVerifying ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              {dict.payment.processing}
            </>
          ) : (
            dict.payment.pay.replace("{price}", String(price))
          )}
        </button>
      )}
    </div>
  );
}
