import * as React from 'react'

import {
  Body,
  Button,
  Container,
  Hr,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'

interface MagicLinkEmailProps {
  siteName?: string
  confirmationUrl: string
  minutesValid?: number
}

export const MagicLinkEmail = ({
  siteName = 'MarketWatch',
  confirmationUrl,
  minutesValid = 60,
}: MagicLinkEmailProps) => (
  <Html lang="vi" dir="ltr">
    <Head />
      <Preview>{`Liên kết đăng nhập ${siteName} — có hiệu lực ${minutesValid} phút`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Text style={brand}>
            <span style={brandGold}>Market</span>
            <span style={brandDark}>Watch</span>
          </Text>
          <Text style={eyebrow}>Nhật báo dữ liệu tài chính</Text>
        </Section>

        <Section style={card}>
          <Text style={kicker}>ĐĂNG NHẬP AN TOÀN</Text>
          <Heading style={h1}>Đăng nhập {siteName}</Heading>
          <Text style={text}>
            Bấm nút bên dưới để đăng nhập vào tài khoản của bạn. Liên kết có
            hiệu lực trong <strong>{minutesValid} phút</strong> và chỉ dùng
            được một lần.
          </Text>
          <Section style={{ textAlign: 'center', margin: '24px 0' }}>
            <Button style={button} href={confirmationUrl}>
              Đăng nhập ngay
            </Button>
          </Section>
          <Text style={smallMuted}>Hoặc dán liên kết sau vào trình duyệt:</Text>
          <Text style={linkBox}>
            <Link href={confirmationUrl} style={linkText}>
              {confirmationUrl}
            </Link>
          </Text>
          <Hr style={hr} />
          <Text style={notice}>
            Bạn không yêu cầu đăng nhập? Có thể bỏ qua email này — tài khoản của
            bạn vẫn an toàn và không có thay đổi nào được thực hiện.
          </Text>
        </Section>

        <Section style={footer}>
          <Text style={footerText}>
            Bạn nhận được email này từ {siteName}. Cần hỗ trợ?{' '}
            <Link href="mailto:contact@marketwatch.vn" style={footerLink}>
              contact@marketwatch.vn
            </Link>
          </Text>
          <Text style={footerCopy}>
            © {new Date().getFullYear()} {siteName} ·{' '}
            <Link href="https://marketwatch.vn" style={footerLink}>
              marketwatch.vn
            </Link>
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail

const GOLD = '#C9A24A'

const main = {
  backgroundColor: '#ffffff',
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  color: '#1a1a1a',
  padding: '32px 16px',
}
const container = { maxWidth: '560px', margin: '0 auto' }
const header = { padding: '0 4px 20px' }
const brand = {
  fontSize: '22px',
  fontWeight: 700 as const,
  letterSpacing: '-0.01em',
  margin: '0',
}
const brandGold = { color: GOLD }
const brandDark = { color: '#111111' }
const eyebrow = {
  fontSize: '11px',
  color: '#888',
  letterSpacing: '0.14em',
  textTransform: 'uppercase' as const,
  margin: '6px 0 0',
}
const card = {
  border: '1px solid #ececec',
  borderRadius: '12px',
  padding: '28px',
  background: '#ffffff',
}
const kicker = {
  fontSize: '11px',
  color: GOLD,
  letterSpacing: '0.14em',
  fontWeight: 600 as const,
  margin: '0 0 8px',
}
const h1 = {
  fontSize: '24px',
  fontWeight: 700 as const,
  color: '#111',
  margin: '0 0 14px',
  lineHeight: '1.25',
}
const text = {
  fontSize: '15px',
  color: '#333',
  lineHeight: '1.65',
  margin: '0 0 12px',
}
const button = {
  backgroundColor: GOLD,
  color: '#111111',
  fontSize: '15px',
  fontWeight: 600 as const,
  borderRadius: '8px',
  padding: '13px 26px',
  textDecoration: 'none',
  display: 'inline-block',
}
const smallMuted = {
  fontSize: '12px',
  color: '#666',
  margin: '4px 0 6px',
}
const linkBox = {
  fontSize: '12px',
  color: '#0a58ca',
  wordBreak: 'break-all' as const,
  margin: '0 0 18px',
  padding: '10px 12px',
  background: '#fafafa',
  border: '1px solid #f0f0f0',
  borderRadius: '6px',
}
const linkText = { color: '#0a58ca', textDecoration: 'none' }
const hr = { borderColor: '#f0f0f0', margin: '20px 0' }
const notice = {
  fontSize: '12px',
  color: '#888',
  lineHeight: '1.6',
  margin: '0',
}
const footer = { padding: '18px 4px 0', textAlign: 'center' as const }
const footerText = {
  fontSize: '12px',
  color: '#888',
  lineHeight: '1.6',
  margin: '0 0 4px',
}
const footerCopy = {
  fontSize: '12px',
  color: '#aaa',
  margin: '0',
}
const footerLink = { color: '#555', textDecoration: 'underline' }
