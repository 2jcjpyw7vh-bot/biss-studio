import "./globals.css";
import StudioSession from "./StudioSession";
import StudioAccountBar from "./StudioAccountBar";
export const metadata={metadataBase:new URL(process.env.NEXT_PUBLIC_SITE_URL||"https://biss-studio.vercel.app"),openGraph:{siteName:"BISS Studio",title:"BISS Studio",description:"אימונים, קהילה וחיבור ב־BISS",images:[{url:"/api/share-image",width:1200,height:630,alt:"BISS Studio"}]},title:"BISS Studio",description:"מערכת אימונים, תרגילים, תוכניות ושיעורי בית ל-BISS"};
export default function RootLayout({children}) {
  return <html lang="he" dir="rtl">
    <body>
      <StudioSession>
      <StudioAccountBar/>
      {children}
      <footer className="footer small" aria-label="זכויות יוצרים וקניין רוחני" style={{padding:"16px 12px 24px"}}>
        <div>© {new Date().getFullYear()} ב.י.ס.ס אחזקות בע״מ · ח״פ <bdi>516122702</bdi> · כל הזכויות שמורות.</div>
        <div>אין להעתיק, להפיץ או לעשות שימוש מסחרי בתכנים שבבעלות החברה ללא אישור מראש, למעט כפי שמותר על פי דין.</div>
      </footer>
      </StudioSession>
    </body>
  </html>;
}
