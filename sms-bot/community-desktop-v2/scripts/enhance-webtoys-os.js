#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envCandidates = [
  path.resolve(__dirname, '../../.env.local'),
  path.resolve(__dirname, '../../.env'),
  path.resolve(process.cwd(), '.env.local'),
  path.resolve(process.cwd(), '.env')
];
for (const p of envCandidates) { if (fs.existsSync(p)) { dotenv.config({ path: p }); break; } }

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) { console.error('❌ Missing Supabase credentials'); process.exit(1); }
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const cssBlock = "\n#selection-marquee{position:absolute;pointer-events:none;border:1px solid rgba(99,102,241,.5);background:rgba(99,102,241,.10);border-radius:6px;box-shadow:0 0 0 1px rgba(99,102,241,.12) inset;display:none;}\n.desktop-icon.selected{background:rgba(99,102,241,.14);border:1px solid rgba(99,102,241,.35);border-radius:10px}\n.desktop-icon.dragging{opacity:.85;filter:saturate(1.05)}\n/* Hide old special dropdown to avoid conflicts */\n.menu-title .dropdown-menu{display:none !important}\n.menu-dropdown{position:fixed;top:44px;left:8px;min-width:220px;background:rgba(255,255,255,.96);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);border:1px solid rgba(0,0,0,.08);border-radius:10px;box-shadow:0 10px 20px rgba(0,0,0,.12);padding:6px;display:none;z-index:10000}\n.menu-dropdown .item{padding:8px 10px;border-radius:8px;cursor:pointer;font:13px/1.3 ui-sans-serif,system-ui;-webkit-user-select:none}\n.menu-dropdown .item:hover{background:rgba(99,102,241,.1)}\n.trash-pop{position:fixed;bottom:90px;right:30px;min-width:200px;background:rgba(255,255,255,.96);border:1px solid rgba(0,0,0,.08);border-radius:10px;box-shadow:0 10px 20px rgba(0,0,0,.12);padding:8px;display:none;z-index:10000}\n.trash-pop .item{padding:8px;border-radius:8px;cursor:pointer}\n.trash-pop .item:hover{background:rgba(0,0,0,.05)}\n.profile-popover{position:fixed;top:44px;right:12px;min-width:220px;background:rgba(255,255,255,.96);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);border:1px solid rgba(0,0,0,.08);border-radius:10px;box-shadow:0 10px 20px rgba(0,0,0,.12);padding:8px;display:none;z-index:10000}\n.profile-popover .row{padding:8px;border-radius:8px;cursor:pointer}\n.profile-popover .row:hover{background:rgba(0,0,0,.05)}\n";

const injectedScript = `
<script>
(function(){
  // Inject styles for marquee and menus/popovers
  const style = document.createElement('style');
  style.id = 'wos-enhancements';
  style.textContent = ${JSON.stringify(cssBlock)};
  document.head.appendChild(style);

  const desktop = document.getElementById('desktop');
  if(!desktop) return;

  // Selection marquee
  const marquee = document.createElement('div');
  marquee.id = 'selection-marquee';
  desktop.appendChild(marquee);
  // Transparent overlay to capture pointer events reliably in Safari
  const overlay = document.createElement('div');
  overlay.id = 'interaction-overlay';
  overlay.style.position = 'absolute';
  overlay.style.left = '0';
  overlay.style.top = '0';
  overlay.style.right = '0';
  overlay.style.bottom = '0';
  overlay.style.pointerEvents = 'none';
  overlay.style.zIndex = '9998';
  desktop.appendChild(overlay);
  let selecting = false; let startX=0, startY=0; let rafId=null;

  function rectsOverlap(r1,r2){return !(r2.left>r1.right||r2.right<r1.left||r2.top>r1.bottom||r2.bottom<r1.top)}

  // Use overlay for selection to avoid interference with icons/windows
  desktop.addEventListener('pointerdown', (e)=>{
    if(e.target.closest('.desktop-icon')) return; // only empty space
    const dRect = desktop.getBoundingClientRect();
    selecting = true; startX = e.clientX; startY = e.clientY;
    marquee.style.display='block';
    marquee.style.left=(startX - dRect.left)+'px';
    marquee.style.top=(startY - dRect.top)+'px';
    marquee.style.width='0px'; marquee.style.height='0px';
    document.body.style.userSelect='none';
    e.preventDefault();
    overlay.style.pointerEvents = 'auto';
  });
  overlay.addEventListener('pointermove', (e)=>{
    if(!selecting) return;
    const dRect = desktop.getBoundingClientRect();
    const x = Math.min(e.clientX, startX) - dRect.left; const y = Math.min(e.clientY, startY) - dRect.top;
    const w = Math.abs(e.clientX - startX); const h = Math.abs(e.clientY - startY);
    marquee.style.left = x+'px'; marquee.style.top = y+'px'; marquee.style.width = w+'px'; marquee.style.height = h+'px';
    if(rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(()=>{
      const mRect = marquee.getBoundingClientRect();
      document.querySelectorAll('.desktop-icon:not(.trash-can)').forEach(icon=>{
        const r = icon.getBoundingClientRect();
        if(rectsOverlap(mRect,r)) icon.classList.add('selected'); else icon.classList.remove('selected');
      });
    });
  });
  overlay.addEventListener('pointerup', ()=>{ if(selecting){ selecting=false; marquee.style.display='none'; document.body.style.userSelect=''; overlay.style.pointerEvents='none'; }});

  // Group drag integration: wrap existing icon drag start to support groups
  const origHandleMouseDown = window.handleIconMouseDown;
  if(typeof origHandleMouseDown === 'function'){
    window.handleIconMouseDown = function(event){
      const icon = event.currentTarget;
      if(!icon.classList.contains('selected')){
        // clear previous selection
        document.querySelectorAll('.desktop-icon.selected').forEach(i=>i.classList.remove('selected'));
        icon.classList.add('selected');
      }
      const selected = Array.from(document.querySelectorAll('.desktop-icon.selected:not(.trash-can)'));
      const desktopRect = desktop.getBoundingClientRect();
      const offsets = selected.map(el=>{
        const r = el.getBoundingClientRect();
        return { el, dx: event.clientX - r.left, dy: event.clientY - r.top, w: el.offsetWidth, h: el.offsetHeight };
      });

      // If more than one is selected, handle group drag ourselves and block single-icon handler
      let draggingGroup = selected.length > 1 ? true : false;
      function move(e){
        const dist = Math.hypot(e.clientX - event.clientX, e.clientY - event.clientY);
        if(!draggingGroup && dist>5) draggingGroup = true;
        if(!draggingGroup) return;
        selected.forEach((_,i)=>{
          const o = offsets[i];
          let x = e.clientX - desktopRect.left - o.dx; let y = e.clientY - desktopRect.top - o.dy;
          x = Math.max(0, Math.min(x, desktopRect.width - o.w));
          y = Math.max(0, Math.min(y, desktopRect.height - o.h - 50));
          o.el.style.left = x + 'px'; o.el.style.top = y + 'px';
          o.el.classList.add('dragging');
        });
        // highlight trash
        const trash = document.getElementById('trashCan'); if(trash){
          const t = trash.getBoundingClientRect(); let over=false;
          selected.forEach(el=>{ const r=el.getBoundingClientRect(); if(!(r.right<t.left||r.left>t.right||r.bottom<t.top||r.top>t.bottom)) over=true; });
          trash.style.boxShadow = over? '0 0 0 3px rgba(239,68,68,.45)' : '';
          trash.style.transform = over? 'scale(1.06)' : '';
        }
        e.preventDefault();
      }
      function up(e){
        document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up);
        selected.forEach(el=>el.classList.remove('dragging'));
        const trash = document.getElementById('trashCan');
        if(trash){
          const t = trash.getBoundingClientRect(); let over=false;
          selected.forEach(el=>{ const r=el.getBoundingClientRect(); if(!(r.right<t.left||r.left>t.right||r.bottom<t.top||r.top>t.bottom)) over=true; });
          if(over){
            const names = selected.map(el=>el.querySelector('.label')?.textContent||'');
            if(confirm('Hide selected icons from desktop?')){
              selected.forEach(el=>{ el.style.display='none'; });
              if(window.saveIconPositions) window.saveIconPositions();
            }
          } else {
            if(window.saveIconPositions) window.saveIconPositions();
          }
          trash.style.boxShadow = ''; trash.style.transform='';
        }
        e.preventDefault();
      }
      document.addEventListener('pointermove', move, { passive: false });
      document.addEventListener('pointerup', up, { passive: false });
      // Call original only if single selection so we don't fight handlers
      if(selected.length === 1){
        try{ origHandleMouseDown.call(this, event); }catch{}
      } else {
        event.preventDefault(); event.stopPropagation();
      }
    }
    // Rebind our handler in capture phase so it runs even if listeners were attached earlier
    document.querySelectorAll('.desktop-icon:not(.trash-can)').forEach(icon=>{
      icon.removeEventListener('mousedown', window.handleIconMouseDown, { capture: true });
      icon.addEventListener('pointerdown', window.handleIconMouseDown, { capture: true, passive: false });
    });
  }

  // Menu manager (hover between titles)
  const menu = document.createElement('div'); menu.className='menu-dropdown'; document.body.appendChild(menu);
  let open = false; let current=null; const itemsByMenu = {
    'apple': [
      {label:'About Webtoys OS', action:()=>alert('Webtoys OS – modern desktop in your browser')},
      {label:'Quit', action:()=>alert('Quit disabled in web demo')}
    ],
    'file': [
      {label:'New Window', action:()=>alert('New Window')},
      {label:'Clean Up', action:()=>window.cleanUpDesktop && window.cleanUpDesktop(new Event('dummy'))}
    ],
    'edit': [
      {label:'Undo', action:()=>alert('Undo')},
      {label:'Redo', action:()=>alert('Redo')},
      {label:'Cut', action:()=>document.execCommand && document.execCommand('cut')},
      {label:'Copy', action:()=>document.execCommand && document.execCommand('copy')},
      {label:'Paste', action:()=>document.execCommand && document.execCommand('paste')}
    ],
    'view': [
      {label:'Refresh', action:()=>location.reload()},
      {label:'Toggle Grid (visual only)', action:()=>alert('Grid toggle placeholder')}
    ],
    'special': [
      {label:'Clean Up', action:()=>window.cleanUpDesktop && window.cleanUpDesktop(new Event('dummy'))}
    ]
  };
  function renderMenu(kind, anchor){
    const rect = anchor.getBoundingClientRect();
    menu.style.left = Math.round(rect.left)+'px';
    menu.style.top = Math.round((document.querySelector('.menu-bar')?.getBoundingClientRect().bottom||rect.bottom)+6)+'px';
    menu.innerHTML = '';
    (itemsByMenu[kind]||[]).forEach(it=>{ const d=document.createElement('div'); d.className='item'; d.textContent=it.label; d.onclick=()=>{it.action(); hideMenu();}; menu.appendChild(d); });
    menu.style.display='block'; open=true; current=kind;
  }
  function hideMenu(){ menu.style.display='none'; open=false; current=null; }
  document.querySelectorAll('.menu-title').forEach(title=>{
    const text = (title.textContent||'').trim().toLowerCase() || (title.classList.contains('apple')?'apple':'');
    title.addEventListener('click',(e)=>{ e.preventDefault(); e.stopPropagation(); if(open && current===text){ hideMenu(); } else { renderMenu(text, title); } }, { capture: true });
    title.addEventListener('mouseenter',()=>{ if(open && current!==text){ renderMenu(text, title); } });
  });
  document.addEventListener('click', hideMenu);

  // Trash popover (basic)
  const trash = document.getElementById('trashCan');
  const trashPop = document.createElement('div'); trashPop.className='trash-pop'; trashPop.innerHTML="<div class=\"item\" id=\"emptyTrash\">Empty Trash (hide selected)</div><div class=\"item\" id=\"closeTrash\">Close</div>"; document.body.appendChild(trashPop);
  function toggleTrashPop(){ trashPop.style.display = trashPop.style.display==='block' ? 'none':'block'; }
  if(trash){ trash.addEventListener('click', (e)=>{ e.stopPropagation(); toggleTrashPop(); }); }
  document.getElementById('closeTrash').addEventListener('click', ()=> trashPop.style.display='none');
  document.getElementById('emptyTrash').addEventListener('click', ()=>{
    const sel = Array.from(document.querySelectorAll('.desktop-icon.selected:not(.trash-can)'));
    if(sel.length===0){ alert('Select icons first'); return; }
    sel.forEach(el=> el.style.display='none'); if(window.saveIconPositions) window.saveIconPositions(); trashPop.style.display='none';
  });

  // Profile popover
  const profile = document.getElementById('profile-icon');
  if(profile){
    const pop = document.createElement('div'); pop.className='profile-popover';
    pop.innerHTML = "<div class=\\"row\\">Profile</div><div class=\\"row\\" id=\\"switchUser\\">Switch User</div><div class=\\"row\\" id=\\"signOut\\">Sign Out</div>";
    document.body.appendChild(pop);
    function toggle(){ pop.style.display = pop.style.display==='block'?'none':'block'; }
    profile.addEventListener('click', (e)=>{ e.stopPropagation(); toggle(); });
    document.addEventListener('click', ()=>{ pop.style.display='none'; });
    const signOut = pop.querySelector('#signOut'); if(signOut){ signOut.addEventListener('click', ()=>{ try{ window.doLogout && window.doLogout(); }catch{} pop.style.display='none'; }); }
    const switchUser = pop.querySelector('#switchUser'); if(switchUser){ switchUser.addEventListener('click', ()=>{ try{ window.openAuthModal && window.openAuthModal(); }catch{} pop.style.display='none'; }); }
  }
})();
</script>
`;

async function main(){
  console.log('🔧 Enhancing webtoys-os (marquee, group drag, menus, trash popover)');
  const { data, error } = await supabase
    .from('wtaf_content')
    .select('id, html_content')
    .eq('user_slug','public')
    .eq('app_slug','webtoys-os')
    .single();
  if(error){ console.error('Fetch failed:', error.message); process.exit(1); }

  const backupDir = path.join(process.cwd(), 'backups'); fs.mkdirSync(backupDir,{recursive:true});
  const ts = new Date().toISOString().replace(/:/g,'-').replace(/\./g,'-');
  fs.writeFileSync(path.join(backupDir, `webtoys-os_${ts}_before.html`), data.html_content || '', 'utf8');

  let html = data.html_content || '';
  if(html.includes('wos-enhancements')){
    console.log('ℹ️ Enhancements already present, re-applying update block.');
  }
  if(html.includes('</body>')){
    html = html.replace('</body>', `${injectedScript}\n</body>`);
  } else {
    html += injectedScript;
  }

  const { error: updErr } = await supabase
    .from('wtaf_content')
    .update({ html_content: html, updated_at: new Date().toISOString() })
    .eq('user_slug','public')
    .eq('app_slug','webtoys-os');
  if(updErr){ console.error('Update failed:', updErr.message); process.exit(1); }

  fs.writeFileSync(path.join(backupDir, `webtoys-os_${ts}_after.html`), html, 'utf8');
  console.log('✅ Enhancement applied. Test at https://webtoys.ai/public/webtoys-os');
}

main().catch(e=>{ console.error('Unexpected:', e); process.exit(1); });


