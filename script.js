const CONFIG=window.LAST404_CONFIG||{SUPABASE_URL:"",SUPABASE_ANON_KEY:"",DEMO_MODE:true};

const menuBtn=document.getElementById("menuBtn");
const menu=document.getElementById("menu");

function closeMenu(){
  menu.classList.remove("open");
  menuBtn.setAttribute("aria-expanded","false");
  menu.setAttribute("aria-hidden","true");
}
menuBtn.addEventListener("click",()=>{
  const open=!menu.classList.contains("open");
  menu.classList.toggle("open",open);
  menuBtn.setAttribute("aria-expanded",String(open));
  menu.setAttribute("aria-hidden",String(!open));
});
menu.querySelectorAll("a").forEach(a=>a.addEventListener("click",closeMenu));
document.addEventListener("click",e=>{
  if(window.innerWidth<=850 && menu.classList.contains("open") && !menu.contains(e.target) && !menuBtn.contains(e.target)) closeMenu();
});
window.addEventListener("resize",()=>{if(window.innerWidth>850) closeMenu();});

const form=document.getElementById("wlForm");
const success=document.getElementById("success");

function validWallet(v){return /^0x[a-fA-F0-9]{40}$/.test(v)}

form.addEventListener("submit",async e=>{
  e.preventDefault();
  const x=document.getElementById("xUsername").value.trim().replace(/^@/,"");
  const wallet=document.getElementById("wallet").value.trim();

  if(!x){alert("Please enter your X / Twitter username.");return}
  if(!validWallet(wallet)){alert("Please enter a valid EVM wallet address.");return}

  if(window.supabase && CONFIG.SUPABASE_URL && CONFIG.SUPABASE_ANON_KEY && !CONFIG.DEMO_MODE){
    try{
      const client=window.supabase.createClient(CONFIG.SUPABASE_URL,CONFIG.SUPABASE_ANON_KEY);
      const {error}=await client.from("whitelist_entries").insert({
        x_username:x,wallet_address:wallet
      });
      if(error){
        if(error.code==="23505"){alert("This wallet address has already been submitted.");return}
        console.error(error);alert("Submission failed. Please try again.");return
      }
    }catch(err){console.error(err);alert("Could not connect to the whitelist database.");return}
  }

  form.hidden=true;
  success.hidden=false;
});
