import { NextRequest, NextResponse } from "next/server";
import { parseCertificateData } from "@/lib/certificate-schema";

export const runtime = "nodejs";
export const maxDuration = 30;
export const dynamic = "force-dynamic";

function encodePayload(data: unknown): string {
  return Buffer.from(JSON.stringify(data), "utf8").toString("base64url");
}

async function generatePdfVercel(printUrl: string): Promise<Buffer> {
  const chromium = (await import("@sparticuz/chromium")).default;
  const puppeteer = (await import("puppeteer-core")).default;
  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: true,
  });
  try {
    const page = await browser.newPage();
    await page.goto(printUrl, { waitUntil: "networkidle0" });
    await page.emulateMediaType("print");
    await page.evaluate(() => document.fonts.ready);
    return Buffer.from(
      await page.pdf({
        format: "A4",
        landscape: true,
        printBackground: true,
        margin: { top: "0mm", bottom: "0mm", left: "0mm", right: "0mm" },
      })
    );
  } finally {
    await browser.close();
  }
}

async function generatePdfLocal(printUrl: string): Promise<Buffer> {
  const { chromium: pw } = await import("playwright-core");
  const browser = await pw.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(printUrl, { waitUntil: "networkidle" });
    await page.emulateMedia({ media: "print" });
    await page.evaluate(() => document.fonts.ready);
    return Buffer.from(
      await page.pdf({
        format: "A4",
        landscape: true,
        printBackground: true,
        margin: { top: "0mm", bottom: "0mm", left: "0mm", right: "0mm" },
      })
    );
  } finally {
    await browser.close();
  }
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

  try {
    const pdf = process.env.VERCEL
      ? await generatePdfVercel(printUrl.toString())
      : await generatePdfLocal(printUrl.toString());

    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${(certificateNo || "certificate").replace(/[^a-zA-Z0-9._-]/g, "_")}.pdf"`,
      },
    });
  } catch (err) {
    console.error("PDF generation failed", err);
    return NextResponse.json(
      { error: "PDF generation failed" },
      { status: 500 }
    );
  }
}
