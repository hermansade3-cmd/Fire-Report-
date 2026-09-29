/* Cloudflare Worker: inatafuta wavuni na kurudisha JSON kwa Incident Search */
const ORIGIN='https://hermansade3-cmd.github.io';
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const strip=s=>s.replace(/<[^>]+>/g,'').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#0?39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&nbsp;/g,' ').replace(/&#(\d+);/g,(m,n)=>String.fromCharCode(+n)).replace(/\s+/g,' ').trim();
const host=l=>{try{return new URL(l).hostname.replace(/^www\./,'')}catch(e){return''}};
function dec(l){
  try{const u=new URL(l);
    if(u.hostname.endsWith('bing.com')&&u.pathname.startsWith('/ck/a')){
      let p=u.searchParams.get('u');
      if(p&&p.startsWith('a1')){p=p.slice(2).replace(/-/g,'+').replace(/_/g,'/');while(p.length%4)p+='=';return atob(p)}
    }}catch(e){}
  return l;
}
async function brave(q,off,key){
  const r=await fetch('https://api.search.brave.com/res/v1/web/search?q='+encodeURIComponent(q)+'&count=10&offset='+Math.floor(off/10),{headers:{'accept':'application/json','x-subscription-token':key}});
  if(!r.ok)throw new Error('brave '+r.status);
  const d=await r.json();
  return((d.web&&d.web.results)||[]).map(p=>({title:strip(p.title||''),link:p.url,displayLink:(p.meta_url&&p.meta_url.hostname||host(p.url)).replace(/^www\./,''),snippet:strip(p.description||''),img:(p.thumbnail&&p.thumbnail.src)||''})).filter(x=>x.title&&/^https?:/.test(x.link));
}
async function bing(q,off){
  const r=await fetch('https://www.bing.com/search?q='+encodeURIComponent(q)+'&count=10&first='+(off+1)+'&setlang=sw&cc=TZ',{headers:{'user-agent':UA,'accept-language':'sw,en;q=0.8'}});
  const t=await r.text();
  return t.split('<li class="b_algo"').slice(1).map(c=>{
    const m=c.match(/<h2[^>]*>\s*<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/);if(!m)return null;
    const link=dec(m[1].replace(/&amp;/g,'&')),sm=c.match(/<p[^>]*>([\s\S]*?)<\/p>/);
    return{title:strip(m[2]),link,displayLink:host(link),snippet:sm?strip(sm[1]):''};
  }).filter(x=>x&&/^https?:/.test(x.link)&&x.title);
}
async function ddg(q,off){
  const r=await fetch('https://html.duckduckgo.com/html/?q='+encodeURIComponent(q)+'&s='+off,{headers:{'user-agent':UA,'accept-language':'sw,en;q=0.8'}});
  const t=await r.text(),out=[],re=/<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;let m;
  while((m=re.exec(t))){
    let link=m[1].replace(/&amp;/g,'&');
    try{const u=new URL(link.startsWith('//')?'https:'+link:link);link=u.searchParams.get('uddg')||link}catch(e){}
    if(/^https?:/.test(link)&&!/duckduckgo\.com\/y\.js/.test(link))out.push({title:strip(m[2]),link,displayLink:host(link),snippet:strip(m[3])});
  }
  return out;
}
export default{
  async fetch(req,env){
    const u=new URL(req.url),q=(u.searchParams.get('q')||'').trim().slice(0,200),off=Math.min(90,parseInt(u.searchParams.get('off')||'0',10)||0);
    const H={'access-control-allow-origin':ORIGIN,'content-type':'application/json; charset=utf-8','cache-control':'public, max-age=3600'};
    if(u.searchParams.get('debug')){
      const r=await fetch('https://www.bing.com/search?q=soda&count=10&setlang=sw&cc=TZ',{headers:{'user-agent':UA,'accept-language':'sw,en;q=0.8'}});
      const t=await r.text();
      return new Response(JSON.stringify({status:r.status,length:t.length,results:t.split('<li class="b_algo"').length-1,head:t.slice(0,300)},null,1),{headers:H});
    }
    if(!q)return new Response('{"items":[]}',{headers:H});
    let items=[];
    if(env&&env.BRAVE_KEY){try{items=await brave(q,off,env.BRAVE_KEY)}catch(e){}}
    if(!items.length){try{items=await bing(q,off)}catch(e){}}
    if(!items.length){try{items=await ddg(q,off)}catch(e){}}
    return new Response(JSON.stringify({items}),{headers:H});
  }
};
