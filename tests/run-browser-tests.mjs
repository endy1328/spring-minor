import path from "node:path";
import { chromium } from "playwright";

const root = "/home/u24/projects/spring_miner";
const indexUrl = `file://${path.join(root, "index.html")}`;
const reportPath = path.join(root, "tmp-e2e-report.json");

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  acceptDownloads: true
});
const page = await context.newPage();

const results = [];

try {
  await run("샘플 분석부터 스냅샷 비교까지 동작한다", async () => {
    await page.goto(indexUrl);
    await expectVisible("h1");
    await page.getByRole("button", { name: "샘플 채우기" }).click();
    await expectText("#resultGrid", "MemberService");

    await page.getByRole("searchbox").fill("member");
    await expectText("#resultGrid", "MemberService");

    await page.getByRole("button", { name: "클래스명" }).click();
    await page.locator(".chip", { hasText: "MemberService" }).click();
    await expectText("#detailTitle", "MemberService");
    await expectText("#detailBody", "manual-input.txt");

    await page.getByRole("button", { name: "현재 결과 저장" }).click();
    await page.locator("#snapshotList").getByText("분석 결과").waitFor();

    await page.getByRole("button", { name: "초기화" }).click();
    await page.getByRole("button", { name: "샘플 채우기" }).click();
    await page.locator("#snapshotList").getByRole("button", { name: "현재와 비교" }).first().click();
    await expectText("#compareBody", "차이가 없습니다");
  });

  await run("로컬 스캔 JSON 업로드가 동작한다", async () => {
    await page.goto(indexUrl);
    await page.locator("#reportInput").setInputFiles(reportPath);
    await page.getByRole("button", { name: "분석 실행" }).click();
    await expectText("#fileList", "sample-service.java");
    await expectText("#resultGrid", "OrderService");
    await expectText("#resultGrid", "TB_ORDER");
  });

  await run("CSV 다운로드가 동작한다", async () => {
    await page.goto(indexUrl);
    await page.getByRole("button", { name: "샘플 채우기" }).click();
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "CSV 다운로드" }).click();
    const download = await downloadPromise;
    const suggested = download.suggestedFilename();
    if (!suggested.endsWith(".csv")) {
      throw new Error(`Unexpected filename: ${suggested}`);
    }
  });
} finally {
  await browser.close();
}

const failed = results.filter((result) => result.status === "FAIL");

for (const result of results) {
  process.stdout.write(`[${result.status}] ${result.name}${result.error ? `: ${result.error}` : ""}\n`);
}

if (failed.length) {
  process.exit(1);
}

async function run(name, fn) {
  try {
    await fn();
    results.push({ name, status: "PASS" });
  } catch (error) {
    results.push({ name, status: "FAIL", error: error.message });
  }
}

async function expectVisible(selector) {
  await page.locator(selector).waitFor({ state: "visible" });
}

async function expectText(selector, text) {
  await page.locator(selector).getByText(text).waitFor({ state: "visible" });
}
