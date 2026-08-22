(function(){
  const TL404="0x316eC28D4e69Adf4697F0cA7DE45c164C295eC9d";
  const MINIMUM=200000n;
  const PUBLIC_RPC="https://rpc.mainnet.chain.robinhood.com";
  const CHAIN_ID=4663;

  const walletEl=document.getElementById("claimWallet");
  const balanceEl=document.getElementById("claimBalance");
  const eligibilityEl=document.getElementById("claimEligibility");
  const button=document.getElementById("claimButton");
  const success=document.getElementById("claimSuccess");
  const successText=document.getElementById("claimSuccessText");
  const error=document.getElementById("claimError");

  const STORAGE_KEY="last404_wallet";
  const short=a=>a.slice(0,8)+"…"+a.slice(-6);
  const valid=a=>/^0x[a-fA-F0-9]{40}$/.test(a||"");

  function showError(msg){
    error.hidden=false;
    error.textContent=msg;
  }

  function getWallet(){
    const params=new URLSearchParams(location.search);
    const fromUrl=params.get("wallet");
    if(valid(fromUrl)){
      localStorage.setItem(STORAGE_KEY,fromUrl);
      return fromUrl;
    }
    const saved=localStorage.getItem(STORAGE_KEY);
    return valid(saved)?saved:null;
  }

  async function rpc(method,params){
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),8000);
    try{
      const r=await fetch(PUBLIC_RPC,{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({jsonrpc:"2.0",id:Date.now(),method,params}),
        signal:controller.signal
      });
      if(!r.ok) throw new Error("RPC HTTP "+r.status);
      const data=await r.json();
      if(data.error) throw new Error(data.error.message||"RPC error");
      return data.result;
    }finally{
      clearTimeout(timer);
    }
  }

  // ERC20 balanceOf(address): 0x70a08231 + padded address
  function balanceCall(wallet){
    return "0x70a08231"+wallet.slice(2).toLowerCase().padStart(64,"0");
  }

  // ERC20 decimals(): 0x313ce567
  async function getDecimals(){
    const hex=await rpc("eth_call",[{to:TL404,data:"0x313ce567"},"latest"]);
    return Number(BigInt(hex));
  }

  async function check(){
    error.hidden=true;
    button.disabled=true;
    button.textContent="RECOVER NFT";

    const wallet=getWallet();

    if(!wallet){
      walletEl.textContent="NOT CONNECTED";
      balanceEl.textContent="—";
      eligibilityEl.textContent="CONNECT WALLET FIRST";
      return;
    }

    walletEl.textContent=short(wallet);
    eligibilityEl.textContent="CHECKING…";

    try{
      // Verify network RPC is alive.
      await rpc("eth_chainId",[]);
      const decimals=await getDecimals();
      const raw=await rpc("eth_call",[
        {to:TL404,data:balanceCall(wallet)},
        "latest"
      ]);
      const balance=BigInt(raw);
      const divisor=10n**BigInt(decimals);
      const whole=balance/divisor;
      const remainder=balance%divisor;

      balanceEl.textContent=whole.toLocaleString()+" TL404";

      const required=200000n*divisor;

      if(balance>=required){
        eligibilityEl.textContent="ELIGIBLE";
        eligibilityEl.classList.add("eligible");
        button.disabled=false;
      }else{
        eligibilityEl.textContent="NOT ELIGIBLE";
        eligibilityEl.classList.remove("eligible");
        button.disabled=true;
      }
    }catch(e){
      console.error(e);
      eligibilityEl.textContent="CHECK FAILED";
      balanceEl.textContent="—";
      button.disabled=true;
      showError("Token balance check failed. Please refresh and try again.");
    }
  }

  button.addEventListener("click",async()=>{
    const wallet=getWallet();
    if(!wallet){
      showError("Please connect your wallet on the main page first.");
      return;
    }

    button.disabled=true;
    button.textContent="RECOVERING…";
    error.hidden=true;

    try{
      const base=(window.LAST404_CONFIG&&window.LAST404_CONFIG.SUPABASE_URL)||"";
      const anon=(window.LAST404_CONFIG&&window.LAST404_CONFIG.SUPABASE_ANON_KEY)||"";
      if(!base) throw new Error("Claim service is not configured.");

      const url=base.replace(/\/$/,"")+"/functions/v1/claim-nft";
      const r=await fetch(url,{
        method:"POST",
        headers:{
          "Content-Type":"application/json",
          "apikey":anon,
          "Authorization":"Bearer "+anon
        },
        body:JSON.stringify({wallet})
      });

      const text=await r.text();
      let data={};
      try{data=JSON.parse(text)}catch(_){}

      if(!r.ok||!data.success){
        throw new Error(data.error||("Claim service returned HTTP "+r.status));
      }

      success.hidden=false;
      successText.textContent=
        "NFT #"+String(data.tokenId).padStart(3,"0")+
        " has been transferred to your wallet. Transaction: "+data.txHash;
      button.textContent="RECOVERED";
    }catch(e){
      console.error(e);
      showError(e.message||"Claim failed. Please try again.");
      button.disabled=false;
      button.textContent="RECOVER NFT";
    }
  });

  window.addEventListener("storage",e=>{
    if(e.key===STORAGE_KEY) check();
  });
  window.addEventListener("last404:walletChanged",()=>check());

  // If the injected provider is present, keep account changes synced.
  if(window.ethereum?.on){
    window.ethereum.on("accountsChanged",accounts=>{
      if(accounts?.[0]){
        localStorage.setItem(STORAGE_KEY,accounts[0]);
      }else{
        localStorage.removeItem(STORAGE_KEY);
      }
      check();
    });
  }

  window.addEventListener("load",check);
  check();
})();
