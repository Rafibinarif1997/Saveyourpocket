(function () {
  const CONFIG = window.LAST404_CONFIG || {};

  const TL404 =
    CONFIG.TL404_TOKEN ||
    "0x316eC28D4e69Adf4697F0cA7DE45c164C295eC9d";

  const MINIMUM = 200000n;

  const PUBLIC_RPC =
    "https://rpc.mainnet.chain.robinhood.com";

  const walletEl =
    document.getElementById("claimWallet");

  const balanceEl =
    document.getElementById("claimBalance");

  const eligibilityEl =
    document.getElementById("claimEligibility");

  const button =
    document.getElementById("claimButton");

  const success =
    document.getElementById("claimSuccess");

  const successText =
    document.getElementById("claimSuccessText");

  const error =
    document.getElementById("claimError");

  const STORAGE_KEY = "last404_wallet";

  const valid = (address) =>
    /^0x[a-fA-F0-9]{40}$/.test(address || "");

  const checksum = (address) =>
    address.slice(0, 8) + "…" + address.slice(-6);


  // -----------------------------
  // GET CONNECTED WALLET
  // -----------------------------

  function getWallet() {
    const params =
      new URLSearchParams(location.search);

    const fromUrl =
      params.get("wallet");

    if (valid(fromUrl)) {
      localStorage.setItem(
        STORAGE_KEY,
        fromUrl
      );

      return fromUrl;
    }

    const saved =
      localStorage.getItem(STORAGE_KEY);

    return valid(saved)
      ? saved
      : null;
  }


  // -----------------------------
  // STATUS
  // -----------------------------

  function setStatus(
    text,
    eligible = false
  ) {
    if (!eligibilityEl) return;

    eligibilityEl.textContent = text;

    eligibilityEl.classList.toggle(
      "eligible",
      eligible
    );
  }


  function showError(message) {
    if (!error) return;

    error.hidden = false;
    error.textContent = message;
  }


  // -----------------------------
  // RPC
  // -----------------------------

  async function rpc(method, params) {
    const controller =
      new AbortController();

    const timer =
      setTimeout(
        () => controller.abort(),
        10000
      );

    try {
      const response =
        await fetch(
          PUBLIC_RPC,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body: JSON.stringify({
              jsonrpc: "2.0",
              id: Date.now(),
              method,
              params
            }),

            signal: controller.signal
          }
        );

      if (!response.ok) {
        throw new Error(
          "RPC HTTP " +
          response.status
        );
      }

      const data =
        await response.json();

      if (data.error) {
        throw new Error(
          data.error.message ||
          "RPC error"
        );
      }

      return data.result;

    } finally {
      clearTimeout(timer);
    }
  }


  // -----------------------------
  // ERC20 BALANCE CALL
  // -----------------------------

  function balanceCall(wallet) {
    return (
      "0x70a08231" +
      wallet
        .slice(2)
        .toLowerCase()
        .padStart(64, "0")
    );
  }


  // -----------------------------
  // FORMAT BALANCE
  // -----------------------------

  function formatUnitsLocal(
    value,
    decimals
  ) {
    const divisor =
      10n ** BigInt(decimals);

    const whole =
      value / divisor;

    const fraction =
      value % divisor;

    if (fraction === 0n) {
      return whole.toString() +
        " TL404";
    }

    const fractionText =
      fraction
        .toString()
        .padStart(
          decimals,
          "0"
        )
        .replace(/0+$/, "");

    return (
      whole.toString() +
      "." +
      fractionText +
      " TL404"
    );
  }


  // -----------------------------
  // CHECK ELIGIBILITY
  // -----------------------------

  async function check() {

    if (!button) return;

    button.disabled = true;
    button.textContent =
      "RECOVER NFT";

    if (error) {
      error.hidden = true;
    }

    const wallet =
      getWallet();

    if (!wallet) {

      if (walletEl) {
        walletEl.textContent =
          "NOT CONNECTED";
      }

      if (balanceEl) {
        balanceEl.textContent =
          "—";
      }

      setStatus(
        "CONNECT WALLET FIRST"
      );

      return;
    }


    if (walletEl) {
      walletEl.textContent =
        checksum(wallet);
    }

    setStatus(
      "CHECKING…"
    );


    try {

      // Check Robinhood Chain
      const chain =
        await rpc(
          "eth_chainId",
          []
        );

      if (
        Number(BigInt(chain)) !== 4663
      ) {
        throw new Error(
          "Robinhood Chain Mainnet RPC unavailable."
        );
      }


      // TL404 decimals
      const decimalsHex =
        await rpc(
          "eth_call",
          [
            {
              to: TL404,
              data: "0x313ce567"
            },
            "latest"
          ]
        );


      const decimals =
        Number(
          BigInt(decimalsHex)
        );


      // TL404 balance
      const raw =
        await rpc(
          "eth_call",
          [
            {
              to: TL404,
              data:
                balanceCall(wallet)
            },
            "latest"
          ]
        );


      const balance =
        BigInt(raw);


      const divisor =
        10n ** BigInt(decimals);

      const required =
        MINIMUM * divisor;


      if (balanceEl) {
        balanceEl.textContent =
          formatUnitsLocal(
            balance,
            decimals
          );
      }


      if (balance >= required) {

        setStatus(
          "READY TO RECOVER",
          true
        );

        button.disabled =
          false;

      } else {

        setStatus(
          "NOT ELIGIBLE"
        );

        button.disabled =
          true;
      }


    } catch (err) {

      console.error(
        "TL404 balance check error:",
        err
      );

      if (balanceEl) {
        balanceEl.textContent =
          "—";
      }

      setStatus(
        "CHECK FAILED"
      );

      showError(
        "Could not check TL404. Please refresh and try again."
      );
    }
  }


  // ==================================================
  // RECOVER NFT
  // ==================================================

  if (button) {

    button.addEventListener(
      "click",
      async function () {

        const wallet =
          getWallet();

        if (!wallet) {

          showError(
            "Connect your wallet first."
          );

          return;
        }


        button.disabled =
          true;

        button.textContent =
          "RECOVERING…";

        if (error) {
          error.hidden = true;
        }


        try {

          const base =
            (
              CONFIG.SUPABASE_URL ||
              ""
            ).replace(
              /\/+$/,
              ""
            );


          if (!base) {
            throw new Error(
              "Claim service is not configured."
            );
          }


          const endpoint =
            base +
            "/functions/v1/hyper-task";


          /*
           * Direct Edge Function request.
           *
           * The function has JWT verification
           * disabled, so we don't send a
           * Bearer token here.
           */


          const response =
            await fetch(
              endpoint,
              {
                method: "POST",

                mode: "cors",

                credentials: "omit",

                cache: "no-store",

                headers: {
                  "Content-Type":
                    "application/json",

                  "Accept":
                    "application/json"
                },

                body:
                  JSON.stringify({
                    wallet: wallet
                  })
              }
            );


          const responseText =
            await response.text();


          let data = {};

          try {
            data =
              responseText
                ? JSON.parse(
                    responseText
                  )
                : {};
          } catch (_) {
            data = {};
          }


          if (!response.ok) {

            throw new Error(
              data.error ||
              data.message ||
              (
                "Claim service returned HTTP " +
                response.status
              )
            );
          }


          if (!data.success) {

            throw new Error(
              data.error ||
              data.message ||
              "Claim was not completed."
            );
          }


          // -----------------------------
          // SUCCESS
          // -----------------------------

          if (success) {
            success.hidden = false;
          }


          if (successText) {

            successText.textContent =
              "NFT #" +
              String(
                data.tokenId
              ).padStart(
                3,
                "0"
              ) +
              " has been transferred to your wallet. Transaction: " +
              data.txHash;
          }


          button.textContent =
            "RECOVERED";
          window.dispatchEvent(
  new CustomEvent(
    "last404:nftRecovered"
  )
);


        } catch (err) {

          console.error(
            "NFT claim error:",
            err
          );


          showError(
            err &&
            err.message
              ? err.message
              : "Claim service is unavailable. Please try again."
          );


          button.disabled =
            false;

          button.textContent =
            "RECOVER NFT";
        }
      }
    );
  }


  // -----------------------------
  // WALLET CHANGED
  // -----------------------------

  window.addEventListener(
    "last404:walletChanged",
    function (event) {

      const address =
        event.detail &&
        event.detail.address;


      if (address) {

        localStorage.setItem(
          STORAGE_KEY,
          address
        );

      } else {

        localStorage.removeItem(
          STORAGE_KEY
        );
      }


      check();
    }
  );


  // -----------------------------
  // STORAGE SYNC
  // -----------------------------

  window.addEventListener(
    "storage",
    function (event) {

      if (
        event.key ===
        STORAGE_KEY
      ) {
        check();
      }
    }
  );


  // -----------------------------
  // INITIAL CHECK
  // -----------------------------

  window.addEventListener(
    "load",
    check
  );

  check();

})();

// ==========================================
// NFT RECOVERY COUNTER
// ==========================================

const NFT_CONTRACT =
  "0x17B9371FED1A1865D97A288d10638c23012de78f";

const TEAM_WALLET =
  "0x83243577d3149c34838e0adD665488525C736448";

const TOTAL_SUPPLY = 404;

const TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

let counterBox = null;
let counterValue = null;
let counterRemaining = null;


// ------------------------------------------
// CREATE COUNTER UI
// ------------------------------------------

function createRecoveryCounter() {

  if (counterBox) return;

  counterBox =
    document.createElement("div");

  counterBox.id =
    "last404RecoveryCounter";

  counterBox.innerHTML = `
    <div class="l404-counter-title">
      NFT RECOVERY
    </div>

    <div class="l404-counter-main">
      <span id="l404Recovered">—</span>
      <span class="l404-counter-total">/ 404</span>
    </div>

    <div class="l404-counter-remaining">
      <span id="l404Remaining">—</span>
      REMAINING
    </div>
  `;


  counterBox.style.cssText = `
    margin:20px 0;
    padding:18px;
    border:1px solid rgba(212,175,55,.45);
    background:rgba(10,10,10,.82);
    text-align:center;
    box-sizing:border-box;
  `;


  const title =
    counterBox.querySelector(
      ".l404-counter-title"
    );

  title.style.cssText = `
    font-size:11px;
    letter-spacing:3px;
    opacity:.65;
    margin-bottom:8px;
  `;


  const main =
    counterBox.querySelector(
      ".l404-counter-main"
    );

  main.style.cssText = `
    font-size:30px;
    font-weight:800;
    letter-spacing:2px;
  `;


  const total =
    counterBox.querySelector(
      ".l404-counter-total"
    );

  total.style.cssText = `
    opacity:.45;
    font-size:16px;
  `;


  const remaining =
    counterBox.querySelector(
      ".l404-counter-remaining"
    );

  remaining.style.cssText = `
    margin-top:8px;
    font-size:11px;
    letter-spacing:2px;
    opacity:.65;
  `;


  counterValue =
    counterBox.querySelector(
      "#l404Recovered"
    );

  counterRemaining =
    counterBox.querySelector(
      "#l404Remaining"
    );


  /*
   * Put counter immediately before
   * the Recover button.
   */

  if (button && button.parentNode) {

    button.parentNode.insertBefore(
      counterBox,
      button
    );

  } else {

    document.body.appendChild(
      counterBox
    );
  }
}


// ------------------------------------------
// ERC721 balanceOf
// ------------------------------------------

function nftBalanceCall(wallet) {

  return (
    "0x70a08231" +
    wallet
      .slice(2)
      .toLowerCase()
      .padStart(64, "0")
  );
}


// ------------------------------------------
// UPDATE COUNTER
// ------------------------------------------

async function updateRecoveryCounter() {

  try {

    createRecoveryCounter();


    const raw =
      await rpc(
        "eth_call",
        [
          {
            to: NFT_CONTRACT,
            data:
              nftBalanceCall(
                TEAM_WALLET
              )
          },
          "latest"
        ]
      );


    const teamBalance =
      Number(
        BigInt(raw)
      );


    let recovered =
      TOTAL_SUPPLY -
      teamBalance;


    if (recovered < 0)
      recovered = 0;

    if (recovered > TOTAL_SUPPLY)
      recovered = TOTAL_SUPPLY;


    const remaining =
      TOTAL_SUPPLY -
      recovered;


    counterValue.textContent =
      recovered;

    counterRemaining.textContent =
      remaining;


    // --------------------------------
    // SOLD OUT
    // --------------------------------

    if (
      recovered >= TOTAL_SUPPLY
    ) {

      counterValue.textContent =
        "404";

      counterRemaining.textContent =
        "0";

      const title =
        counterBox.querySelector(
          ".l404-counter-title"
        );

      title.textContent =
        "SOLD OUT";

      title.style.opacity =
        "1";


      if (button) {

        button.disabled =
          true;

        button.textContent =
          "SOLD OUT";

        button.style.opacity =
          "0.55";

        button.style.cursor =
          "not-allowed";
      }

    } else {

      const title =
        counterBox.querySelector(
          ".l404-counter-title"
        );

      title.textContent =
        "NFT RECOVERY";


      if (
        button &&
        button.textContent ===
          "SOLD OUT"
      ) {

        button.textContent =
          "RECOVER NFT";

        button.style.opacity =
          "1";

        button.style.cursor =
          "";
      }
    }


  } catch (err) {

    console.error(
      "Recovery counter error:",
      err
    );

    createRecoveryCounter();

    counterValue.textContent =
      "—";

    counterRemaining.textContent =
      "—";
  }
}


// ------------------------------------------
// INITIALIZE COUNTER
// ------------------------------------------

window.addEventListener(
  "load",
  function () {

    updateRecoveryCounter();

  }
);


// ------------------------------------------
// REFRESH AFTER SUCCESSFUL CLAIM
// ------------------------------------------

window.addEventListener(
  "last404:nftRecovered",
  function () {

    setTimeout(
      updateRecoveryCounter,
      1500
    );

  }
);
