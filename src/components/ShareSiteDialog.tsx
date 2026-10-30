"use client";

import { useEffect, useRef, useState } from "react";
import QrCode from "@/components/QrCode";
import type { InstallState } from "@/components/useInstallPrompt";
import { manualInstallSteps } from "@/lib/installApp";

/** A "share the club site" dialog: QR code, link to copy or share, and how to put the app on a phone. */
export default function ShareSiteDialog({
  open,
  onClose,
  install,
}: {
  open: boolean;
  onClose: () => void;
  install: InstallState;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState("");
  const [canShare, setCanShare] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setUrl(`${window.location.origin}/`);
      setMessage("");
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setMessage("Link copied. Paste it into a text or message.");
    } catch {
      const input = inputRef.current;
      if (input) {
        input.focus();
        input.select();
        setMessage(document.execCommand?.("copy") ? "Link copied." : "Press and hold the link to copy it.");
      }
    }
  }

  async function shareLink() {
    try {
      await navigator.share({
        title: "Louisville Landsharks",
        text: "Join the Louisville Landsharks club site and connect your Strava.",
        url,
      });
    } catch (err) {
      if ((err as DOMException)?.name !== "AbortError")
        setMessage("Couldn't open the share sheet. Copy the link instead.");
    }
  }

  async function installNow() {
    const outcome = await install.promptInstall();
    if (outcome === "accepted") setMessage("Installing. Look for the Landshark icon on your home screen.");
    else if (outcome === "unavailable") setMessage("Your browser can't install it in one tap. Use the steps below.");
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
      aria-labelledby="share-site-title"
      className="m-auto max-h-[92vh] w-[calc(100%-2rem)] max-w-sm overflow-y-auto rounded-xl p-0 backdrop:bg-black/50"
    >
      <div className="p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 id="share-site-title" className="text-lg font-semibold">
            Share the club site
          </h2>
          <button type="button" onClick={onClose} className="min-h-11 px-2 text-sm text-gray-500">
            Close
          </button>
        </div>

        {url && (
          <div className="mb-3 flex flex-col items-center rounded-lg border bg-white p-3">
            <QrCode text={url} size={224} label="QR code that opens the Landshark club site" />
            <p className="mt-2 text-center text-sm text-gray-600">Point a phone camera at this to open the site.</p>
          </div>
        )}

        <label htmlFor="share-site-url" className="mb-1 block text-sm font-medium">
          Link
        </label>
        <input
          id="share-site-url"
          ref={inputRef}
          readOnly
          value={url}
          onFocus={(e) => e.currentTarget.select()}
          className="mb-3 w-full rounded-lg border p-3 text-sm"
        />

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={copyLink}
            className={`min-h-11 rounded-full border border-orange-600 bg-orange-600 px-4 py-2 text-sm font-medium text-white ${
              canShare ? "" : "col-span-2"
            }`}
          >
            Copy link
          </button>
          {canShare && (
            <button
              type="button"
              onClick={shareLink}
              className="min-h-11 rounded-full border border-orange-600 px-4 py-2 text-sm font-medium text-orange-700"
            >
              Share...
            </button>
          )}
        </div>

        <p aria-live="polite" className="mt-2 min-h-5 text-sm text-gray-600">
          {message}
        </p>

        <div className="mt-2 border-t pt-3">
          <h3 className="mb-1 text-base font-semibold">Get the app</h3>
          {install.installed ? (
            <p className="text-sm text-gray-600">You&apos;re already using the app on this device.</p>
          ) : (
            <>
              {install.canPrompt && (
                <button
                  type="button"
                  onClick={installNow}
                  className="mb-3 min-h-11 w-full rounded-full border border-orange-600 px-4 py-2 text-sm font-medium text-orange-700"
                >
                  Install app on this device
                </button>
              )}
              <p className="mb-1 text-sm text-gray-600">
                {install.canPrompt ? "Or add it yourself:" : "To add it to a home screen:"}
              </p>
              <ol className="list-decimal space-y-1 pl-5 text-sm text-gray-700">
                {manualInstallSteps(install.platform).map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
              <p className="mt-2 text-xs text-gray-500">
                A website can&apos;t install itself without a tap, so everyone adds it once from their own phone.
              </p>
            </>
          )}
        </div>
      </div>
    </dialog>
  );
}
