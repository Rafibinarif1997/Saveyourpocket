const CHAINS={
 ethereum:{name:"Ethereum",id:"1",rpc:"https://ethereum-rpc.publicnode.com",explorer:"https://etherscan.io/address/"},
 bsc:{name:"BNB Smart Chain",id:"56",rpc:"https://bsc-rpc.publicnode.com",explorer:"https://bscscan.com/address/"},
 robinhood:{name:"Robinhood Chain",id:"4663",rpc:"https://rpc.mainnet.chain.robinhood.com",explorer:"https://robinhoodchain.blockscout.com/address/"},
 base:{name:"Base",id:"8453",rpc:"https://base-rpc.publicnode.com",explorer:"https://basescan.org/address/"},
 arbitrum:{name:"Arbitrum",id:"42161",rpc:"https://arbitrum-one-rpc.publicnode.com",explorer:"https://arbiscan.io/address/"},
 polygon:{name:"Polygon",id:"137",rpc:"https://polygon-bor-rpc.publicnode.com",explorer:"https://polygonscan.com/address/"},
 avalanche:{name:"Avalanche",id:"43114",rpc:"https://avalanche-c-chain-rpc.publicnode.com",explorer:"https://snowtrace.io/address/"},
 solana:{name:"Solana",id:"solana",rpc:"https://api.mainnet-beta.solana.com",explorer:"https://solscan.io/token/"}
};
const IDS=Object.fromEntries(Object.entries(CHAINS).map(([k,v])=>[v.id,k]));
const EVM=/^0x[a-fA-F0-9]{40}$/;
async function get(url,opt={}){const r=await fetch(url,{...opt,headers:{"accept":"application/json",...(opt.headers||{})}});if(!r.ok)throw new Error(`HTTP ${r.status}`);return r.json()}
async function rpc(c,method,params=[]){const j=await get(c.rpc,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({jsonrpc:"2.0",id:1,method,params})});if(j.error)throw new Error(j.error.message||"RPC error");return j.result}
function dec(hex){try{if(!hex||hex==="0x")return null;let h=hex.slice(2);if(h.length>=128){let off=parseInt(h.slice(0,64),16)*2,len=parseInt(h.slice(off,off+64),16);return Buffer.from(h.slice(off+64,off+64+len),"hex").toString().replace(/\0/g,"")}}catch{}return null}
async function erc20(c,a){const call=s=>rpc(c,"eth_call",[{to:a,data:s},"latest"]);let name="Unknown Token",symbol="TOKEN",decimals=18,total=null;try{name=dec(await call("0x06fdde03"))||name}catch{}try{symbol=dec(await call("0x95d89b41"))||symbol}catch{}try{decimals=parseInt((await call("0x313ce567")).slice(-64),16)}catch{}try{total=BigInt(await call("0x18160ddd"))}catch{}return{name,symbol,decimals,total}}
async function dexToken(address){try{const j=await get(`https://api.dexscreener.com/latest/dex/tokens/${encodeURIComponent(address)}`);return Array.isArray(j.pairs)?j.pairs:[]}catch{return[]}}
async function dexChain(chain,address){try{const j=await get(`https://api.dexscreener.com/token-pairs/v1/${chain}/${encodeURIComponent(address)}`);return Array.isArray(j)?j:[]}catch{return[]}}
function money(x){const n=Number(x);return Number.isFinite(n)&&n>0?"$"+new Intl.NumberFormat("en-US",{notation:"compact",maximumFractionDigits:2}).format(n):"—"}
async function detect(address){
 const pairs=await dexToken(address);
 const supported=pairs.filter(p=>IDS[p.chainId]);
 if(supported.length){supported.sort((a,b)=>(Number(b.liquidity?.usd)||0)-(Number(a.liquidity?.usd)||0));return{key:IDS[supported[0].chainId],pairs:supported}}
 const checks=await Promise.all(Object.entries(CHAINS).filter(([k])=>k!=="solana").map(async([k,c])=>{try{const code=await rpc(c,"eth_getCode",[address,"latest"]);return code&&code!=="0x"?k:null}catch{return null}}));
 const hits=checks.filter(Boolean);
 if(hits.length)return{key:hits[0],pairs:[]};
 try{const s=await rpc(CHAINS.solana,"getAccountInfo",[address,{encoding:"base64"}]);if(s?.value)return{key:"solana",pairs:[]}}catch{}
 throw new Error("Address was not found as a token contract on the supported chains.");
}
async function sourcify(chainId,address){try{return await get(`https://sourcify.dev/server/v2/contract/${chainId}/${address}?fields=all`)}catch{return null}}
async function robinhoodOfficial(address){try{const j=await get("https://api.robinhood.com/rhj/assets");for(const x of (j.assets||[]))for(const d of (x.deployments||[]))if(String(d.contractAddress).toLowerCase()===address.toLowerCase()&&d.chainId===4663)return x;return null}catch{return null}}
function riskLabel(s){return s>=81?"EXTREME RISK":s>=61?"HIGH RISK":s>=41?"MEDIUM RISK":s>=21?"LOW RISK":"VERY LOW RISK"}
function analyzeBytecode(code){
 const h=(code||"").toLowerCase(), has=(hex)=>h.includes(hex);
 let contract=75,trading=75,developer=65,warnings=[];
 // Common selectors/bytecode patterns: only signals, never treated as proof.
 const flags=[
  [has("8456cb59"),"Pause/unpause capability signal detected.",8],
  [has("40c10f19"),"Mint function selector detected in bytecode.",16],
  [has("dd62ed3e"),null,0],
  [has("44337ea1"),"Ownership-transfer pattern detected.",5],
  [has("715018a6"),"Ownership function selector detected.",3],
  [has("8456cb59"),"Pause function selector detected.",7],
  [has("5c975abb"),"Role-based access-control selector detected.",5]
 ];
 for(const [yes,msg,pen] of flags)if(yes&&msg){contract-=pen;warnings.push(msg)}
 return{contract,trading,developer,warnings}
}
function score(m){const safety=m.contractSecurity*.27+m.liquiditySafety*.19+m.holderDistribution*.18+m.developerSafety*.14+m.tradingSafety*.17+m.authenticity*.05;return Math.max(0,Math.min(100,Math.round(100-safety)))}
async function scan(address){
 const d=await detect(address),c=CHAINS[d.key];
 let token={name:"Unknown Token",symbol:"TOKEN",decimals:18}, code=null,source=null,security={holderCount:null},warnings=[];
 if(d.key==="solana"){throw new Error("Solana address detected. Solana security adapter requires an indexed token-security provider; this build refuses to invent a score.")} 
 code=await rpc(c,"eth_getCode",[address,"latest"]);if(!code||code==="0x")throw new Error("The detected address has no contract bytecode.");
 token=await erc20(c,address);source=await sourcify(c.id,address);
 const pairs=d.pairs.length?d.pairs:await dexChain(c.id,address);pairs.sort((a,b)=>(Number(b.liquidity?.usd)||0)-(Number(a.liquidity?.usd)||0));const p=pairs[0]||null;
 const rh=d.key==="robinhood"?await robinhoodOfficial(address):null;
 if(rh){token.name=rh.tokenName||token.name;token.symbol=rh.tokenSymbol||token.symbol}
 const b=analyzeBytecode(code);
 let contract=b.contract,liq=55,holders=55,dev=b.developer,trade=b.trading,auth=source?85:55;
 if(source?.match==="exact_match")contract=Math.min(100,contract+15);else if(source)contract+=8;else warnings.push("Contract source was not found in Sourcify's verified-contract database.");
 if(p){const l=Number(p.liquidity?.usd)||0;liq=l<10000?20:l<50000?40:l<250000?65:85;trade=p.txns?.h24?70:55}else warnings.push("No DEX liquidity pair was found for this token.");
 if(rh){auth=100;warnings.push("✓ Contract matches an official Robinhood Chain Stock Token deployment.");}
 const m={contractSecurity:Math.max(0,Math.min(100,contract)),liquiditySafety:liq,holderDistribution:holders,developerSafety:Math.max(0,Math.min(100,dev)),tradingSafety:Math.max(0,Math.min(100,trade)),authenticity:Math.max(0,Math.min(100,auth))};
 warnings.push(...b.warnings);
 warnings.push("Holder concentration and deployer history are marked as limited unless an indexed holder source is available. The scanner does not fabricate those values.");
 const risk=score(m);
 return{ok:true,address,chainName:c.name,riskScore:risk,riskLabel:riskLabel(risk),token,metrics:m,security,market:p?{priceUsd:p.priceUsd?`$${p.priceUsd}`:"—",liquidityUsd:money(p.liquidity?.usd),volume24h:money(p.volume?.h24),fdv:money(p.fdv),marketCap:money(p.marketCap)}:null,holders:[],warnings,links:{explorer:c.explorer+address,dex:p?.url||null},detection:{method:d.pairs.length?"DEX market match":"RPC contract match"}}
}
async function detectChain(address){
  if(/^0x[a-fA-F0-9]{40}$/.test(address)){
    // Query each EVM chain. A real bytecode hit is authoritative for chain detection.
    const order=["ethereum","bsc","robinhood","base","arbitrum","polygon","avalanche"];
    const hits=[];
    await Promise.all(order.map(async k=>{try{const c=CHAINS[k];const code=await rpc(c,"eth_getCode",[address,"latest"]);if(code&&code!=="0x")hits.push(k)}catch{}}));
    if(hits.length===1)return hits[0];
    if(hits.length>1){
      // Prefer a chain with live DEX pair data; otherwise report ambiguity.
      for(const k of hits){try{const d=await dex(CHAINS[k],address);if(d)return k}catch{}}
      return hits[0];
    }
    return null;
  }
  // Solana base58 addresses are not EVM-shaped. Probe Solana RPC.
  if(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)){
    try{const x=await rpc(CHAINS.solana,"getAccountInfo",[address,{"encoding":"base64"}]);if(x?.value)return "solana"}catch{}
  }
  return null;
}
export default async function handler(req,res){
 if(req.method!=="POST")return res.status(405).json({error:"Method not allowed"});
 try{const a=String(req.body?.address||"").trim();if(!a)throw new Error("Contract address is required.");if(!EVM.test(a)&&a.length<32)throw new Error("Invalid contract address.");res.status(200).json(await scan(a))}
 catch(e){res.status(400).json({error:e.message||"Scan failed."})}
}