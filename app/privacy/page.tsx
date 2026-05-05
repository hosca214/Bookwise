export default function PrivacyPage() {
  const h1: React.CSSProperties = { fontFamily: 'var(--font-serif), Georgia, serif', fontSize: 36, fontWeight: 700, marginBottom: 8 }
  const h2: React.CSSProperties = { fontFamily: 'var(--font-serif), Georgia, serif', fontSize: 22, fontWeight: 700, marginBottom: 12, marginTop: 48 }
  const p: React.CSSProperties = { fontSize: 16, marginBottom: 16 }
  const ul: React.CSSProperties = { fontSize: 16, marginBottom: 16, paddingLeft: 24, lineHeight: 1.9 }

  return (
    <main style={{ maxWidth: 680, margin: '0 auto', padding: '80px 24px 120px', fontFamily: 'var(--font-sans), sans-serif', color: '#2C3528', lineHeight: 1.75 }}>
      <h1 style={h1}>Privacy Policy</h1>
      <p style={{ fontSize: 14, color: '#6B7566', marginBottom: 48 }}>Last updated: May 2026</p>

      <p style={p}>
        Bookwise is a product of The Zen Bookkeeper LLC. This Privacy Policy explains what information we collect, how we use it, and what rights you have over your data. By using Bookwise, you agree to this policy.
      </p>

      <h2 style={h2}>Information We Collect</h2>
      <p style={p}>We collect the following categories of information:</p>
      <ul style={ul}>
        <li><strong>Account information:</strong> Your name, email address, and password when you create an account.</li>
        <li><strong>Practice information:</strong> Your business name, industry type, and financial settings you configure within the app.</li>
        <li><strong>Transaction data:</strong> Income and expense records you enter manually or import through connected services.</li>
        <li><strong>Bank account data:</strong> When you connect a bank account through Plaid, we receive read-only access to your account information and transaction history. We do not receive or store your bank login credentials. Plaid handles authentication directly.</li>
        <li><strong>Receipt files:</strong> Images you upload for receipt storage, which are stored in your connected Google Drive folder or in Bookwise cloud storage.</li>
        <li><strong>Usage information:</strong> Standard log data such as your IP address, browser type, and pages visited, collected automatically when you use the service.</li>
      </ul>

      <h2 style={h2}>How We Use Your Information</h2>
      <p style={p}>We use your information to:</p>
      <ul style={ul}>
        <li>Provide, operate, and improve the Bookwise service</li>
        <li>Categorize and organize your financial transactions</li>
        <li>Generate AI-powered observations through Sage AI (pattern summaries, not raw transaction data, are passed to our AI provider)</li>
        <li>Enable you to export your financial data for use with a licensed CPA</li>
        <li>Send transactional emails related to your account</li>
        <li>Comply with legal obligations</li>
      </ul>
      <p style={p}>We do not sell your personal information to third parties. We do not use your financial data for advertising.</p>

      <h2 style={h2}>Bank Data and Plaid</h2>
      <p style={p}>
        Bookwise uses Plaid Technologies, Inc. to connect your bank accounts. When you choose to connect a bank account, you are authorizing Plaid to access your financial institution on your behalf. Plaid retrieves your account and transaction data and passes it to Bookwise so we can categorize it for you.
      </p>
      <p style={p}>
        Bookwise receives the following data from Plaid when you connect an account:
      </p>
      <ul style={ul}>
        <li>Account name, type, and last four digits</li>
        <li>Account balances</li>
        <li>Transaction history (up to 90 days at the time of connection)</li>
        <li>Merchant names and transaction categories</li>
      </ul>
      <p style={p}>
        This data is used solely to populate your Bookwise ledger. You can disconnect your bank account at any time from your Settings page, which revokes Bookwise's access token and removes the connection from your account.
      </p>
      <p style={p}>
        Plaid's own privacy policy governs how Plaid collects and handles your data. You can review it at <a href="https://plaid.com/legal/#end-user-privacy-policy" style={{ color: '#7C9A7E' }}>plaid.com/legal</a>.
      </p>

      <h2 style={h2}>Data Storage and Security</h2>
      <p style={p}>
        Your data is stored using Supabase, a cloud database provider with row-level security enabled. Only you can access your records. We use industry-standard encryption for data in transit (TLS) and at rest.
      </p>
      <p style={p}>
        We retain your data for as long as your account is active. If you delete your account, we will delete your personal data and financial records within 30 days, except where retention is required by law.
      </p>

      <h2 style={h2}>Third-Party Services</h2>
      <p style={p}>Bookwise integrates with the following third-party services. Each has its own privacy policy:</p>
      <ul style={ul}>
        <li><strong>Plaid</strong> — bank account connections and transaction data</li>
        <li><strong>Google Drive</strong> — receipt file storage (if you connect it)</li>
        <li><strong>Anthropic</strong> — AI-powered observations via Sage AI (we pass anonymized financial summaries, not raw transaction records)</li>
        <li><strong>Supabase</strong> — database and authentication infrastructure</li>
        <li><strong>Vercel</strong> — application hosting</li>
      </ul>

      <h2 style={h2}>Cookies</h2>
      <p style={p}>
        Bookwise uses cookies and local storage to maintain your login session. We do not use tracking cookies or advertising cookies. You can clear cookies in your browser settings, which will log you out of the app.
      </p>

      <h2 style={h2}>Your Rights</h2>
      <p style={p}>You have the right to:</p>
      <ul style={ul}>
        <li>Access the personal data we hold about you</li>
        <li>Correct inaccurate data</li>
        <li>Request deletion of your account and all associated data</li>
        <li>Disconnect any third-party integration (Plaid, Google Drive) at any time from your Settings page</li>
        <li>Export your financial data in CSV format from the Reports page</li>
      </ul>
      <p style={p}>To exercise any of these rights, contact us at the email below.</p>

      <h2 style={h2}>Children</h2>
      <p style={p}>
        Bookwise is not intended for use by anyone under the age of 18. We do not knowingly collect personal information from children. If you believe a minor has created an account, please contact us and we will delete it promptly.
      </p>

      <h2 style={h2}>Contact</h2>
      <p style={p}>
        For privacy questions or data requests, contact us at <a href="mailto:hello@thezenbookkeeper.com" style={{ color: '#7C9A7E' }}>hello@thezenbookkeeper.com</a>.
      </p>
      <p style={p}>
        The Zen Bookkeeper LLC<br />
        Dallas-Fort Worth, Texas
      </p>

      <p style={{ fontSize: 13, color: '#6B7566', marginTop: 64, paddingTop: 24, borderTop: '1px solid #E0D8CF' }}>
        This policy will be updated as Bookwise evolves. Material changes will be communicated by email to active users at least 14 days before they take effect.
      </p>
    </main>
  )
}
