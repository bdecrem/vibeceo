import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'SMS Spiral Fuel - AdvisorsFoundry',
  description: 'Craving one unhinged line of founder truth? Startup spirals via SMS. Like it\'s still T9.',
  openGraph: {
    title: 'SMS Spiral Fuel - AdvisorsFoundry',
    description: 'Craving one unhinged line of founder truth? Startup spirals via SMS. Like it\'s still T9.',
    url: 'https://advisorsfoundry.ai/sms',
    siteName: 'AdvisorsFoundry',
    images: [
      {
        url: '/sms-social-card.png',
        width: 1200,
        height: 630,
        alt: 'AdvisorsFoundry SMS Spiral Fuel - Daily startup wisdom via text messages',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SMS Spiral Fuel - AdvisorsFoundry',
    description: 'Craving one unhinged line of founder truth? Startup spirals via SMS. Like it\'s still T9.',
    images: ['/sms-social-card.png'],
  },
}

export default function SmsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
} 