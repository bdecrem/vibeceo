#!/usr/bin/env node

import { fetchCurrentDesktop, safeUpdateDesktop } from './safe-wrapper.js';

function patchSpaceHandler(html) {
  // Replace the Space key listener to ignore inputs, textareas, contenteditable, and chat widget
  const pattern = /\/\/ Space key bonus[\s\S]*?document\.addEventListener\('keydown',[\s\S]*?\);\n[\t ]*\n/;
  const replacement = `// Space key bonus (do NOT interfere with typing in inputs/textareas/chat widget)\n`+
`document.addEventListener('keydown', (e) => {\n`+
`    const inEditable = e.target.closest('input, textarea, [contenteditable="true"], .chat-widget');\n`+
`    if (e.code === 'Space' && !inEditable) {\n`+
`        e.preventDefault();\n`+
`        document.body.style.animation = 'shake 0.5s';\n`+
`        setTimeout(() => { document.body.style.animation = ''; }, 500);\n`+
`        updateScore(50);\n`+
`        showAchievement('Space Bonus! +50');\n`+
`    }\n`+
`});\n\n`;

  if (!pattern.test(html)) {
    throw new Error('Could not locate Space key handler to patch');
  }
  return html.replace(pattern, replacement);
}

async function main() {
  console.log('🔧 Patching desktop HTML (Space key handler)...');
  const current = await fetchCurrentDesktop(true);
  const patched = patchSpaceHandler(current.html_content);
  await safeUpdateDesktop(patched, 'Fix: do not block Space in inputs/textarea/chat widget', true);
}

main().catch(err => { console.error('❌ Patch failed:', err.message); process.exit(1); });

