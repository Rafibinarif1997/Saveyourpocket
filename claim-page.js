
(function(){
  const TL404="0x316eC28D4e69Adf4697F0cA7DE45c164C295eC9d";
  const CLAIM_FUNCTION="/functions/v1/claim-nft";
  const MINIMUM=200000n;

  const walletEl=document.getElementById("claimWallet");
  const balanceEl=document.getElementById("claimBalance");
  const eligibilityEl=document.getElementById("claimEligibility");
  const button=document.getElementById("claimButton");
  const success=document.getElementById("claimSuccess");
  const successText=document.getElementById("claimSuccessText");
  const error=document.getElementById("claimError");

  function showError(msg){
    error.hidden=false; error.textContent=msg;
  }

  async function check(){
    const wallet=localStorage.getItem("last404_wallet");
    if(!wallet){
      walletEl.textContent="NOT CONNECTED";
      eligibilityEl.textContent="CONNECT WALLET FIRST";
      button.disabled=true;
      return;
    }
    walletEl.textContent=wallet.slice(0,8)+"…"+wallet.slice(-6);
    try{
      const provider=new ethers.BrowserProvider(window.ethereum);
      const signer=await provider.getSigner();
      const address=await signer.getAddress();
      const abi=["function balanceOf(address) view returns (uint256)","function decimals() view returns (uint8)"];
      const token=new ethers.Contract(TL404,abi,provider);
      const decimals=await token.decimals();
      const balance=await token.balanceOf(address);
      const formatted=ethers.formatUnits(balance,decimals);
      balanceEl.textContent=Number(formatted).toLocaleString()+" TL404";
      if(balance >= ethers.parseUnits(MINIMUM.toString(),decimals)){
        eligibilityEl.textContent="ELIGIBLE";
        eligibilityEl.classList.add("eligible");
        button.disabled=false;
      }else{
        eligibilityEl.textContent="NOT ELIGIBLE";
        button.disabled=true;
      }
    }catch(e){
      console.error(e);
      eligibilityEl.textContent="CHECK FAILED";
      showError("Could not read your wallet. Please reconnect and try again.");
    }
  }

  button.addEventListener("click",async()=>{
    const wallet=localStorage.getItem("last404_wallet");
    if(!wallet) return;
    button.disabled=true; button.textContent="RECOVERING...";
    error.hidden=true;
    try{
      const r=await fetch(CLAIM_FUNCTION,{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({wallet})
      });
      const data=await r.json();
      if(!r.ok || !data.success) throw new Error(data.error || "Claim failed.");
      success.hidden=false;
      successText.textContent="NFT #"+String(data.tokenId).padStart(3,"0")+" has been transferred to your wallet. Transaction: "+data.txHash;
      button.textContent="RECOVERED";
    }catch(e){
      console.error(e);
      showError(e.message || "Claim failed. Please try again.");
      button.disabled=false; button.textContent="RECOVER NFT";
    }
  });

  window.addEventListener("load",check);
})();
