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

  const STORAGE_KEY =
    "last404_wallet";


  // -----------------------------
  // BASIC HELPERS
  // -----------------------------

  const valid = (address) =>
    /^0x[a-fA-F0-9]{40}$/.test(address || "");


  const checksum = (address) =>
    address.slice(0, 8) +
    "…" +
    address.slice(-6);


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


  function setStatus(
    text,
    eligible = false
  ) {

    eligibilityEl.textContent =
      text;

    eligibilityEl.classList.toggle(
      "eligible",
      eligible
    );
  }


  function showError(message) {

    error.hidden = false;

    error.textContent =
      message;
  }


  // -----------------------------
  // ROBINHOOD RPC
  // -----------------------------

  async function rpc(
    method,
    params
  ) {

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
  // FORMAT TOKEN BALANCE
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

      return (
        whole.toString() +
        " TL404"
      );
    }


    let fractionText =
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
  // CHECK WALLET / BALANCE
  // -----------------------------

  async function check() {

    error.hidden = true;

    button.disabled = true;

    button.textContent =
      "RECOVER NFT";


    const wallet =
      getWallet();


    if (!wallet) {

      walletEl.textContent =
        "NOT CONNECTED";

      balanceEl.textContent =
        "—";

      setStatus(
        "CONNECT WALLET FIRST"
      );

      return;
    }


    walletEl.textContent =
      checksum(wallet);

    setStatus(
      "CHECKING…"
    );


    try {

      // Check chain
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
          "Robinhood Chain Mainnet RPC unavailable."
        );
      }


      // Get TL404 decimals
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


      // Get wallet balance
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


      balanceEl.textContent =
        formatUnitsLocal(
          balance,
          decimals
        );


      if (
        balance >= required
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

      balanceEl.textContent =
        "—";

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

      error.hidden =
        true;


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
          "/functions/v1/claim-nft";


        /*
         * IMPORTANT:
         *
         * We intentionally do NOT send:
         *
         * Authorization
         * apikey
         *
         * headers here.
         *
         * Your function has JWT verification disabled.
         *
         * Using text/plain also avoids the browser's
         * application/json preflight.
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
                  "text/plain;charset=UTF-8",

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


        // HTTP error
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


        // Function returned unsuccessful result
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

        success.hidden =
          false;


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


        button.textContent =
          "RECOVERED";


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
  // INITIAL LOAD
  // -----------------------------

  window.addEventListener(
    "load",
    check
  );


  check();

})();
