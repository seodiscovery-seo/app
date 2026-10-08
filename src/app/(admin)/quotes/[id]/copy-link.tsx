"use client";

import { useState } from "react";

export function CopyLink({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="btn-secondary w-full"
      onClick={() => {
        void navigator.clipboard?.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }}
      title={link}
    >
      {copied ? "Link copied" : "Copy client link (for WhatsApp)"}
    </button>
  );
}
