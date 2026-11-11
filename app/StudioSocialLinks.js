const profiles = [
  {name:"Facebook", url:process.env.NEXT_PUBLIC_BISS_FACEBOOK_URL || "https://www.facebook.com/biss.vibes/", domain:"facebook.com"},
  {name:"Instagram", url:process.env.NEXT_PUBLIC_BISS_INSTAGRAM_URL || "https://www.instagram.com/biss.vibes/", domain:"instagram.com"}
];

function profileUrl(value, domain) {
  try {
    const url = new URL(value);
    const hostname = url.hostname.replace(/^www\./,"");
    return url.protocol==="https:" && hostname===domain && url.pathname!=="/" ? url.href : "";
  } catch {
    return "";
  }
}

export default function StudioSocialLinks() {
  const links = profiles.map(({name,url,domain})=>({name,href:profileUrl(url,domain)})).filter(link=>link.href);
  if(!links.length)return null;

  return <nav className="row between" aria-label="BISS Studio ברשתות החברתיות" style={{marginBlock:"18px",paddingBlock:"12px",borderTop:"1px solid var(--line)"}}>
    <strong>בואו להכיר את BISS Studio</strong>
    <div className="row">
      {links.map(({name,href})=><a key={name} className="btn" href={href} target="_blank" rel="noopener noreferrer">{name}</a>)}
    </div>
  </nav>;
}
