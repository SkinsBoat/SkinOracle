export interface FriendlyError {
  title: string;
  detail?: string;
  actionLabel?: string;
  actionRoute?: string;
}

export function getFriendlyError(error: any): FriendlyError {
  const message = error?.message || error?.response?.data?.message || String(error);
  const status = error?.response?.status;

  if (status === 401 || status === 403) {
    return {
      title: "API Key Rejected",
      detail: message,
      actionLabel: "Check API Key in Settings",
      actionRoute: "/settings?tab=api-keys",
    };
  }

  if (status === 429) {
    return {
      title: "Rate Limit Reached — Cooling Down",
      detail: "Too many requests. Please wait before trying again.",
      actionLabel: "Retry",
    };
  }

  if (message?.toLowerCase().includes("timeout") || message?.toLowerCase().includes("timed out")) {
    return {
      title: "Connection Timed Out",
      detail: "The request took too long to complete.",
      actionLabel: "Retry",
    };
  }

  if (message?.toLowerCase().includes("network") || message?.toLowerCase().includes("fetch")) {
    return {
      title: "Network Connection Issue",
      detail: "Check your internet connection.",
      actionLabel: "Retry",
    };
  }

  if (message?.toLowerCase().includes("cache") && message?.toLowerCase().includes("empty")) {
    return {
      title: "Price Cache Empty",
      detail: "Complete Step 1 to load market data first.",
      actionLabel: "Go to Step 1",
    };
  }

  return {
    title: "Request Failed",
    detail: message,
    actionLabel: "Retry",
  };
}
