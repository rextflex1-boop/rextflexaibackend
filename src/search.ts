function cut(s:string,n=400){return s.length>n?s.slice(0,n)+'…':s}
export async function webSearch(query:string){
 if(process.env.TAVILY_API_KEY){const r=await fetch('https://api.tavily.com/search',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({api_key:process.env.TAVILY_API_KEY,query,max_results:5,search_depth:'basic'})});if(!r.ok)throw new Error(`Tavily failed: ${r.status}`);const d:any=await r.json();return (d.results||[]).filter((x:any)=>x.url).map((x:any)=>({title:x.title||x.url,url:x.url,snippet:cut(x.content||'')}));}
 const r=await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,{headers:{'User-Agent':'Mozilla/5.0'}});
 const h=await r.text(), out:any[]=[];const re=/<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;let m;while((m=re.exec(h))&&out.length<5){out.push({title:m[2].replace(/<[^>]+>/g,''),url:m[1],snippet:cut(m[3].replace(/<[^>]+>/g,''))})}return out;
}
