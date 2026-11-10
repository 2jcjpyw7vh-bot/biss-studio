import "./globals.css";
export const metadata={title:"BISS Studio",description:"מערכת אימונים, תרגילים, תוכניות ושיעורי בית ל-BISS"};
export default function RootLayout({children}) {
  return <html lang="he" dir="rtl">
    <body>
      {children}
      <footer className="footer small" aria-label="זכויות יוצרים וקניין רוחני" style={{padding:"16px 12px 24px"}}>
        <div>© {new Date().getFullYear()} ב.י.ס.ס אחזקות בע״מ · ח״פ <bdi>516122702</bdi> · כל הזכויות שמורות.</div>
        <div>אין להעתיק, להפיץ או לעשות שימוש מסחרי בתכנים שבבעלות החברה ללא אישור מראש, למעט כפי שמותר על פי דין.</div>
      </footer>
    </body>
  </html>;
}
