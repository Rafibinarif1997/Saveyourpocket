(function () {
  const CONFIG = window.LAST404_CONFIG || {};

  const TL404 =
    CONFIG.TL404_TOKEN ||
    "0x316eC28D4e69Adf4697F0cA7DE45c164C295eC9d";

  const NFT_CONTRACT =
    "0x17B9371FED1A1865D97A288d10638c23012de78f";

  const TEAM_WALLET =
    "0x83243577d3149c34838e0adD665488525C736448";

  const TOTAL_SUPPLY = 404;
  const MINIMUM = 200000n;

  const PUBLIC_RPC =
    "https://rpc.mainnet.chain.robinhood.com";

  const STORAGE_KEY =
    "last404_wallet";

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


  // ==========================================
  // WALLET
  // ==========================================

  function valid(address) {
    return /^0x[a-fA-F0-9]{40}$/.test(
      address || ""
    );
  }


  function shortAddress(address) {
    return (
      address.slice(0, 8) +
      "…" +
      address.slice(-6)
    );
  }


  function getWallet() {

    const params =
      new URLSearchParams(
        location.search
      );

    const urlWallet =
      params.get("wallet");

    if (valid(urlWallet)) {

      localStorage.setItem(
        STORAGE_KEY,
        urlWallet
      );

      return urlWallet;
    }


    const saved =
      localStorage.getItem(
        STORAGE_KEY
      );

    return valid(saved)
      ? saved
      : null;
  }


  // ==========================================
  // STATUS
  // ==========================================

  function setStatus(
    text,
    eligible = false
  ) {

    if (!eligibilityEl) return;

    eligibilityEl.textContent =
      text;

    eligibilityEl.classList.toggle(
      "eligible",
      eligible
    );
  }


  function showError(message) {

    if (!error) return;

    error.hidden = false;
    error.textContent =
      message;
  }


  // ==========================================
  // RPC
  // ==========================================

  async function rpc(
    method,
    params
  ) {

    const controller =
      new AbortController();

    const timeout =
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

      clearTimeout(timeout);
    }
  }


  // ==========================================
  // ERC20 balanceOf
  // ==========================================

  function erc20BalanceCall(wallet) {

    return (
      "0x70a08231" +
      wallet
        .slice(2)
        .toLowerCase()
        .padStart(64, "0")
    );
  }


  // ==========================================
  // ERC721 balanceOf
  // ==========================================

  function erc721BalanceCall(wallet) {

    return (
      "0x70a08231" +
      wallet
        .slice(2)
        .toLowerCase()
        .padStart(64, "0")
    );
  }


  // ==========================================
  // TOKEN FORMAT
  // ==========================================

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

      return (
        whole.toString() +
        " TL404"
      );
    }


    const fractionText =
      fraction
        .toString()
        .padStart(
          decimals,
          "0"
        )
        .replace(
          /0+$/,
          ""
        );


    return (
      whole.toString() +
      "." +
      fractionText +
      " TL404"
    );
  }


  // ==========================================
  // NFT COUNTER UI
  // ==========================================

  function createCounter() {

    let existing =
      document.getElementById(
        "last404RecoveryCounter"
      );

    if (existing) {
      return existing;
    }


    const box =
      document.createElement(
        "div"
      );

    box.id =
      "last404RecoveryCounter";


    box.innerHTML = `
      <div class="l404-counter-title">
        NFT RECOVERY
      </div>

      <div class="l404-counter-main">
        <span id="l404Recovered">
          —
        </span>

        <span class="l404-counter-total">
          / 404
        </span>
      </div>

      <div class="l404-counter-remaining">
        <span id="l404Remaining">
          —
        </span>
        REMAINING
      </div>
    `;


    box.style.cssText = `
      width:100%;
      margin:18px 0;
      padding:18px;
      box-sizing:border-box;
      text-align:center;
      border:1px solid rgba(255,255,255,.18);
      border-radius:12px;
      background:rgba(0,0,0,.35);
    `;


    const title =
      box.querySelector(
        ".l404-counter-title"
      );

    title.style.cssText = `
      font-size:11px;
      letter-spacing:3px;
      margin-bottom:8px;
      opacity:.65;
    `;


    const main =
      box.querySelector(
        ".l404-counter-main"
      );

    main.style.cssText = `
      font-size:30px;
      font-weight:800;
      letter-spacing:1px;
    `;


    const total =
      box.querySelector(
        ".l404-counter-total"
      );

    total.style.cssText = `
      font-size:16px;
      opacity:.45;
    `;


    const remaining =
      box.querySelector(
        ".l404-counter-remaining"
      );

    remaining.style.cssText = `
      margin-top:7px;
      font-size:11px;
      letter-spacing:2px;
      opacity:.65;
    `;


    if (
      button &&
      button.parentNode
    ) {

      button.parentNode.insertBefore(
        box,
        button
      );

    } else {

      document.body.appendChild(
        box
      );
    }


    return box;
  }


  // ==========================================
  // UPDATE NFT COUNTER
  // ==========================================

  async function updateRecoveryCounter() {

    try {

      const box =
        createCounter();


      const recoveredEl =
        box.querySelector(
          "#l404Recovered"
        );

      const remainingEl =
        box.querySelector(
          "#l404Remaining"
        );


      const raw =
        await rpc(
          "eth_call",
          [
            {
              to: NFT_CONTRACT,

              data:
                erc721BalanceCall(
                  TEAM_WALLET
                )
            },

            "latest"
          ]
        );


      const teamNFTBalance =
        Number(
          BigInt(raw)
        );


      let recovered =
        TOTAL_SUPPLY -
        teamNFTBalance;


      if (recovered < 0) {
        recovered = 0;
      }


      if (
        recovered >
        TOTAL_SUPPLY
      ) {
        recovered =
          TOTAL_SUPPLY;
      }


      const remaining =
        TOTAL_SUPPLY -
        recovered;


      recoveredEl.textContent =
        recovered;

      remainingEl.textContent =
        remaining;


      // ========================================
      // SOLD OUT
      // ========================================

      if (
        recovered >=
        TOTAL_SUPPLY
      ) {

        const title =
          box.querySelector(
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
          box.querySelector(
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
        "NFT counter error:",
        err
      );

      const box =
        createCounter();


      const recoveredEl =
        box.querySelector(
          "#l404Recovered"
        );

      const remainingEl =
        box.querySelector(
          "#l404Remaining"
        );


      recoveredEl.textContent =
        "—";

      remainingEl.textContent =
        "—";
    }
  }


  // ==========================================
  // CHECK TL404
  // ==========================================

  async function check() {

    if (!button) return;

    button.disabled =
      true;

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
        shortAddress(wallet);
    }


    setStatus(
      "CHECKING…"
    );


    try {

      // Chain
      const chain =
        await rpc(
          "eth_chainId",
          []
        );


      if (
        Number(
          BigInt(chain)
        ) !== 4663
      ) {

        throw new Error(
          "Wrong network."
        );
      }


      // TL404 decimals
      const decimalsHex =
        await rpc(
          "eth_call",
          [
            {
              to: TL404,
              data:
                "0x313ce567"
            },

            "latest"
          ]
        );


      const decimals =
        Number(
          BigInt(
            decimalsHex
          )
        );


      // TL404 balance
      const raw =
        await rpc(
          "eth_call",
          [
            {
              to: TL404,

              data:
                erc20BalanceCall(
                  wallet
                )
            },

            "latest"
          ]
        );


      const balance =
        BigInt(raw);


      const divisor =
        10n ** BigInt(decimals);


      const required =
        MINIMUM *
        divisor;


      if (balanceEl) {

        balanceEl.textContent =
          formatUnitsLocal(
            balance,
            decimals
          );
      }


      if (
        balance >=
        required
      ) {

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
        "TL404 check error:",
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


    // Counter loads independently
    updateRecoveryCounter();
  }


  // ==========================================
  // RECOVER NFT
  // ==========================================

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


          const anon =
            CONFIG.SUPABASE_ANON_KEY ||
            "";


          if (!base) {

            throw new Error(
              "Claim service is not configured."
            );
          }


          /*
           * IMPORTANT:
           *
           * The deployed Edge Function route
           * shown by Supabase is hyper-task.
           */

          const endpoint =
            base +
            "/functions/v1/hyper-task";


          const headers = {

            "Content-Type":
              "application/json",

            "Accept":
              "application/json"
          };


          /*
           * Publishable key is safe
           * for frontend use.
           */

          if (anon) {

            headers["apikey"] =
              anon;
          }


          const response =
            await fetch(
              endpoint,
              {
                method:
                  "POST",

                mode:
                  "cors",

                credentials:
                  "omit",

                cache:
                  "no-store",

                headers:
                  headers,

                body:
                  JSON.stringify({
                    wallet:
                      wallet
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


          // ==================================
          // SUCCESS
          // ==================================

          if (success) {
            success.hidden =
              false;
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


          /*
           * Wait for blockchain state
           * and update counter.
           */

          setTimeout(
            updateRecoveryCounter,
            3000
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


  // ==========================================
  // WALLET CHANGED
  // ==========================================

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


  // ==========================================
  // STORAGE SYNC
  // ==========================================

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


  // ==========================================
  // INITIAL LOAD
  // ==========================================

  window.addEventListener(
    "load",
    function () {

      createCounter();

      check();

      updateRecoveryCounter();
    }
  );


  // Fallback for already-loaded document
  createCounter();

  check();

  updateRecoveryCounter();

})();
