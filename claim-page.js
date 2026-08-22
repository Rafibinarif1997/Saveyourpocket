(function(){
  const CONFIG=window.LAST404_CONFIG||{};
  const TL404=CONFIG.TL404_TOKEN||"0x316eC28D4e69Adf4697F0cA7DE45c164C295eC9d";
  const MINIMUM=200000n;
  const PUBLIC_RPC="https://rpc.mainnet.chain.robinhood.com";

  const walletEl=document.getElementById("claimWallet");
  const balanceEl=document.getElementById("claimBalance");
  const eligibilityEl=document.getElementById("claimEligibility");
  const button=document.getElementById("claimButton");
  const success=document.getElementById("claimSuccess");
  const successText=document.getElementById("claimSuccessText");
  const error=document.getElementById("claimError");
  const STORAGE_KEY="last404_wallet";

  const valid=a=>/^0x[a-fA-F0-9]{40}$/.test(a||"");
  const checksum=a=>a.slice(0,8)+"…"+a.slice(-6);

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

  function setStatus(text,eligible=false){
    eligibilityEl.textContent=text;
    eligibilityEl.classList.toggle("eligible",eligible);
  }

  function showError(msg){
    error.hidden=false;
    error.textContent=msg;
  }

  async function rpc(method,params){
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),10000);
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
    }finally{ clearTimeout(timer); }
  }

  function balanceCall(wallet){
    return "0x70a08231"+wallet.slice(2).toLowerCase().padStart(64,"0");
  }

  async function check(){
    error.hidden=true;
    button.disabled=true;
    button.textContent="RECOVER NFT";

    const wallet=getWallet();
    if(!wallet){
      walletEl.textContent="NOT CONNECTED";
      balanceEl.textContent="—";
      setStatus("CONNECT WALLET FIRST");
      return;
    }

    walletEl.textContent=checksum(wallet);
    setStatus("CHECKING…");

    try{
      const chain=await rpc("eth_chainId",[]);
      if(Number(BigInt(chain))!==4663) throw new Error("Robinhood Chain Mainnet RPC unavailable.");

      const decimalsHex=await rpc("eth_call",[
        {to:TL404,data:"0x313ce567"},"latest"
      ]);
      const decimals=Number(BigInt(decimalsHex));

      const raw=await rpc("eth_call",[
        {to:TL404,data:balanceCall(wallet)},"latest"
      ]);
      const balance=BigInt(raw);
      const divisor=10n**BigInt(decimals);
      const required=MINIMUM*divisor;

      balanceEl.textContent=ethers.formatUnits(balance,decimals)+" TL404";

      if(balance>=required){
        setStatus("READY TO RECOVER",true);
        button.disabled=false;
      }else{
        setStatus("NOT ELIGIBLE");
        button.disabled=true;
      }
    }catch(e){
      console.error(e);
      balanceEl.textContent="—";
      setStatus("CHECK FAILED");
      showError("Could not check TL404. Please refresh and try again.");
    }
  }

  button.addEventListener("click",async()=>{
    const wallet=getWallet();
    if(!wallet){ showError("Connect your wallet first."); return; }

    button.disabled=true;
    button.textContent="RECOVERING…";
    error.hidden=true;

    try{
      const base=(CONFIG.SUPABASE_URL||"").replace(/\/$/,"");
      const anon=CONFIG.SUPABASE_ANON_KEY||"";
      if(!base) throw new Error("Claim service is not configured.");

      const r=await fetch(base+"/functions/v1/claim-nft",{
        method:"POST",
        headers:{
          "Content-Type":"application/json",
          ...(anon?{"apikey":anon,"Authorization":"Bearer "+anon}:{})
        },
        body:JSON.stringify({wallet})
      });

      const text=await r.text();
      let data={}; try{data=JSON.parse(text)}catch(_){}
      if(!r.ok||!data.success) throw new Error(data.error||("Claim service returned HTTP "+r.status));

      success.hidden=false;
      successText.textContent="NFT #"+String(data.tokenId).padStart(3,"0")+" has been transferred to your wallet. Transaction: "+data.txHash;
      button.textContent="RECOVERED";
    }catch(e){
      console.error(e);
      showError(e && e.message ? e.message : "Claim service is unavailable. Please try again.");
      button.disabled=false;
      button.textContent="RECOVER NFT";
    }
  });

  window.addEventListener("last404:walletChanged",e=>{
    const a=e.detail&&e.detail.address;
    if(a) localStorage.setItem(STORAGE_KEY,a);
    else localStorage.removeItem(STORAGE_KEY);
    check();
  });
  window.addEventListener("storage",e=>{if(e.key===STORAGE_KEY)check();});
  window.addEventListener("load",check);
  check();
})();