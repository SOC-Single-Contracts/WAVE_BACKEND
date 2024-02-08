const puppeteer = require("puppeteer");

async function getSolTrx(token) {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: "/usr/bin/chromium-browser",
    args: [
      "--disable-gpu",
      "--disable-setuid-sandbox",
      "--no-sandbox",
      "--no-zygote",
    ],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 0, height: 0 });
  await page.goto(`https://solscan.io/tx/${token}`);
  await page.waitForNetworkIdle();
  await page.waitForSelector(".dark-mode-box > div > div > .tx-account");
  // For Overview
  const data = await page.evaluate(() => {
    const elArray = Array(
      ...document.querySelectorAll(
        ".ant-tabs-tabpane > section > div > .ant-row"
      )
    );
    let overview = {};
    elArray.forEach((el) => {
      let key = el.children[0].innerText;
      let value = el.children[1].innerText;
      console.log(key);
      if (!key.includes("Main Actions")) {
        overview[key] = value;
      }
    });
    return overview;
  });
  data.transaction_info = await page.evaluate(() => {
    let fromAddress = document.querySelectorAll(
      ".dark-mode-box > div > div > .tx-account"
    )[0].firstChild.firstChild.children[0].href;
    let toAddress = document.querySelectorAll(
      ".dark-mode-box > div > div > .tx-account"
    )[1].firstChild.firstChild.children[0].href;
    let address = document.querySelector(".dark-mode-box > div > div").lastChild
      .firstChild.firstChild.href;
    let symbol = document
      .querySelector(".dark-mode-box > div > div")
      .lastChild.textContent.slice(0, 3);
    let amount = document.querySelector(
      ".dark-mode-box > div > div > strong"
    ).textContent;
    return { fromAddress, toAddress, symbol, address, amount };
  });
  await browser.close();
  return data;
}

module.exports = { getSolTrx };