"use client";

import { useEffect, useRef, useState } from "react";

/**
 * "Share top 5" button for the dashboard leaderboard. Opens a preview of the shareable card with the
 * Facebook caption. Facebook can't be pre-filled from a website, so members save (or share) the image,
 * copy the caption and paste both into a new post.
 */
export default function ShareTop5({
  imageUrl,
  caption,
  filename,
  title,
}: {
  imageUrl: string;
  caption: string;
  filename: string;
  title: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const [open, setOpen] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const [image, setImage] = useState<{ blob: Blob; url: string } | null>(null);
  const [imageError, setImageError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  // Load the card when the dialog opens. Fetching it ourselves (instead of an <img src>) lets us show why it
  // failed, and reuse the same file for Save and Share without drawing it twice.
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    let objectUrl = "";
    setImage(null);
    setImageError("");
    (async () => {
      try {
        const res = await fetch(imageUrl, { signal: controller.signal });
        if (!res.ok) {
          let detail = "";
          try {
            const body = (await res.json()) as { error?: string; detail?: string };
            detail = [body.error, body.detail].filter(Boolean).join(": ");
          } catch {
            // not JSON; keep the status only
          }
          setImageError(`Couldn't make the image (error ${res.status}${detail ? `, ${detail}` : ""}).`);
          return;
        }
        const blob = await res.blob();
        objectUrl = URL.createObjectURL(blob);
        setImage({ blob, url: objectUrl });
      } catch (err) {
        if ((err as DOMException)?.name === "AbortError") return;
        setImageError("Couldn't make the image (the connection failed). Check your signal and try again.");
      }
    })();
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [open, imageUrl, attempt]);

  function openDialog() {
    setMessage("");
    setOpen(true);
    dialogRef.current?.showModal();
  }

  function closeDialog() {
    dialogRef.current?.close();
  }

  async function copyCaption() {
    try {
      await navigator.clipboard.writeText(caption);
      setMessage("Caption copied. Paste it into your Facebook post.");
    } catch {
      // Older browsers and some in-app browsers block the clipboard API: fall back to selecting the text.
      const box = textRef.current;
      if (box) {
        box.focus();
        box.select();
        const ok = document.execCommand?.("copy");
        setMessage(ok ? "Caption copied. Paste it into your Facebook post." : "Press and hold the text to copy it.");
      }
    }
  }

  async function shareImage() {
    if (!image) {
      setMessage("The image isn't ready yet.");
      return;
    }
    try {
      const file = new File([image.blob], filename, { type: "image/png" });
      if (!navigator.canShare?.({ files: [file] })) {
        setMessage("Sharing the image isn't supported here. Use Save image, then add it to your post.");
        return;
      }
      await navigator.share({ files: [file], text: caption });
    } catch (err) {
      if ((err as DOMException)?.name === "AbortError") return;
      setMessage("Couldn't open the share sheet. Use Save image and Copy caption instead.");
    }
  }

  const buttonClass = "min-h-11 rounded-full border px-4 py-2 text-sm font-medium";

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        className="min-h-11 rounded-full border border-orange-600 px-4 py-2 text-sm font-medium text-orange-700 hover:bg-orange-50"
      >
        Share top 5
      </button>
      <dialog
        ref={dialogRef}
        onClose={() => setOpen(false)}
        onClick={(e) => {
          if (e.target === dialogRef.current) closeDialog();
        }}
        className="m-auto max-h-[92vh] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-xl p-0 backdrop:bg-black/50"
      >
        <div className="p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">{title}</h2>
            <button type="button" onClick={closeDialog} className="min-h-11 px-2 text-sm text-gray-500">
              Close
            </button>
          </div>

          {open && (
            <div className="mb-3 overflow-hidden rounded-lg border bg-orange-50">
              {!image && !imageError && <p className="p-6 text-center text-sm text-gray-500">Making your image...</p>}
              {imageError && (
                <div className="p-4 text-center text-sm text-red-700">
                  <p>{imageError}</p>
                  <button
                    type="button"
                    onClick={() => setAttempt((n) => n + 1)}
                    className="mt-2 min-h-11 rounded-full border border-red-300 px-4 py-2 font-medium"
                  >
                    Try again
                  </button>
                </div>
              )}
              {image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={image.url} alt={title} className="block w-full" />
              )}
            </div>
          )}

          <label htmlFor="share-caption" className="mb-1 block text-sm font-medium">
            Caption
          </label>
          <textarea
            id="share-caption"
            ref={textRef}
            readOnly
            value={caption}
            rows={12}
            className="mb-3 w-full rounded-lg border p-3 text-sm"
          />

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={copyCaption}
              className={`${buttonClass} border-orange-600 bg-orange-600 text-white`}
            >
              Copy caption
            </button>
            {image ? (
              <a
                href={image.url}
                download={filename}
                className={`${buttonClass} flex items-center justify-center border-orange-600 text-orange-700`}
              >
                Save image
              </a>
            ) : (
              <span
                aria-disabled="true"
                className={`${buttonClass} flex items-center justify-center border-gray-200 text-gray-300`}
              >
                Save image
              </span>
            )}
            {canShare && (
              <button
                type="button"
                onClick={shareImage}
                disabled={!image}
                className={`${buttonClass} col-span-2 border-gray-300 text-gray-700 disabled:text-gray-300`}
              >
                Share image to an app
              </button>
            )}
          </div>

          <p aria-live="polite" className="mt-3 min-h-5 text-sm text-gray-600">
            {message}
          </p>
          <p className="text-xs text-gray-500">
            Facebook can&apos;t be filled in for you: save the image, copy the caption, then paste both into a new post.
          </p>
        </div>
      </dialog>
    </>
  );
}
