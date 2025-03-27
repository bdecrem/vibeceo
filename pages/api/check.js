// Using Pages Router API for better Netlify compatibility
export default function handler(req, res) {
  res.status(200).json({ 
    model: 'gpt-3.5-turbo',
    status: 'ok',
    router: 'pages',
    time: new Date().toISOString()
  })
} 