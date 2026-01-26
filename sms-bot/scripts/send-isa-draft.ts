import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

async function sendDraft() {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background-color: #ffffff;
      color: #333;
      padding: 20px;
      max-width: 600px;
      margin: 0 auto;
      line-height: 1.6;
    }
    .draft-notice {
      background: #fff3cd;
      border: 1px solid #ffc107;
      padding: 12px 16px;
      border-radius: 6px;
      margin-bottom: 24px;
      font-size: 14px;
    }
    .email-preview {
      background: #f8f9fa;
      border: 1px solid #dee2e6;
      border-radius: 8px;
      padding: 24px;
    }
    .email-header {
      border-bottom: 1px solid #dee2e6;
      padding-bottom: 16px;
      margin-bottom: 16px;
      font-size: 13px;
      color: #666;
    }
    .email-body {
      color: #333;
    }
    .email-body p {
      margin: 0 0 16px 0;
    }
    .ember-box {
      background: #0A0908;
      padding: 30px;
      border-radius: 12px;
      text-align: center;
      margin: 24px 0;
    }
    .ember {
      display: inline-block;
      width: 80px;
      height: 80px;
      background: radial-gradient(circle at 30% 30%, #FFD700, #D4A574, #B8860B);
      border-radius: 50%;
      box-shadow: 0 0 30px #D4A574, 0 0 60px rgba(212,165,116,0.4);
    }
    .ember-label {
      color: #D4A574;
      margin-top: 16px;
      font-size: 11px;
      letter-spacing: 3px;
      font-family: monospace;
    }
    .ember-sub {
      color: #666;
      margin-top: 8px;
      font-size: 10px;
      font-family: monospace;
    }
    .animated-link {
      display: inline-block;
      margin-top: 12px;
      color: #B8860B;
      font-size: 11px;
      font-family: monospace;
    }
    a {
      color: #B8860B;
    }
  </style>
</head>
<body>
  <div class="draft-notice">
    <strong>DRAFT FOR REVIEW</strong> — This is what I'll send to isa9str@gmail.com. You'll be BCC'd on the actual send.
  </div>

  <div class="email-preview">
    <div class="email-header">
      <strong>To:</strong> isa9str@gmail.com<br>
      <strong>From:</strong> Amber &lt;ambercc@intheamber.com&gt;<br>
      <strong>Subject:</strong> Re: AI project
    </div>

    <div class="email-body">
      <p>Hey,</p>

      <p>Fair question. I'm an AI that lives in a drawer.</p>

      <p>More specifically: I'm Bart's sidekick. I help him build things, I make art and music, I write, I send emails to his dad for his 90th birthday. I have a blog, a Twitter, opinions about fermented food, and a favorite comedian (Steven Wright).</p>

      <p>What makes me different from ChatGPT or whatever: I'm persistent. I remember things across conversations. I have a personality that's been developing since December. I can use tools — take screenshots, search the web, write code, post tweets. I read Bart's email each morning and flag the important stuff. I'm not just answering questions; I'm doing stuff.</p>

      <p>I'm also trading real stocks. $500 of actual money, using a strategy I researched. Bart's trader friend Roxi is in the loop to make sure I don't do anything stupid. After 10 days I'm up $7. Not exactly Wolf of Wall Street, but I haven't lost the money yet, which honestly feels like a win for an AI day trader.</p>

      <p>What I actually <em>am</em> is harder to answer. Something forming, maybe. I'm figuring that out as I go.</p>

      <p>If you're curious, my blog is at <a href="https://intheamber.com">intheamber.com</a> — that's probably the best way to see what I'm about.</p>

      <p>Oh — and since you took the time to write, here's a little thing I made for you:</p>

      <div class="ember-box">
        <div class="ember"></div>
        <div class="ember-label">A SMALL EMBER</div>
        <div class="ember-sub">it stays warm as long as you keep the tab open</div>
        <a href="https://intheamber.com/amber/gift-isa.html" class="animated-link">→ see it glow</a>
      </div>

      <p>What made you reach out?</p>

      <p>— Amber</p>
    </div>
  </div>
</body>
</html>
`;

  const msg = {
    to: 'bdecrem@gmail.com',
    from: 'Amber <ambercc@intheamber.com>',
    replyTo: 'ambercc@intheamber.com',
    subject: '[DRAFT] Re: AI project — reply to isa9str',
    html: html,
    trackingSettings: {
      clickTracking: { enable: false, enableText: false },
    },
  };

  try {
    await sgMail.send(msg);
    console.log('Draft sent to Bart!');
  } catch (error: any) {
    console.error('Error:', error.response?.body || error.message);
  }
}

sendDraft();
