export default function PrivacyPage() {
  return (
    <main style={{ maxWidth: 680, margin: '0 auto', padding: '80px 24px 120px', fontFamily: 'var(--font-sans), sans-serif', color: '#2C3528', lineHeight: 1.75 }}>
      <h1 style={{ fontFamily: 'var(--font-serif), Georgia, serif', fontSize: 36, fontWeight: 700, marginBottom: 8 }}>Privacy Policy</h1>
      <p style={{ fontSize: 14, color: '#6B7566', marginBottom: 48 }}>Last updated: April 2026</p>

      <p style={{ fontSize: 16, marginBottom: 32 }}>
        Bookwise is a product of The Zen Bookkeeper. This Privacy Policy explains how we collect, use, and protect your information when you use our app and website.
      </p>

      <h2 style={{ fontFamily: 'var(--font-serif), Georgia, serif', fontSize: 22, fontWeight: 700, marginBottom: 12, marginTop: 40 }}>Information We Collect</h2>
      <p style={{ fontSize: 16, marginBottom: 16 }}>We collect information you provide directly, including your name, email address, practice details, and financial transaction data you enter or import. When you connect third-party services like Plaid, Stripe, or Google Drive, we receive data from those services as permitted by your authorization.</p>

      <h2 style={{ fontFamily: 'var(--font-serif), Georgia, serif', fontSize: 22, fontWeight: 700, marginBottom: 12, marginTop: 40 }}>How We Use Your Information</h2>
      <p style={{ fontSize: 16, marginBottom: 16 }}>We use your information to provide and improve the Bookwise service, generate AI-powered insights through Sage, and enable you to export your financial data. We do not sell your personal information to third parties.</p>

      <h2 style={{ fontFamily: 'var(--font-serif), Georgia, serif', fontSize: 22, fontWeight: 700, marginBottom: 12, marginTop: 40 }}>Data Storage and Security</h2>
      <p style={{ fontSize: 16, marginBottom: 16 }}>Your data is stored securely using Supabase with row-level security. Only you can access your records. We use industry-standard encryption for data in transit and at rest.</p>

      <h2 style={{ fontFamily: 'var(--font-serif), Georgia, serif', fontSize: 22, fontWeight: 700, marginBottom: 12, marginTop: 40 }}>Third-Party Services</h2>
      <p style={{ fontSize: 16, marginBottom: 16 }}>Bookwise integrates with Plaid (bank connections), Stripe and Square (payment data), Google Drive (receipt storage), and Anthropic (AI insights). Each of these services has its own privacy policy governing how they handle your data.</p>

      <h2 style={{ fontFamily: 'var(--font-serif), Georgia, serif', fontSize: 22, fontWeight: 700, marginBottom: 12, marginTop: 40 }}>Your Rights</h2>
      <p style={{ fontSize: 16, marginBottom: 16 }}>You may request deletion of your account and associated data at any time by contacting us. You may also disconnect any third-party integrations from your settings at any time.</p>

      <h2 style={{ fontFamily: 'var(--font-serif), Georgia, serif', fontSize: 22, fontWeight: 700, marginBottom: 12, marginTop: 40 }}>Contact</h2>
      <p style={{ fontSize: 16, marginBottom: 16 }}>For privacy questions, contact us at <a href="mailto:hello@thezenbookkeeper.com" style={{ color: '#7C9A7E' }}>hello@thezenbookkeeper.com</a>.</p>

      <p style={{ fontSize: 13, color: '#6B7566', marginTop: 64, paddingTop: 24, borderTop: '1px solid #E0D8CF' }}>
        This policy will be updated as Bookwise grows. Material changes will be communicated by email to active users.
      </p>
    </main>
  )
}
