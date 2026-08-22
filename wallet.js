(function(){
  const STORAGE_KEY="last404_wallet";
  const NAME_KEY="last404_wallet_name";

  const btn=document.getElementById("connectWalletBtn");
  const modal=document.getElementById("walletModal");
  const options=document.getElementById("walletOptions");
  const close=document.getElementById("walletModalClose");

  if(!btn || !modal || !options) return;

  let providers=[];
  const seen=new Set();

  const valid=a=>/^0x[a-fA-F0-9]{40}$/.test(a||"");
  const short=a=>a.slice(0,6)+"…"+a.slice(-4);

  function savedWallet(){
    const a=localStorage.getItem(STORAGE_KEY);
    return valid(a)?a:null;
  }

  function setWallet(address,name){
    if(!valid(address)) return;
    localStorage.setItem(STORAGE_KEY,address);
    if(name) localStorage.setItem(NAME_KEY,name);
    updateButton();
    window.dispatchEvent(new CustomEvent("last404:walletChanged",{detail:{address}}));
  }

  function disconnect(){
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(NAME_KEY);
    updateButton();
    window.dispatchEvent(new CustomEvent("last404:walletChanged",{detail:{address:null}}));
    render();
  }

  function updateButton(){
    const a=savedWallet();
    if(a){
      btn.textContent=short(a);
      btn.classList.add("connected");
      btn.title="Wallet connected — click to manage";
    }else{
      btn.textContent="CONNECT WALLET";
      btn.classList.remove("connected");
      btn.title="Connect wallet";
    }
  }

  function openModal(){
    modal.classList.add("open");
    modal.setAttribute("aria-hidden","false");
    render();
    discover();
  }

  function closeModal(){
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden","true");
  }

  async function connect(provider,name){
    try{
      const accounts=await provider.request({method:"eth_requestAccounts"});
      if(!accounts || !accounts[0]) throw new Error("No account returned");
      setWallet(accounts[0],name);
      closeModal();
    }catch(e){
      console.error(e);
      const msg=e && e.message ? e.message : "Wallet connection failed.";
      const safe=msg.replace(/[<>&]/g,"");
      options.insertAdjacentHTML("beforeend",'<div class="wallet-error">'+safe+'</div>');
    }
  }

  function addWallet(info,provider){
    if(!provider) return;
    const meta=info && info.info ? info.info : {};
    const id=meta.uuid || meta.rdns || meta.name || ("provider-"+providers.length);
    if(seen.has(id)) return;
    seen.add(id);
    providers.push({
      provider,
      name:meta.name || (provider.isMetaMask?"MetaMask":"EVM Wallet"),
      icon:meta.icon || ""
    });
  }

  function render(){
    options.innerHTML="";
    const current=savedWallet();

    if(current){
      const box=document.createElement("div");
      box.className="wallet-current";
      box.innerHTML=
        '<div class="wallet-current-label">CONNECTED WALLET</div>'+
        '<div class="wallet-current-address">'+short(current)+'</div>'+
        '<button type="button" class="wallet-option wallet-disconnect">DISCONNECT WALLET</button>';
      box.querySelector(".wallet-disconnect").addEventListener("click",()=>{
        disconnect();
        closeModal();
      });
      options.appendChild(box);

      const change=document.createElement("button");
      change.type="button";
      change.className="wallet-option";
      change.innerHTML='<span class="wallet-fallback">↻</span><span>CHANGE WALLET</span><i>↗</i>';
      change.addEventListener("click",()=>{
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(NAME_KEY);
        updateButton();
        render();
        discover();
      });
      options.appendChild(change);
      return;
    }

    if(!providers.length){
      options.innerHTML='<div class="wallet-loading">SEARCHING FOR EVM WALLETS...</div>';
      return;
    }

    providers.forEach(({provider,name,icon})=>{
      const row=document.createElement("button");
      row.type="button";
      row.className="wallet-option";
      const img=icon?'<img src="'+String(icon).replace(/"/g,"&quot;")+'" alt="">':'<span class="wallet-fallback">◈</span>';
      row.innerHTML=img+'<span>'+String(name).replace(/[<>&]/g,"")+'</span><i>↗</i>';
      row.addEventListener("click",()=>connect(provider,name));
      options.appendChild(row);
    });
  }

  let discoveryBound=false;
  function discover(){
    if(!discoveryBound){
      window.addEventListener("eip6963:announceProvider",e=>{
        addWallet(e.detail,e.detail && e.detail.provider);
        if(!savedWallet()) render();
        attachProvider(e.detail && e.detail.provider);
      });
      discoveryBound=true;
    }

    window.dispatchEvent(new Event("eip6963:requestProvider"));

    if(window.ethereum){
      const name=window.ethereum.isMetaMask?"MetaMask":
        (window.ethereum.isZerion?"Zerion":
        (window.ethereum.isBitKeep?"Bitget":"Browser Wallet"));
      addWallet({info:{uuid:"legacy-"+name,name,icon:""}},window.ethereum);
      attachProvider(window.ethereum);
    }

    setTimeout(()=>{ if(!savedWallet()) render(); },500);
  }

  function attachProvider(p){
    if(!p || typeof p.on!=="function" || p.__last404Attached) return;
    p.__last404Attached=true;
    p.on("accountsChanged",accounts=>{
      if(accounts && accounts[0]){
        const current=savedWallet();
        // Only follow the provider that currently owns the connected session.
        if(current) setWallet(accounts[0]);
      }else{
        disconnect();
      }
    });
  }

  btn.addEventListener("click",openModal);
  if(close) close.addEventListener("click",closeModal);
  modal.querySelector("[data-close-wallet]")?.addEventListener("click",closeModal);

  updateButton();
  discover();

  window.addEventListener("storage",e=>{
    if(e.key===STORAGE_KEY) updateButton();
  });
})();