(function () {
  "use strict";

  // =====================================================
  // CONFIG
  // =====================================================

  const CONFIG = window.LAST404_CONFIG || {};

  const TL404 =
    CONFIG.TL404_TOKEN ||
    "0x316eC28D4e69Adf4697F0cA7DE45c164C295eC9d";

  const NFT_CONTRACT =
    "0x17B9371FED1A1865D97A288d10638c23012de78f";

  const TEAM_WALLET =
    "0x83243577d3149c34838e0adD665488525C736448";
  
  const BURN_ADDRESS =
  "0x000000000000000000000000000000000000dEaD";

const BURN_AMOUNT =
  404000n;

  const TOTAL_SUPPLY = 404;

  const REQUIRED_TOKENS = 404000n;

  const RPC =
    "https://rpc.mainnet.chain.robinhood.com";

  const STORAGE_KEY =
    "last404_wallet";


  // =====================================================
  // EXISTING ELEMENTS
  // =====================================================

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


  // =====================================================
  // HELPERS
  // =====================================================

  function validAddress(address) {
    return /^0x[a-fA-F0-9]{40}$/.test(
      address || ""
    );
  }


  function shortAddress(address) {
    if (!address) return "NOT CONNECTED";

    return (
      address.slice(0, 6) +
      "..." +
      address.slice(-4)
    );
  }


  function getWallet() {

    const params =
      new URLSearchParams(
        window.location.search
      );

    const urlWallet =
      params.get("wallet");

    if (validAddress(urlWallet)) {

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

    if (validAddress(saved)) {
      return saved;
    }


    // Bitget / MetaMask fallback
    try {

      if (
        window.ethereum &&
        Array.isArray(
          window.ethereum.selectedAddress
            ? [window.ethereum.selectedAddress]
            : []
        )
      ) {

        const address =
          window.ethereum.selectedAddress;

        if (validAddress(address)) {

          localStorage.setItem(
            STORAGE_KEY,
            address
          );

          return address;
        }
      }

    } catch (_) {}


    return null;
  }


  function showError(message) {

    if (!error) return;

    error.hidden = false;
    error.textContent = message;
  }


  function hideError() {

    if (!error) return;

    error.hidden = true;
  }


  function setEligibility(
    text,
    eligible
  ) {

    if (!eligibilityEl) return;

    eligibilityEl.textContent =
      text;

    eligibilityEl.classList.toggle(
      "eligible",
      !!eligible
    );
  }


  // =====================================================
  // RPC
  // =====================================================

  async function rpc(
    method,
    params
  ) {

    const controller =
      new AbortController();

    const timeout =
      setTimeout(
        function () {
          controller.abort();
        },
        10000
      );


    try {

      const response =
        await fetch(
          RPC,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body: JSON.stringify({
              jsonrpc: "2.0",
              id: Date.now(),
              method: method,
              params: params
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


  // =====================================================
  // ERC20 balanceOf
  // =====================================================

  function balanceOfCall(address) {

    return (
      "0x70a08231" +
      address
        .slice(2)
        .toLowerCase()
        .padStart(64, "0")
    );
  }


  // =====================================================
  // FORMAT TL404
  // =====================================================

  function formatToken(
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

      return whole.toLocaleString() +
        " TL404";
    }


    let fractionText =
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
      whole.toLocaleString() +
      "." +
      fractionText +
      " TL404"
    );
  }


  // =====================================================
  // CREATE GLOBAL COLLECTION INFO
  // =====================================================

  function createCollectionInfo() {

    let box =
      document.getElementById(
        "last404CollectionInfo"
      );


    if (box) return box;


    box =
      document.createElement(
        "div"
      );

    box.id =
      "last404CollectionInfo";


    box.innerHTML = `

      <div class="l404-info-title">
        THE LAST 404
      </div>

      <div class="l404-info-grid">

        <div class="l404-info-item">

          <div class="l404-info-label">
            TL404 TOKEN
          </div>

          <div
            class="l404-info-value"
            id="l404TokenBalance"
          >
            —
          </div>

        </div>


        <div class="l404-info-item">

          <div class="l404-info-label">
            NFT RECOVERED
          </div>

          <div
            class="l404-info-value"
            id="l404NFTRecovered"
          >
            —
          </div>

        </div>


        <div class="l404-info-item">

          <div class="l404-info-label">
            NFT REMAINING
          </div>

          <div
            class="l404-info-value"
            id="l404NFTRemaining"
          >
            —
          </div>

        </div>

      </div>
    `;


    box.style.cssText = `
      width:100%;
      box-sizing:border-box;
      margin:18px 0;
      padding:18px;
      border:1px solid rgba(255,255,255,.15);
      border-radius:14px;
      background:rgba(0,0,0,.30);
      text-align:center;
    `;


    const style =
      document.createElement(
        "style"
      );


    style.textContent = `

      #last404CollectionInfo
      .l404-info-title {
        font-size:11px;
        letter-spacing:3px;
        opacity:.6;
        margin-bottom:15px;
      }

      #last404CollectionInfo
      .l404-info-grid {
        display:grid;
        grid-template-columns:
          repeat(3,1fr);
        gap:10px;
      }

      #last404CollectionInfo
      .l404-info-item {
        padding:10px 5px;
      }

      #last404CollectionInfo
      .l404-info-label {
        font-size:9px;
        letter-spacing:1.5px;
        opacity:.55;
        margin-bottom:7px;
      }

      #last404CollectionInfo
      .l404-info-value {
        font-size:18px;
        font-weight:800;
      }

      @media(max-width:520px) {

        #last404CollectionInfo
        .l404-info-grid {
          grid-template-columns:
            1fr;
          gap:5px;
        }

      }

      #last404CollectionInfo
      .l404-soldout {
        font-size:12px;
        letter-spacing:2px;
        margin-top:10px;
        opacity:.8;
      }
    `;


    document.head.appendChild(
      style
    );


    // Put it before claim area.
    const parent =
      button &&
      button.parentNode
        ? button.parentNode
        : document.body;


    if (
      button &&
      button.parentNode === parent
    ) {

      parent.insertBefore(
        box,
        button
      );

    } else {

      parent.prepend(
        box
      );
    }


    return box;
  }


  // =====================================================
  // UPDATE NFT COUNTER
  // =====================================================

  async function updateNFTCounter() {

    const box =
      createCollectionInfo();


    const recoveredEl =
      box.querySelector(
        "#l404NFTRecovered"
      );

    const remainingEl =
      box.querySelector(
        "#l404NFTRemaining"
      );


    try {

      /*
       * ERC721 balanceOf(TEAM_WALLET)
       *
       * This does NOT depend on the
       * user's connected wallet.
       *
       * Therefore it should always work
       * before and after connecting.
       */

      const raw =
        await rpc(
          "eth_call",
          [
            {
              to:
                NFT_CONTRACT,

              data:
                balanceOfCall(
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
        recovered +
        " / " +
        TOTAL_SUPPLY;


      remainingEl.textContent =
        remaining;


      // SOLD OUT
      if (
        recovered >=
        TOTAL_SUPPLY
      ) {

        let sold =
          box.querySelector(
            ".l404-soldout"
          );


        if (!sold) {

          sold =
            document.createElement(
              "div"
            );

          sold.className =
            "l404-soldout";

          box.appendChild(
            sold
          );
        }


        sold.textContent =
          "ALL 404 NFTs RECOVERED";


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

        const sold =
          box.querySelector(
            ".l404-soldout"
          );

        if (sold) {
          sold.remove();
        }
      }


    } catch (err) {

      console.error(
        "NFT counter error:",
        err
      );

      recoveredEl.textContent =
        "— / 404";

      remainingEl.textContent =
        "—";
    }
  }


  // =====================================================
  // UPDATE CONNECTED USER TOKEN
  // =====================================================

  async function checkTokenBalance() {

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

      setEligibility(
        "CONNECT WALLET FIRST",
        false
      );

      if (button) {
        button.disabled = true;
      }

      return;
    }


    if (walletEl) {

      walletEl.textContent =
        shortAddress(wallet);
    }


    setEligibility(
      "CHECKING…",
      false
    );


    try {

      const decimalsHex =
        await rpc(
          "eth_call",
          [
            {
              to:
                TL404,

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


      const raw =
        await rpc(
          "eth_call",
          [
            {
              to:
                TL404,

              data:
                balanceOfCall(
                  wallet
                )
            },

            "latest"
          ]
        );


      const balance =
        BigInt(raw);


      if (balanceEl) {

        balanceEl.textContent =
          formatToken(
            balance,
            decimals
          );
      }


      const required =
        REQUIRED_TOKENS *
        (
          10n **
          BigInt(decimals)
        );


      if (
        balance >= required
      ) {

        setEligibility(
          "READY TO RECOVER",
          true
        );

        if (button) {
          button.disabled =
            false;
        }

      } else {

        setEligibility(
          "NOT ELIGIBLE",
          false
        );

        if (button) {
          button.disabled =
            true;
        }
      }


    } catch (err) {

      console.error(
        "TL404 balance error:",
        err
      );

      if (balanceEl) {
        balanceEl.textContent =
          "—";
      }

      setEligibility(
        "CHECK FAILED",
        false
      );

      showError(
        "Could not check TL404. Please refresh and try again."
      );
    }
  }


  // =====================================================
  // COMPLETE PAGE REFRESH
  // =====================================================

  async function refreshPage() {

    /*
     * NFT collection data is GLOBAL.
     *
     * Always update it regardless of whether
     * wallet is connected.
     */

    updateNFTCounter();


    /*
     * User-specific TL404 eligibility.
     */

    checkTokenBalance();
  }


  // =====================================================
  // RECOVER NFT
  // =====================================================

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

        hideError();


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
           * CURRENT DEPLOYED ROUTE
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


          if (anon) {

            headers.apikey =
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


          // SUCCESS
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
           * Give blockchain a moment to
           * update Team Wallet balance.
           */

          setTimeout(
            updateNFTCounter,
            3000
          );


          setTimeout(
            updateNFTCounter,
            8000
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


  // =====================================================
  // WALLET CHANGE
  // =====================================================

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


      /*
       * IMPORTANT:
       *
       * NFT counter is global.
       *
       * Re-rendering wallet data must NOT
       * remove the counter.
       */

      setTimeout(
        refreshPage,
        50
      );
    }
  );


  // =====================================================
  // EIP-1193 WALLET EVENTS
  // =====================================================

  function attachProviderEvents() {

    try {

      if (
        window.ethereum &&
        typeof window.ethereum.on ===
          "function"
      ) {

        window.ethereum.on(
          "accountsChanged",
          function (accounts) {

            const address =
              accounts &&
              accounts.length
                ? accounts[0]
                : null;


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


            setTimeout(
              refreshPage,
              100
            );
          }
        );


        window.ethereum.on(
          "chainChanged",
          function () {

            setTimeout(
              refreshPage,
              300
            );
          }
        );
      }

    } catch (err) {

      console.warn(
        "Provider event setup:",
        err
      );
    }
  }


  // =====================================================
  // BITGET / MOBILE DAPP SUPPORT
  // =====================================================

  /*
   * Bitget DApp browser can initialize
   * injected providers after page load.
   *
   * So we retry initialization briefly.
   */

  let providerAttempts = 0;

  const providerTimer =
    setInterval(
      function () {

        providerAttempts++;

        attachProviderEvents();

        const wallet =
          getWallet();


        if (
          wallet ||
          window.ethereum ||
          providerAttempts >= 20
        ) {

          clearInterval(
            providerTimer
          );

          refreshPage();
        }

      },
      500
    );


  // =====================================================
  // DOM READY
  // =====================================================

  function initialize() {

    createCollectionInfo();

    attachProviderEvents();

    refreshPage();
  }


  if (
    document.readyState ===
    "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      initialize
    );

  } else {

    initialize();
  }


  // =====================================================
  // PAGE LOAD
  // =====================================================

  window.addEventListener(
    "load",
    function () {

      createCollectionInfo();

      attachProviderEvents();

      refreshPage();
    }
  );


  // =====================================================
  // PERIODIC GLOBAL COUNTER REFRESH
  // =====================================================

  /*
   * Refresh every 30 seconds.
   *
   * This keeps the global NFT count updated
   * even when another user recovers an NFT.
   */

  setInterval(
    function () {

      updateNFTCounter();

    },
    30000
  );

// =====================================================
// CONTRACT ADDRESSES
// =====================================================

function addContractAddresses() {

  if (
    document.getElementById(
      "last404ContractAddresses"
    )
  ) {
    return;
  }

  const box =
    document.createElement("div");

  box.id =
    "last404ContractAddresses";

  box.innerHTML = `
    <div class="l404-ca-title">
      CONTRACT ADDRESSES
    </div>

    <div class="l404-ca-item">

      <div class="l404-ca-label">
        TL404 TOKEN CONTRACT
      </div>

      <div class="l404-ca-row">

        <span class="l404-ca-address">
          0x316eC28D4e69Adf4697F0cA7DE45c164C295eC9d
        </span>

        <button
          type="button"
          class="l404-copy-btn"
          data-address="0x316eC28D4e69Adf4697F0cA7DE45c164C295eC9d"
        >
          COPY
        </button>

      </div>

    </div>

    <div class="l404-ca-item">

      <div class="l404-ca-label">
        NFT CONTRACT
      </div>

      <div class="l404-ca-row">

        <span class="l404-ca-address">
          0x17B9371FED1A1865D97A288d10638c23012de78f
        </span>

        <button
          type="button"
          class="l404-copy-btn"
          data-address="0x17B9371FED1A1865D97A288d10638c23012de78f"
        >
          COPY
        </button>

      </div>

    </div>
  `;

  const style =
    document.createElement("style");

  style.textContent = `
    #last404ContractAddresses {
      width:100%;
      box-sizing:border-box;
      margin:28px 0 10px;
      padding:20px;
      border:1px solid rgba(255,255,255,.14);
      border-radius:14px;
      background:rgba(0,0,0,.28);
    }

    #last404ContractAddresses .l404-ca-title {
      text-align:center;
      font-size:11px;
      letter-spacing:3px;
      opacity:.6;
      margin-bottom:20px;
    }

    #last404ContractAddresses .l404-ca-item {
      margin-bottom:18px;
    }

    #last404ContractAddresses .l404-ca-item:last-child {
      margin-bottom:0;
    }

    #last404ContractAddresses .l404-ca-label {
      font-size:9px;
      letter-spacing:1.7px;
      opacity:.55;
      margin-bottom:8px;
    }

    #last404ContractAddresses .l404-ca-row {
      display:flex;
      align-items:center;
      gap:8px;
      width:100%;
    }

    #last404ContractAddresses .l404-ca-address {
      flex:1;
      min-width:0;
      overflow:hidden;
      text-overflow:ellipsis;
      white-space:nowrap;
      font-family:monospace;
      font-size:10px;
      opacity:.85;
    }

    #last404ContractAddresses .l404-copy-btn {
      flex-shrink:0;
      border:1px solid rgba(255,255,255,.25);
      background:transparent;
      color:inherit;
      padding:7px 10px;
      border-radius:6px;
      font-size:9px;
      letter-spacing:1px;
      cursor:pointer;
    }

    #last404ContractAddresses .l404-copy-btn:active {
      transform:scale(.96);
    }
  `;

  document.head.appendChild(style);

  /*
   * Put it directly AFTER the Recover button.
   * We query the button again here, so this works
   * even though the button variable is inside another scope.
   */

  const recoverButton =
    document.querySelector(
      "#claimButton"
    );

  if (
    recoverButton &&
    recoverButton.parentNode
  ) {

    recoverButton.parentNode.appendChild(
      box
    );

  } else {

    /*
     * Fallback: put it at the bottom of the page.
     */

    document.body.appendChild(
      box
    );
  }


  // COPY BUTTONS

  box
    .querySelectorAll(
      ".l404-copy-btn"
    )
    .forEach(function (copyButton) {

      copyButton.addEventListener(
        "click",
        async function () {

          const address =
            copyButton.dataset.address;

          try {

            if (
              navigator.clipboard &&
              navigator.clipboard.writeText
            ) {

              await navigator.clipboard.writeText(
                address
              );

            } else {

              const textarea =
                document.createElement(
                  "textarea"
                );

              textarea.value =
                address;

              textarea.style.position =
                "fixed";

              textarea.style.opacity =
                "0";

              document.body.appendChild(
                textarea
              );

              textarea.select();

              document.execCommand(
                "copy"
              );

              textarea.remove();
            }


            const old =
              copyButton.textContent;

            copyButton.textContent =
              "COPIED!";

            setTimeout(
              function () {
                copyButton.textContent =
                  old;
              },
              1500
            );

          } catch (err) {

            console.error(
              "Copy failed:",
              err
            );
          }
        }
      );
    });
}


// Run after page is ready

if (
  document.readyState ===
  "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    addContractAddresses
  );

} else {

  addContractAddresses();
}
})();
