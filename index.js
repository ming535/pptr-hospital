const puppeteer = require("puppeteer");
const cheerio = require("cheerio");
const urlParser = require("url");
const axios = require("axios");

async function main() {
  let browser;
  try {
    if (process.env.NODE_ENV === "production") {
      browser = await puppeteer.launch({
        // headless: false,
        args: [
          // Required for Docker version of Puppeteer
          "--no-sandbox",
          "--disable-setuid-sandbox",
          // This will write shared memory files into /tmp instead of /dev/shm,
          // because Docker’s default for /dev/shm is 64MB
          "--disable-dev-shm-usage",
        ],
      });
    } else {
      browser = await puppeteer.launch({
        headless: false,
      });
    }

    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
    );
    await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 2 });
    await page.goto("https://guahao.shgh.cn/yygh/Home/Reservation");

    const notice = ".layui-layer-ico.layui-layer-close.layui-layer-close1";
    await page.waitForSelector(notice);
    await page.click(notice);

    const aSelector =
      'a img[src="/yygh/Content/themes/base/images/NorthSelect.png"]';
    await page.click(aSelector);

    // 科室
    await page.waitForSelector("#dtDept");

    console.log("dtDept showed");

    const deptSelector = "#dtDept a";
    await page.waitForSelector(deptSelector);
    const links = await page.$$(deptSelector);
    console.log("links: ", links.length);
    for (let element of links) {
      const text = await page.evaluate((el) => el.textContent, element);
      if (text === "眼科") {
        await element.click();
      }
    }

    const pageSelector = 'a[pageIndex="4"]';
    await page.waitForSelector(pageSelector);
    await page.click(pageSelector);

    const doctorSelector = ".ys_list2";
    await page.waitForSelector(doctorSelector);
    const doctors = await page.$$(doctorSelector);
    console.log("doctors: ", doctors.length);
    let results = [];
    for (let element of doctors) {
      const text = await page.evaluate((el) => el.textContent, element);
      if (text.includes("石广森")) {
        const dateElems = await element.$$("dl");
        for (let dateElem of dateElems) {
          const dateText = await page.evaluate(
            (el) => el.textContent.replace(/\n/g, "").replace(/ /g, "").trim(),
            await dateElem.$("dd")
          );

          const info = await page.evaluate(
            (el) => el.textContent.trim(),
            await dateElem.$("dt span")
          );
          results.push({ dateText, info });
        }
      }
    }

    console.log(results);
    for (const r of results) {
      if (r.info === "预约") {
        const discordWebhook =
          "https://discord.com/api/webhooks/1182854053483511860/cVBxBg6l4G1CKpMtx0cvD-_pk0me2yuv4zD4TtMPE-imJ5PyblvoHnhHjbpxxlhtC_RN";

        await fetch(discordWebhook, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            content: `可以预约 ${r.dateText}`,
          }),
        });
      }
    }
    await browser.close();
  } catch (e) {
    console.error(`Failed to scrap: ${e}`);
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (e) {
        console.error(`Failed to close browser: ${e}`);
      }
    }
  }
}

main();
