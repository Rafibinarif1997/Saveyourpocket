(function(){
  const TL404 = "0x316eC28D4e69Adf4697F0cA7DE45c164C295eC9d";
  const MINIMUM = 200000n;
  const PUBLIC_RPC = "https://rpc.mainnet.chain.robinhood.com";

  const walletEl = document.getElementById("claimWallet");
  const balanceEl = document.getElementById("claimBalance");
  const eligibilityEl = document.getElementById("claimEligibility");
  const button = document.getElementById("claimButton");
  const success = document.getElementById("claimSuccess");
  const successText = document.getElementById("claimSuccessText");
  const error = document.getElementById("claimError");

  const short = (a) => a.slice(0,8) + "…" + a.slice(-6);

  function showError(msg){
    error.hidden = false;
    error.textContent = msg;
  }

  function getSavedWallet(){
    const value = localStorage.getItem("last404_wallet");
    return value && /^0x[a-fA-F0-9]{40}$/.test(value) ? value : null;
  }

  // If the wallet provider is still available, prefer its currently selected account.
  async function getCurrentProviderWallet(){
    try{
      if(!window.ethereum) return null;
      const accounts = await window.ethereum.request({method:"eth_accounts"});
      return accounts && accounts[0] ? accounts[0] : null;
    }catch(e){
      return null;
    }
  }

  async function check(){
    error.hidden = true;
    button.disabled = true;

    let wallet = getSavedWallet();
    const liveWallet = await getCurrentProviderWallet();

    if(liveWallet && /^0x[a-fA-F0-9]{40}$/.test(liveWallet)){
      wallet = liveWallet;
      localStorage.setItem("last404_wallet", liveWallet);
    }

    if(!wallet){
      walletEl.textContent = "NOT CONNECTED";
      balanceEl.textContent = "—";
      eligibilityEl.textContent = "CONNECT WALLET FIRST";
      return;
    }

    walletEl.textContent = short(wallet);
    eligibilityEl.textContent = "CHECKING...";

    try{
      // Use a normal RPC provider for reading the token balance.
      // This means the second page does NOT depend on the first page's
      // injected wallet provider remaining available.
      const provider = new ethers.JsonRpcProvider(PUBLIC_RPC, 4663, {
        staticNetwork: true
      });

      const abi = [
        "function balanceOf(address) view returns (uint256)",
        "function decimals() view returns (uint8)"
      ];

      const token = new ethers.Contract(TL404, abi, provider);
      const decimals = await token.decimals();
      const balance = await token.balanceOf(wallet);
      const formatted = ethers.formatUnits(balance, decimals);

      balanceEl.textContent =
        Number(formatted).toLocaleString() + " TL404";

      const required = ethers.parseUnits(
        MINIMUM.toString(),
        decimals
      );

      if(balance >= required){
        eligibilityEl.textContent = "ELIGIBLE";
        eligibilityEl.classList.add("eligible");
        button.disabled = false;
      }else{
        eligibilityEl.textContent = "NOT ELIGIBLE";
        eligibilityEl.classList.remove("eligible");
        button.disabled = true;
      }
    }catch(e){
      console.error(e);
      eligibilityEl.textContent = "CHECK FAILED";
      button.disabled = true;
      showError("Could not check your TL404 balance. Please refresh and try again.");
    }
  }

  button.addEventListener("click", async () => {
    const wallet = getSavedWallet();
    if(!wallet){
      showError("Please connect your wallet on the main page first.");
      return;
    }

    button.disabled = true;
    button.textContent = "RECOVERING...";
    error.hidden = true;

    try{
      // The backend must verify the balance again before transferring the NFT.
      const base =
        (window.LAST404_CONFIG && window.LAST404_CONFIG.SUPABASE_URL) || "";

      if(!base) throw new Error("Claim service is not configured.");

      const functionUrl = base.replace(/\/$/, "") + "/functions/v1/claim-nft";

      const r = await fetch(functionUrl, {
        method:"POST",
        headers:{
          "Content-Type":"application/json",
          "apikey":
            (window.LAST404_CONFIG && window.LAST404_CONFIG.SUPABASE_ANON_KEY) || ""
        },
        body:JSON.stringify({wallet})
      });

      const data = await r.json();

      if(!r.ok || !data.success){
        throw new Error(data.error || "Claim failed.");
      }

      success.hidden = false;
      successText.textContent =
        "NFT #" + String(data.tokenId).padStart(3,"0") +
        " has been transferred to your wallet. Transaction: " +
        data.txHash;

      button.textContent = "RECOVERED";
    }catch(e){
      console.error(e);
      showError(e.message || "Claim failed. Please try again.");
      button.disabled = false;
      button.textContent = "RECOVER NFT";
    }
  });

  // Keep the page synchronized if the user changes accounts in their wallet.
  if(window.ethereum){
    window.ethereum.on?.("accountsChanged", (accounts) => {
      if(accounts && accounts[0]){
        localStorage.setItem("last404_wallet", accounts[0]);
      }else{
        localStorage.removeItem("last404_wallet");
      }
      check();
    });
  }

  window.addEventListener("storage", (event) => {
    if(event.key === "last404_wallet") check();
  });

  window.addEventListener("load", check);
})();
