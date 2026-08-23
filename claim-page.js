(function () {
  "use strict";

  // =====================================================
  // CONFIG
  // =====================================================

  const CONFIG =
    window.LAST404_CONFIG || {};

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

  const TOTAL_SUPPLY =
    404;

  const PUBLIC_RPC =
    "https://rpc.mainnet.chain.robinhood.com";

  const EXPECTED_CHAIN_ID =
    4663;

  const ROBINHOOD_CHAIN = {
  chainId: "0x1237",
  chainName: "Robinhood Chain",
  nativeCurrency: {
    name: "Robinhood",
    symbol: "RHO",
    decimals: 18
  },
  rpcUrls: [
    "https://rpc.mainnet.chain.robinhood.com"
  ],
  blockExplorerUrls: [
    "https://explorer.mainnet.chain.robinhood.com"
  ]
};

  async function ensureRobinhoodNetwork() {

  if (
    !window.ethereum ||
    typeof window.ethereum.request !== "function"
  ) {
    throw new Error(
      "Wallet provider not found."
    );
  }

  const currentChain =
    await window.ethereum.request({
      method: "eth_chainId"
    });

  if (
    Number(
      BigInt(currentChain)
    ) === EXPECTED_CHAIN_ID
  ) {
    return true;
  }

  try {

    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [
        {
          chainId:
            ROBINHOOD_CHAIN.chainId
        }
      ]
    });

    return true;

  } catch (switchError) {

    if (
      switchError &&
      (
        switchError.code === 4902 ||
        switchError.code === -32603
      )
    ) {

      await window.ethereum.request({
        method:
          "wallet_addEthereumChain",

        params: [
          ROBINHOOD_CHAIN
        ]
      });

      return true;
    }

    throw switchError;
  }
}

  const STORAGE_KEY =
    "last404_wallet";


  // =====================================================
  // ELEMENTS
  // =====================================================

  const walletEl =
    document.getElementById(
      "claimWallet"
    );

  const balanceEl =
    document.getElementById(
      "claimBalance"
    );

  const eligibilityEl =
    document.getElementById(
      "claimEligibility"
    );

  const button =
    document.getElementById(
      "claimButton"
    );

  const success =
    document.getElementById(
      "claimSuccess"
    );

  const successText =
    document.getElementById(
      "claimSuccessText"
    );

  const error =
    document.getElementById(
      "claimError"
    );


  // =====================================================
  // BASIC HELPERS
  // =====================================================

  function validAddress(
    address
  ) {
    return /^0x[a-fA-F0-9]{40}$/.test(
      address || ""
    );
  }


  function checksum(
    address
  ) {
    if (!address) {
      return "NOT CONNECTED";
    }

    return (
      address.slice(0, 8) +
      "…" +
      address.slice(-6)
    );
  }


  function showError(
    message
  ) {

    if (!error) return;

    error.hidden =
      false;

    error.textContent =
      message;
  }


  function hideError() {

    if (!error) return;

    error.hidden =
      true;
  }


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


  // =====================================================
  // WALLET
  // =====================================================

  function getWallet() {

    const params =
      new URLSearchParams(
        location.search
      );

    const fromUrl =
      params.get(
        "wallet"
      );

    if (
      validAddress(
        fromUrl
      )
    ) {

      localStorage.setItem(
        STORAGE_KEY,
        fromUrl
      );

      return fromUrl;
    }


    const saved =
      localStorage.getItem(
        STORAGE_KEY
      );

    if (
      validAddress(
        saved
      )
    ) {
      return saved;
    }


    try {

      if (
        window.ethereum &&
        validAddress(
          window.ethereum
            .selectedAddress
        )
      ) {

        const address =
          window.ethereum
            .selectedAddress;

        localStorage.setItem(
          STORAGE_KEY,
          address
        );

        return address;
      }

    } catch (_) {}


    return null;
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

    const timer =
      setTimeout(
        function () {
          controller.abort();
        },
        15000
      );


    try {

      const response =
        await fetch(
          PUBLIC_RPC,
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body:
              JSON.stringify({
                jsonrpc:
                  "2.0",

                id:
                  Date.now(),

                method:
                  method,

                params:
                  params
              }),

            signal:
              controller.signal
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

      clearTimeout(
        timer
      );
    }
  }


  // =====================================================
  // ERC20 balanceOf
  // =====================================================

  function balanceCall(
    wallet
  ) {

    return (
      "0x70a08231" +
      wallet
        .slice(2)
        .toLowerCase()
        .padStart(
          64,
          "0"
        )
    );
  }


  // =====================================================
  // FORMAT TL404
  // =====================================================

  function formatUnitsLocal(
    value,
    decimals
  ) {

    const divisor =
      10n **
      BigInt(
        decimals
      );

    const whole =
      value /
      divisor;

    const fraction =
      value %
      divisor;


    if (
      fraction ===
      0n
    ) {

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


  // =====================================================
  // GET TOKEN DECIMALS
  // =====================================================

  async function getTokenDecimals() {

    const result =
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


    return Number(
      BigInt(
        result
      )
    );
  }


  // =====================================================
  // CHECK USER BALANCE
  // =====================================================

  async function check() {

    hideError();

    if (button) {

      button.disabled =
        true;

      button.textContent =
        "BURN 404,000 TL404 & RECOVER NFT";
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
        checksum(
          wallet
        );
    }


    setStatus(
      "CHECKING…"
    );


    try {

      const chain =
        await rpc(
          "eth_chainId",
          []
        );


      if (
        Number(
          BigInt(
            chain
          )
        ) !==
        EXPECTED_CHAIN_ID
      ) {

        throw new Error(
          "Please switch to Robinhood Chain Mainnet."
        );
      }


      const decimals =
        await getTokenDecimals();


      const raw =
        await rpc(
          "eth_call",
          [
            {
              to:
                TL404,

              data:
                balanceCall(
                  wallet
                )
            },

            "latest"
          ]
        );


      const balance =
        BigInt(
          raw
        );


      const divisor =
        10n **
        BigInt(
          decimals
        );


      const required =
        BURN_AMOUNT *
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
          "READY TO BURN & RECOVER",
          true
        );


        if (button) {

          button.disabled =
            false;

          button.textContent =
            "BURN 404,000 TL404 & RECOVER NFT";
        }


      } else {

        setStatus(
          "NOT ELIGIBLE"
        );


        if (button) {

          button.disabled =
            true;

          button.textContent =
            "BURN 404,000 TL404 & RECOVER NFT";
        }
      }


    } catch (e) {

      console.error(
        "TL404 check error:",
        e
      );


      if (balanceEl) {

        balanceEl.textContent =
          "—";
      }


      setStatus(
        "CHECK FAILED"
      );


      showError(
        e &&
        e.message
          ? e.message
          : "Could not check TL404."
      );
    }
  }


  // =====================================================
  // WAIT FOR TRANSACTION
  // =====================================================

  async function waitForReceipt(
    txHash
  ) {

    for (
      let i = 0;
      i < 60;
      i++
    ) {

      const receipt =
        await rpc(
          "eth_getTransactionReceipt",
          [
            txHash
          ]
        );


      if (receipt) {

        if (
          receipt.status ===
          "0x1"
        ) {

          return receipt;
        }


        throw new Error(
          "Burn transaction failed or was reverted."
        );
      }


      await new Promise(
        function (resolve) {

          setTimeout(
            resolve,
            2000
          );

        }
      );
    }


    throw new Error(
      "Transaction confirmation timed out. Please check your wallet transaction."
    );
  }


  // =====================================================
  // CREATE ERC20 TRANSFER DATA
  // =====================================================

  function createTransferData(
    decimals
  ) {

    const amount =
      BURN_AMOUNT *
      (
        10n **
        BigInt(
          decimals
        )
      );


    /*
     * transfer(address,uint256)
     *
     * selector:
     * 0xa9059cbb
     */

    const selector =
      "0xa9059cbb";


    const addressData =
      BURN_ADDRESS
        .slice(2)
        .toLowerCase()
        .padStart(
          64,
          "0"
        );


    const amountData =
      amount
        .toString(
          16
        )
        .padStart(
          64,
          "0"
        );


    return (
      selector +
      addressData +
      amountData
    );
  }


  // =====================================================
  // BURN TOKENS
  // =====================================================

  async function burnTokens(
    wallet
  ) {

    if (
      !window.ethereum ||
      typeof window.ethereum.request !==
        "function"
    ) {

      throw new Error(
        "Your wallet provider was not found. Please open this page inside your wallet browser."
      );
    }


    // Ask wallet for current account
    const accounts =
      await window.ethereum.request({
        method:
          "eth_requestAccounts"
      });


    if (
      !accounts ||
      !accounts.length
    ) {

      throw new Error(
        "Please connect your wallet first."
      );
    }


    const connectedWallet =
      accounts[0];


    if (
      connectedWallet.toLowerCase() !==
      wallet.toLowerCase()
    ) {

      localStorage.setItem(
        STORAGE_KEY,
        connectedWallet
      );

      throw new Error(
        "The connected wallet changed. Please press Recover again."
      );
    }


    // Check chain
    const chainId =
      await window.ethereum.request({
        method:
          "eth_chainId"
      });


    if (
      Number(
        BigInt(
          chainId
        )
      ) !==
      EXPECTED_CHAIN_ID
    ) {

      throw new Error(
        "Please switch to Robinhood Chain Mainnet."
      );
    }


    const decimals =
      await getTokenDecimals();


    const data =
      createTransferData(
        decimals
      );


    /*
     * This opens MetaMask / Bitget /
     * other injected EVM wallet confirmation.
     *
     * User does NOT enter 404,000 manually.
     */

    const txHash =
      await window.ethereum.request({
        method:
          "eth_sendTransaction",

        params: [
          {
            from:
              connectedWallet,

            to:
              TL404,

            data:
              data
          }
        ]
      });


    if (
      !txHash
    ) {

      throw new Error(
        "No burn transaction hash was returned by the wallet."
      );
    }


    return txHash;
  }


  // =====================================================
  // SEND BURN TX TO BACKEND
  // =====================================================

  async function submitBurn(
    wallet,
    burnTxHash
  ) {

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
     * JWT verification is OFF on the
     * deployed function, so only send
     * the publishable key as apikey.
     */

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
                wallet,

              burnTxHash:
                burnTxHash
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

    } catch (_) {}


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
        "NFT recovery was not completed."
      );
    }


    return data;
  }


  // =====================================================
  // RECOVER BUTTON
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
          "BURNING 404,000 TL404…";

        hideError();


        try {

          // ---------------------------------------------
          // STEP 1
          // Burn exact amount
          // ---------------------------------------------

          const burnTxHash =
            await burnTokens(
              wallet
            );


          // ---------------------------------------------
          // STEP 2
          // Wait for blockchain confirmation
          // ---------------------------------------------

          button.textContent =
            "CONFIRMING BURN…";


          await waitForReceipt(
            burnTxHash
          );


          // ---------------------------------------------
          // STEP 3
          // Backend verifies burn
          // ---------------------------------------------

          button.textContent =
            "RECOVERING NFT…";


          const data =
            await submitBurn(
              wallet,
              burnTxHash
            );


          // ---------------------------------------------
          // SUCCESS
          // ---------------------------------------------

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
              " has been transferred to your wallet. NFT transaction: " +
              data.txHash;
          }


          button.textContent =
            "RECOVERED";


          /*
           * Refresh balance after burn.
           * It should now be 404,000 lower.
           */

          setTimeout(
            check,
            3000
          );


        } catch (e) {

          console.error(
            "BURN / RECOVERY ERROR:",
            e
          );


          showError(
            e &&
            e.message
              ? e.message
              : "Burn or NFT recovery failed."
          );


          button.disabled =
            false;

          button.textContent =
            "BURN 404,000 TL404 & RECOVER NFT";
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


      setTimeout(
        check,
        100
      );
    }
  );


  // =====================================================
  // EIP-1193 EVENTS
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
          function (
            accounts
          ) {

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
              check,
              100
            );
          }
        );


        window.ethereum.on(
          "chainChanged",
          function () {

            setTimeout(
              check,
              300
            );
          }
        );
      }

    } catch (e) {

      console.warn(
        "Provider event error:",
        e
      );
    }
  }


  // =====================================================
  // INITIALIZE
  // =====================================================

  function initialize() {

    attachProviderEvents();

    check();
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


  window.addEventListener(
    "load",
    function () {

      attachProviderEvents();

      check();
    }
  );


})();
