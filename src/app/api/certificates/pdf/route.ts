import { NextRequest, NextResponse } from "next/server";
import { parseCertificateData } from "@/lib/certificate-schema";

export const runtime = "nodejs";
export const maxDuration = 30;
export const dynamic = "force-dynamic";

function encodePayload(data: unknown): string {
  return Buffer.from(JSON.stringify(data), "utf8").toString("base64url");
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { data: rawData, certificateNo } = (body ?? {}) as {
    data?: unknown;
    certificateNo?: string;
  };
  const data = parseCertificateData(rawData);
  const printUrl = new URL("/certificates/print", req.nextUrl.origin);
  printUrl.searchParams.set("data", encodePayload(data));

  const isVercel = !!process.env.VERCEL;

  let browser;
  try {
    if (isVercel) {
      const chromium = (await import("@sparticuz/chromium")).default;
      const { chromium: playwrightChromium } = await import("playwright-core");
      browser = await playwrightChromium.launch({
        args: chromium.args,
        executablePath: await chromium.executablePath(),
        headless: true,
      });
    } else {
      // Local/dev: expects `npx playwright install chromium` to have been run.
      const { chromium: playwrightChromium } = await import("playwright-core");
      browser = await playwrightChromium.launch({ headless: true });
    }

    const page = await browser.newPage();
    await page.goto(printUrl.toString(), { waitUntil: "networkidle" });
    await page.emulateMedia({ media: "print" });
    await page.evaluate(() => document.fonts.ready);
    const pdf = await page.pdf({
      format: "A4",
      landscape: true,
      printBackground: true,
      margin: { top: "0mm", bottom: "0mm", left: "0mm", right: "0mm" },
    });
    await browser.close();

    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${(certificateNo || "certificate").replace(/[^a-zA-Z0-9._-]/g, "_")}.pdf"`,
      },
    });
  } catch (err) {
    if (browser) await browser.close().catch(() => {});
    console.error("PDF generation failed", err);
    return NextResponse.json(
      { error: "PDF generation failed" },
      { status: 500 }
    );
  }
}
