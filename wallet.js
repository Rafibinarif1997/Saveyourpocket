(function(){
  const btn=document.getElementById("connectWalletBtn");
  const modal=document.getElementById("walletModal");
  const options=document.getElementById("walletOptions");
  const close=document.getElementById("walletModalClose");
  if(!btn || !modal || !options) return;

  const STORAGE_KEY="last404_wallet";
  const NAME_KEY="last404_wallet_name";
  let providers=[];
  const seen=new Set();

  function short(a){ return a.slice(0,6)+"…"+a.slice(-4); }
  function valid(a){ return /^0x[a-fA-F0-9]{40}$/.test(a||""); }

  function setWallet(address,name){
    if(!valid(address)) return;
    localStorage.setItem(STORAGE_KEY,address);
    if(name) localStorage.setItem(NAME_KEY,name);
    btn.textContent=short(address);
    btn.classList.add("connected");
    window.dispatchEvent(new CustomEvent("last404:walletChanged",{detail:{address}}));
  }

  function clearWallet(){
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(NAME_KEY);
    btn.textContent="CONNECT WALLET";
    btn.classList.remove("connected");
    window.dispatchEvent(new CustomEvent("last404:walletChanged",{detail:{address:null}}));
  }

  function openModal(){
    modal.classList.add("open");
    modal.setAttribute("aria-hidden","false");
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
      options.insertAdjacentHTML("beforeend",
        '<div class="wallet-error">'+msg.replace(/[<>&]/g,'')+'</div>');
    }
  }

  function addWallet(info,provider){
    const id=info && info.info && (info.info.uuid || info.info.rdns || info.info.name);
    if(!provider || !id || seen.has(id)) return;
    seen.add(id);
    providers.push({info,provider});
  }

  function render(){
    options.innerHTML="";
    if(!providers.length){
      options.innerHTML='<div class="wallet-empty">No EVM wallet was detected. Install MetaMask, Zerion, or another EVM wallet and reload this page.</div>';
      return;
    }
    providers.forEach(({info,provider})=>{
      const name=(info.info && info.info.name) || "EVM Wallet";
      const icon=(info.info && info.info.icon) || "";
      const row=document.createElement("button");
      row.type="button";
      row.className="wallet-option";
      row.innerHTML=(icon?'<img src="'+icon+'" alt="">':'<span class="wallet-fallback">◈</span>')+
        '<span>'+name+'</span><i>↗</i>';
      row.addEventListener("click",()=>connect(provider,name));
      options.appendChild(row);
    });
  }

  function discover(){
    providers=[]; seen.clear();
    options.innerHTML='<div class="wallet-loading">SEARCHING FOR EVM WALLETS...</div>';

    window.addEventListener("eip6963:announceProvider", e=>{
      addWallet(e.detail,e.detail.provider);
      render();
    });

    window.dispatchEvent(new Event("eip6963:requestProvider"));

    setTimeout(()=>{
      if(window.ethereum){
        const name=window.ethereum.isMetaMask?"MetaMask":
          (window.ethereum.isZerion?"Zerion":"Browser Wallet");
        addWallet({info:{uuid:"legacy-"+name,name,icon:""}},window.ethereum);
      }
      render();
    },700);
  }

  btn.addEventListener("click",openModal);
  close?.addEventListener("click",closeModal);
  modal.querySelector("[data-close-wallet]")?.addEventListener("click",closeModal);

  // Sync current provider account if available.
  function attachProvider(p){
    if(!p?.on) return;
    p.on("accountsChanged",accounts=>{
      if(accounts?.[0]) setWallet(accounts[0]);
      else clearWallet();
    });
  }
  attachProvider(window.ethereum);

  window.addEventListener("eip6963:announceProvider",e=>{
    attachProvider(e.detail?.provider);
  });

  const saved=localStorage.getItem(STORAGE_KEY);
  if(valid(saved)){
    btn.textContent=short(saved);
    btn.classList.add("connected");
  }
})();
