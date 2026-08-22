
(function(){
  const btn=document.getElementById("connectWalletBtn");
  const modal=document.getElementById("walletModal");
  const options=document.getElementById("walletOptions");
  const close=document.getElementById("walletModalClose");
  if(!btn || !modal) return;

  let providers=[];
  const seen=new Set();

  function short(a){ return a.slice(0,6)+"…"+a.slice(-4); }

  function openModal(){
    modal.classList.add("open");
    modal.setAttribute("aria-hidden","false");
    discover();
  }
  function closeModal(){
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden","true");
  }

  async function connect(provider, name){
    try{
      const accounts=await provider.request({method:"eth_requestAccounts"});
      if(!accounts || !accounts[0]) throw new Error("No account returned");
      const address=accounts[0];
      localStorage.setItem("last404_wallet", address);
      localStorage.setItem("last404_wallet_name", name);
      btn.textContent=short(address);
      btn.classList.add("connected");
      closeModal();
    }catch(e){
      console.error(e);
      const msg=e && e.message ? e.message : "Wallet connection failed.";
      options.insertAdjacentHTML("beforeend", '<div class="wallet-error">'+msg.replace(/[<>&]/g,'')+'</div>');
    }
  }

  function addWallet(info, provider){
    const id=info && info.info && (info.info.uuid || info.info.rdns || info.info.name);
    if(!id || seen.has(id)) return;
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
      addWallet(e.detail, e.detail.provider);
      render();
    }, {once:false});
    window.dispatchEvent(new Event("eip6963:requestProvider"));

    setTimeout(()=>{
      if(window.ethereum){
        const name=(window.ethereum.isMetaMask?"MetaMask":
          window.ethereum.isZerion?"Zerion":"Browser Wallet");
        addWallet({info:{uuid:"legacy-"+name,name:name,icon:""}},window.ethereum);
      }
      render();
    },350);
  }

  btn.addEventListener("click",openModal);
  close.addEventListener("click",closeModal);
  modal.querySelector("[data-close-wallet]").addEventListener("click",closeModal);

  const saved=localStorage.getItem("last404_wallet");
  if(saved) { btn.textContent=short(saved); btn.classList.add("connected"); }
})();
