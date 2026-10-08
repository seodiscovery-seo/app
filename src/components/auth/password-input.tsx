"use client";

import { useState } from "react";

/** Password field with Show/Hide and a simple strength hint. */
export function PasswordInput({ id, name, label, autoComplete, error, showStrength }: {
  id: string;
  name: string;
  label: string;
  autoComplete: string;
  error?: string;
  showStrength?: boolean;
}) {
  const [show, setShow] = useState(false);
  const [value, setValue] = useState("");
  const score = [value.length >= 8, /[a-zA-Z]/.test(value) && /\d/.test(value), value.length >= 12, /[^a-zA-Z0-9]/.test(value)].filter(Boolean).length;
  const words = ["Too short", "Weak", "Okay", "Good", "Strong"];
  const colors = ["bg-danger", "bg-danger", "bg-signal", "bg-emerald-500", "bg-emerald-600"];

  return (
    <div>
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="label">{label}</label>
        <button type="button" onClick={() => setShow((v) => !v)} className="mb-1.5 text-xs font-semibold text-brand hover:underline">{show ? "Hide" : "Show"}</button>
      </div>
      <input
        id={id}
        name={name}
        type={show ? "text" : "password"}
        autoComplete={autoComplete}
        required
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="input"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : showStrength ? `${id}-strength` : undefined}
      />
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-xs font-medium text-danger">{error}</p>
      ) : (
        showStrength &&
        value && (
          <div id={`${id}-strength`} className="mt-2 flex items-center gap-2">
            <div className="flex flex-1 gap-1" aria-hidden="true">
              {[0, 1, 2, 3].map((i) => <span key={i} className={`h-1 flex-1 rounded-full ${i < score ? colors[score] : "bg-line"}`} />)}
            </div>
            <span className="text-xs font-medium text-muted">{words[score]}</span>
          </div>
        )
      )}
    </div>
  );
}
