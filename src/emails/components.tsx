/**
 * Shared building blocks for every email.
 * Rules: tables + inline styles only (React Email handles this), 600px max width,
 * system fonts, 16px body text, 44px tall buttons, real text for every image.
 */
import {
  Body,
  Button as REButton,
  Container,
  Head,
  Heading as REHeading,
  Hr,
  Html,
  Img,
  Link as RELink,
  Preview,
  Section,
  Text as REText,
} from "@react-email/components";
import type { ReactNode } from "react";

export type Brand = {
  name: string;
  logoUrl: string;
  primaryColor: string;
  appUrl: string;
  supportEmail: string;
  address: string;
};

const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
const ink = "#111827";
const muted = "#4b5563";
const faint = "#6b7280";
const line = "#e5e7eb";

export function Layout({ brand, preheader, children, reason }: { brand: Brand; preheader: string; children: ReactNode; reason?: string }) {
  return (
    <Html lang="en">
      <Head>
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
      </Head>
      <Preview>{preheader}</Preview>
      <Body style={{ margin: 0, padding: "24px 0", backgroundColor: "#f3f4f6", fontFamily: font }}>
        <Container style={{ maxWidth: 600, width: "100%", margin: "0 auto" }}>
          <Header brand={brand} />
          <Section
            style={{
              backgroundColor: "#ffffff",
              borderRadius: 12,
              border: `1px solid ${line}`,
              borderTop: `4px solid ${brand.primaryColor}`,
              padding: "36px 40px 32px",
            }}
          >
            {children}
          </Section>
          <Footer brand={brand} reason={reason} />
        </Container>
      </Body>
    </Html>
  );
}

function Header({ brand }: { brand: Brand }) {
  const content = brand.logoUrl ? (
    <Img src={brand.logoUrl} alt={brand.name} height={36} style={{ height: 36, width: "auto", display: "inline-block" }} />
  ) : (
    <REText style={{ margin: 0, fontSize: 20, fontWeight: 700, color: ink, letterSpacing: "-0.01em" }}>{brand.name}</REText>
  );
  return (
    <Section style={{ padding: "8px 40px 20px" }}>
      {brand.appUrl ? (
        <RELink href={brand.appUrl} style={{ textDecoration: "none", color: ink }}>
          {content}
        </RELink>
      ) : (
        content
      )}
    </Section>
  );
}

export function Heading({ children }: { children: ReactNode }) {
  return (
    <REHeading as="h1" style={{ margin: "0 0 16px", fontSize: 24, lineHeight: "32px", fontWeight: 700, color: ink, letterSpacing: "-0.01em" }}>
      {children}
    </REHeading>
  );
}

export function Text({ children, small, muted: isMuted }: { children: ReactNode; small?: boolean; muted?: boolean }) {
  return (
    <REText style={{ margin: "0 0 16px", fontSize: small ? 14 : 16, lineHeight: small ? "22px" : "26px", color: isMuted ? faint : muted }}>
      {children}
    </REText>
  );
}

export function Button({ href, children, brand }: { href: string; children: ReactNode; brand: Brand }) {
  return (
    <Section style={{ margin: "8px 0 24px" }}>
      <REButton
        href={href}
        style={{
          backgroundColor: brand.primaryColor,
          color: "#ffffff",
          fontSize: 16,
          fontWeight: 600,
          lineHeight: "20px",
          padding: "12px 24px",
          borderRadius: 8,
          textDecoration: "none",
          display: "inline-block",
        }}
      >
        {children}
      </REButton>
    </Section>
  );
}

/** "If the button doesn't work" fallback with the full link. */
export function LinkFallback({ href }: { href: string }) {
  return (
    <REText style={{ margin: "0 0 16px", fontSize: 13, lineHeight: "20px", color: faint }}>
      If the button doesn&apos;t work, copy and paste this link into your browser:
      <br />
      <RELink href={href} style={{ color: faint, textDecoration: "underline", wordBreak: "break-all" }}>
        {href}
      </RELink>
    </REText>
  );
}

/** Big, spaced-out one-time code. */
export function Code({ code }: { code: string }) {
  return (
    <Section style={{ margin: "4px 0 24px", backgroundColor: "#f9fafb", border: `1px solid ${line}`, borderRadius: 8, padding: "16px", textAlign: "center" }}>
      <REText style={{ margin: 0, fontSize: 30, lineHeight: "36px", fontWeight: 700, letterSpacing: "0.3em", color: ink, fontFamily: "ui-monospace, Menlo, Consolas, monospace" }}>
        {code}
      </REText>
    </Section>
  );
}

/** Label/value rows: time, device, location… */
export function InfoBox({ rows }: { rows: Array<[string, string | undefined | null]> }) {
  const visible = rows.filter(([, v]) => v);
  if (visible.length === 0) return null;
  return (
    <Section style={{ margin: "4px 0 24px", backgroundColor: "#f9fafb", border: `1px solid ${line}`, borderRadius: 8, padding: "12px 16px" }}>
      <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} style={{ borderCollapse: "collapse" }}>
        <tbody>
          {visible.map(([label, value]) => (
            <tr key={label}>
              <td style={{ padding: "6px 12px 6px 0", fontSize: 14, lineHeight: "20px", color: faint, width: 110, verticalAlign: "top" }}>{label}</td>
              <td style={{ padding: "6px 0", fontSize: 14, lineHeight: "20px", color: ink, fontWeight: 500 }}>{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Section>
  );
}

/** Yellow "wasn't you?" box used by security emails. */
export function SecurityNotice({ children }: { children: ReactNode }) {
  return (
    <Section style={{ margin: "8px 0 8px", backgroundColor: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: "14px 16px" }}>
      <REText style={{ margin: 0, fontSize: 14, lineHeight: "22px", color: "#78350f" }}>{children}</REText>
    </Section>
  );
}

export function Divider() {
  return <Hr style={{ borderColor: line, margin: "24px 0" }} />;
}

function Footer({ brand, reason }: { brand: Brand; reason?: string }) {
  return (
    <Section style={{ padding: "20px 40px 0", textAlign: "center" }}>
      <REText style={{ margin: "0 0 6px", fontSize: 12, lineHeight: "18px", color: faint }}>
        {reason ??
          `This is an automatic message about your ${brand.name} account. You received it because of an action on your account, so you can't unsubscribe from it.`}
      </REText>
      {brand.supportEmail && (
        <REText style={{ margin: "0 0 6px", fontSize: 12, lineHeight: "18px", color: faint }}>
          Questions? Write to{" "}
          <RELink href={`mailto:${brand.supportEmail}`} style={{ color: faint, textDecoration: "underline" }}>
            {brand.supportEmail}
          </RELink>
        </REText>
      )}
      {brand.address && <REText style={{ margin: 0, fontSize: 12, lineHeight: "18px", color: faint }}>{brand.address}</REText>}
    </Section>
  );
}

export const Link = ({ href, children }: { href: string; children: ReactNode }) => (
  <RELink href={href} style={{ color: "#1d4ed8", textDecoration: "underline" }}>
    {children}
  </RELink>
);

/** Body text written by admins: a blank line starts a new paragraph. */
export function Paragraphs({ text }: { text: string }) {
  const parts = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  return (
    <>
      {parts.map((p, i) => (
        <REText key={i} style={{ margin: "0 0 16px", fontSize: 16, lineHeight: "26px", color: muted, whiteSpace: "pre-line" }}>
          {p}
        </REText>
      ))}
    </>
  );
}

export type FileMeta = { filename: string; size: number; type: string };

const fileSize = (n: number) => (n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`);

/** "Attached: quotation.pdf (240 KB)" rows. */
export function AttachmentList({ files }: { files: FileMeta[] }) {
  if (!files.length) return null;
  return (
    <Section style={{ margin: "4px 0 24px", border: `1px solid ${line}`, borderRadius: 8, padding: "6px 16px" }}>
      <REText style={{ margin: "8px 0 4px", fontSize: 12, lineHeight: "18px", fontWeight: 600, color: faint, textTransform: "uppercase", letterSpacing: "0.04em" }}>
        Attached {files.length === 1 ? "file" : `files (${files.length})`}
      </REText>
      <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} style={{ borderCollapse: "collapse" }}>
        <tbody>
          {files.map((f) => (
            <tr key={f.filename}>
              <td style={{ padding: "8px 0", fontSize: 14, lineHeight: "20px", color: ink, fontWeight: 600, borderTop: `1px solid ${line}` }}>
                &#128206; {f.filename}
              </td>
              <td style={{ padding: "8px 0", fontSize: 13, lineHeight: "20px", color: faint, textAlign: "right", whiteSpace: "nowrap", borderTop: `1px solid ${line}` }}>
                {f.type} · {fileSize(f.size)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Section>
  );
}
