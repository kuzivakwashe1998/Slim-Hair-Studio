import { chromium } from "playwright";
const OUT = "../presentation/raw";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
const go = async (theme) => {
  await page.addInitScript((t) => localStorage.setItem("slim_theme", t), theme);
  await page.goto("http://localhost:5173/#/book", { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(1200);
};
const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png` });
const shotFull = (n) => page.screenshot({ path: `${OUT}/${n}.png`, fullPage: true });

for (const theme of ["dark", "light"]) {
  await go(theme);
  await shot(`${theme}-01-hero`);
  await shotFull(`${theme}-00-full`);
  // select service
  await page.getByRole("button", { name: /Fade\b.*Classic fade/ }).first().click();
  await page.waitForTimeout(400);
  await page.evaluate(() => window.scrollTo(0, document.querySelector("h2")?.offsetTop - 70 || 400)); await page.waitForTimeout(500);
  await shot(`${theme}-02-services`);
  // date + time
  await page.getByText("Select Date").scrollIntoViewIfNeeded(); await page.evaluate(() => window.scrollBy(0, -80)); await page.waitForTimeout(500);
  await shot(`${theme}-03-date`);
  const slot = page.getByRole("button", { name: theme === "dark" ? /^12:00 PM$/ : /^2:15 PM$/ }); await slot.click(); await page.waitForTimeout(300);
  await page.getByText("Select Time").scrollIntoViewIfNeeded(); await page.evaluate(() => window.scrollBy(0, -80)); await page.waitForTimeout(500);
  await shot(`${theme}-04-time`);
  // details
  await page.getByPlaceholder("Full name").fill("Tinashe M.");
  await page.getByPlaceholder(/WhatsApp number/).fill("+263 77 123 4567");
  await page.evaluate(() => { const h=[...document.querySelectorAll("h2")].find(e=>e.textContent==="Your Details"); window.scrollTo(0, h.getBoundingClientRect().top + window.scrollY - 90); }); await page.waitForTimeout(600);
  await shot(`${theme}-05-details`);
  // payment modal
  await page.getByRole("button", { name: /Confirm Booking/ }).click(); await page.waitForTimeout(700);
  await shot(`${theme}-06-ecocash`);
  // attach proof (tiny generated png) then success
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");
  await page.setInputFiles('input[type=file]', { name: "ecocash.png", mimeType: "image/png", buffer: png });
  await page.waitForTimeout(500);
  await shot(`${theme}-07-proof`);
  await page.getByRole("button", { name: /I've Paid/ }).click(); await page.waitForTimeout(1200);
  await shot(`${theme}-08-success`);
  await page.getByRole("button", { name: "Done" }).click(); await page.waitForTimeout(500);
  // profile tab
  await page.getByRole("button", { name: "Profile" }).click(); await page.waitForTimeout(600);
  await shot(`${theme}-09-bookings`);
  await ctx.clearCookies();
}
await browser.close();
