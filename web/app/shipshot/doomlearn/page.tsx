'use client'

import { useEffect, useRef } from 'react'
import Script from 'next/script'

export default function DoomLearnPage() {
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    // Run the inline script logic after mount
    const TOPICS: Record<string, any[]> = {
      'black holes': [
        {text:'A <hl>black hole</hl> isn\'t a hole at all. It\'s the corpse of a star so massive that when it died, its gravity crushed it into a point smaller than an atom.',detail:'This point is called a singularity — a place where density is infinite and the known laws of physics break down completely.'},
        {text:'The boundary around a black hole is called the <hl>event horizon</hl>. Cross it, and not even light can escape. It\'s not a physical surface — it\'s a point of no return.',detail:'The name comes from the fact that no event occurring inside can ever be observed from outside. Information is lost forever.'},
        {text:'If you fell into a black hole, you\'d experience <hl>spaghettification</hl> — the gravity difference between your head and feet would stretch you into a thin strand of atoms.',detail:'For a stellar-mass black hole, this happens well before you reach the horizon. For a supermassive one, you might cross the horizon without noticing.'},
        {text:'Time moves <hl>slower near a black hole</hl>. If you watched someone fall in, they\'d appear to freeze and fade at the event horizon — from their perspective, they fell right through.',detail:'This is gravitational time dilation, predicted by Einstein\'s general relativity and confirmed by experiments with atomic clocks.'},
        {text:'The supermassive black hole at the center of our galaxy is called <hl>Sagittarius A*</hl>. It has the mass of 4 million suns and fits inside Mercury\'s orbit.',detail:'Despite its mass, it\'s relatively quiet. Some supermassive black holes actively consume matter and outshine entire galaxies.'},
        {quiz:true,question:'What happens to time near a black hole?',options:['It speeds up','It slows down','It reverses','It stops completely'],answer:1},
        {text:'Black holes don\'t suck things in like vacuums. At a distance, their gravity is <hl>exactly the same</hl> as the star they replaced. If the Sun became a black hole, Earth\'s orbit wouldn\'t change.',detail:'You\'d freeze to death without sunlight, but gravitationally, nothing would be different. Black holes are only dangerous up close.'},
        {text:'Stephen Hawking discovered that black holes aren\'t completely black. They emit faint radiation — now called <hl>Hawking radiation</hl> — and will eventually evaporate.',detail:'A stellar-mass black hole would take longer than the age of the universe to evaporate. But tiny primordial black holes from the Big Bang could be evaporating right now.'},
        {text:'In 2019, humanity captured the <hl>first-ever image of a black hole</hl> — M87*, 55 million light-years away. It took a telescope the size of Earth to do it.',detail:'The Event Horizon Telescope combined data from radio dishes across the globe. The orange ring is superheated gas; the shadow is the event horizon.'},
        {milestone:true,text:'You just learned more about black holes than 94% of people. Not bad for a scroll session.'},
        {text:'The information paradox is one of physics\' biggest unsolved problems. If information is <hl>destroyed inside a black hole</hl>, it violates quantum mechanics. If it\'s preserved, where does it go?',detail:'Hawking originally said information was lost. He later conceded it might be encoded on the event horizon — the idea behind the holographic principle.'},
        {text:'Some physicists believe the interior of a black hole could contain a <hl>whole other universe</hl>. Our own Big Bang might have originated inside one.',detail:'This is speculative but mathematically consistent. Lee Smolin\'s cosmological natural selection theory proposes that black holes birth new universes with slightly different physical constants.'},
        {text:'Black holes can <hl>spin</hl>. A rotating black hole drags spacetime itself around with it in a region called the ergosphere. You could theoretically extract energy from this rotation.',detail:'The Penrose process proposes dropping an object into the ergosphere so it splits — one half falls in, the other escapes with more energy than it entered with.'},
        {text:'Two black holes can <hl>merge</hl>, sending ripples through spacetime called gravitational waves. LIGO detected these for the first time in 2015 — confirming Einstein\'s century-old prediction.',detail:'The signal lasted 0.2 seconds. The collision released more energy than all the stars in the observable universe combined, briefly.'},
        {text:'There may be black holes <hl>from the very beginning of the universe</hl> — primordial black holes formed in the first second after the Big Bang, some smaller than an atom.',detail:'These could account for some of the mysterious dark matter. Searches are ongoing but none have been confirmed yet.'},
        {quiz:true,question:'What did LIGO detect in 2015?',options:['Hawking radiation','Dark matter','Gravitational waves','A new black hole'],answer:2},
        {text:'The largest known black hole, <hl>Phoenix A</hl>, has a mass of 100 billion suns. Its event horizon is larger than our entire solar system — by a wide margin.',detail:'At that size, the tidal forces at the horizon are gentle enough that you could cross it in a spaceship without being torn apart.'},
        {text:'If you compressed Earth into a black hole, it would be <hl>the size of a marble</hl> — about 9 millimeters across. The density required is almost incomprehensible.',detail:'A teaspoon of black hole material would weigh about 10 million tons.'},
        {text:'Black holes might be <hl>holograms</hl>. The holographic principle suggests all the information inside a black hole is actually encoded on its 2D surface, not in its 3D volume.',detail:'This idea, from \'t Hooft and Susskind, implies our entire 3D universe might be a projection from a 2D boundary. It\'s one of the most profound ideas in modern physics.'},
        {text:'Nobody knows what happens at the <hl>center of a black hole</hl>. General relativity predicts a singularity — infinite density, zero volume. But that probably just means our math breaks down.',detail:'A theory of quantum gravity — combining general relativity with quantum mechanics — might resolve the singularity. String theory and loop quantum gravity are two candidates. Neither is proven.'},
        {milestone:true,text:'20 cards deep. You just doomscrolled through the most extreme objects in the universe. Screenshot this.'},
        {text:'Black holes are <hl>the simplest objects in the universe</hl>. They\'re described by only three properties: mass, spin, and electric charge. Everything else about what fell in is erased.',detail:'This is the "no-hair theorem." A black hole made of iron and one made of feathers — same mass — are completely identical. The universe\'s ultimate minimalists.'},
        {text:'When matter spirals into a black hole, it forms an <hl>accretion disk</hl> — a ring of superheated gas moving at near light speed, reaching temperatures of billions of degrees.',detail:'Accretion disks are the brightest objects in the universe. Quasars — active supermassive black holes with accretion disks — can outshine their entire host galaxy by 100x.'},
        {text:'It\'s possible that <hl>every galaxy has a supermassive black hole</hl> at its center. The black hole and the galaxy seem to grow together — one of the great unexplained correlations in astrophysics.',detail:'The M-sigma relation shows that the mass of the central black hole is tightly correlated with the velocity dispersion of stars in the galaxy\'s bulge. Nobody fully understands why.'},
        {text:'A black hole\'s <hl>shadow</hl> is larger than the black hole itself. Light bending around the event horizon creates a dark silhouette about 2.6 times the size of the actual horizon.',detail:'This is what the Event Horizon Telescope imaged — not the black hole, but its shadow against the bright accretion disk.'},
        {quiz:true,question:'How many properties fully describe a black hole?',options:['One','Three','Seven','Infinite'],answer:1}
      ],
      'quantum physics': [
        {text:'At the quantum level, particles don\'t have <hl>definite positions</hl> until you measure them. Before measurement, they exist in a "superposition" — a blend of all possible states at once.',detail:'This isn\'t a limitation of our instruments. The particle genuinely doesn\'t have a position. Measurement forces it to "choose."'},
        {text:'<hl>Quantum entanglement</hl> links two particles so that measuring one instantly determines the other — no matter how far apart. Einstein called it "spooky action at a distance."',detail:'Experiments have confirmed entanglement over 1,200 km using satellites. It\'s real, and it\'s weird.'},
        {text:'The <hl>double-slit experiment</hl> shows that a single particle can interfere with itself — going through both slits at once. But if you watch which slit it goes through, the interference vanishes.',detail:'This is the most fundamental mystery of quantum mechanics. Observation changes the outcome.'},
        {text:'Schrödinger\'s cat was a <hl>thought experiment</hl> designed to show how absurd quantum superposition becomes at large scales. The cat is both alive and dead until observed.',detail:'Schrödinger actually meant this as a criticism of the Copenhagen interpretation — he thought it was ridiculous, not enlightening.'},
        {text:'Quantum <hl>tunneling</hl> lets particles pass through barriers they shouldn\'t be able to cross. It\'s not theoretical — your phone\'s flash memory works because of it.',detail:'The particle doesn\'t go over or around the barrier. It appears on the other side with no journey in between.'},
        {quiz:true,question:'What did Einstein call quantum entanglement?',options:['Beautiful symmetry','Spooky action at a distance','God\'s dice','The uncertainty dance'],answer:1},
        {text:'Heisenberg\'s <hl>uncertainty principle</hl> says you can never know both a particle\'s position and momentum precisely. The more you know one, the less you can know the other.',detail:'This isn\'t about imprecise instruments — it\'s a fundamental property of nature. The universe has a built-in information limit.'},
        {text:'Quantum mechanics predicts that <hl>empty space isn\'t empty</hl>. Virtual particles constantly pop in and out of existence, borrowing energy from the vacuum for fractions of a second.',detail:'The Casimir effect proves this — two metal plates placed very close together are pushed together by the imbalance of virtual particles between and outside them.'},
        {milestone:true,text:'8 cards in. You now understand more quantum physics than most people learn in a lifetime of pop science.'},
        {text:'<hl>Quantum computing</hl> uses superposition to process many calculations simultaneously. A 300-qubit computer could represent more states than atoms in the observable universe.',detail:'Current quantum computers have fewer than 1,500 qubits and are extremely error-prone. Practical quantum advantage for general computing is still years away.'},
        {text:'The <hl>many-worlds interpretation</hl> says that every quantum measurement splits the universe into branches — one for each possible outcome. All of them are real.',detail:'In this view, Schrödinger\'s cat is alive in one branch and dead in another. You just happen to be in one of them.'},
        {text:'Quantum mechanics and general relativity — our two best theories of nature — are <hl>fundamentally incompatible</hl>. Unifying them is the biggest unsolved problem in physics.',detail:'At the Planck scale (10⁻³⁵ meters), both theories are needed but they give contradictory answers. Something has to give.'},
        {quiz:true,question:'What makes quantum tunneling useful in everyday technology?',options:['Smartphone screens','Flash memory storage','Bluetooth signals','Battery charging'],answer:1}
      ]
    }

    const DEFAULT_TOPIC = 'black holes'
    let currentTopic = ''
    let stash: string[] = []
    let startTime: number | null = null
    let scrollTimeInterval: ReturnType<typeof setInterval> | null = null

    function getCards(topic: string) {
      const key = Object.keys(TOPICS).find(k => topic.toLowerCase().includes(k))
      return TOPICS[key || DEFAULT_TOPIC]
    }

    function showToast(msg: string) {
      const t = document.getElementById('toast')!
      t.textContent = msg
      t.classList.add('show')
      setTimeout(() => t.classList.remove('show'), 2000)
    }

    function updateProgress() {
      const feed = document.getElementById('feed')!
      const scrollTop = feed.scrollTop
      const maxScroll = feed.scrollHeight - feed.clientHeight
      const pct = maxScroll > 0 ? (scrollTop / maxScroll) * 100 : 0
      document.getElementById('progress')!.style.width = pct + '%'
    }

    function updateScrollTime() {
      if (!startTime) return
      const mins = Math.floor((Date.now() - startTime) / 60000)
      document.getElementById('scroll-time')!.textContent = mins + 'm'
    }

    function createCardEl(data: any, index: number, total: number) {
      const div = document.createElement('div')
      div.className = 'card' + (data.milestone ? ' milestone' : '') + (data.quiz ? ' quiz' : '')
      div.dataset.index = String(index)

      const crumb = `<div class="topic-crumb">${currentTopic}</div>`
      const num = `<div class="card-num">${index + 1}/${total}</div>`

      if (data.quiz) {
        const optsHtml = data.options.map((o: string, i: number) =>
          `<div class="quiz-opt" data-idx="${i}" data-answer="${data.answer}">${o}</div>`
        ).join('')
        div.innerHTML = `${crumb}${num}<div class="card-inner"><div class="card-text">${data.question}</div><div class="quiz-opts">${optsHtml}</div></div>`
        setTimeout(() => {
          div.querySelectorAll('.quiz-opt').forEach(opt => {
            opt.addEventListener('click', () => {
              if (div.querySelector('.correct, .wrong')) return
              const idx = parseInt((opt as HTMLElement).dataset.idx!)
              const ans = parseInt((opt as HTMLElement).dataset.answer!)
              if (idx === ans) {
                opt.classList.add('correct')
                showToast('🧠 Nailed it.')
              } else {
                opt.classList.add('wrong')
                div.querySelectorAll('.quiz-opt')[ans].classList.add('correct')
                showToast('Not quite — but now you know.')
              }
            })
          })
        }, 0)
      } else if (data.milestone) {
        div.innerHTML = `${crumb}${num}<div class="card-inner"><div class="card-text">${data.text}</div></div>`
      } else {
        let rabbitHtml = ''
        if (index > 0 && index % 7 === 0 && !data.milestone) {
          const otherTopics = Object.keys(TOPICS).filter(t => t !== currentTopic.toLowerCase())
          if (otherTopics.length) {
            const rt = otherTopics[Math.floor(Math.random() * otherTopics.length)]
            rabbitHtml = `<div class="rabbit-link" data-topic="${rt}">This connects to ${rt} →</div>`
          }
        }
        div.innerHTML = `${crumb}${num}<div class="card-inner"><div class="card-text">${data.text.replace(/<hl>/g, '<span class="hl">').replace(/<\/hl>/g, '</span>')}</div>${data.detail ? `<div class="card-detail">${data.detail}</div>` : ''}${rabbitHtml}<div class="tap-hint">tap to expand</div></div>`

        div.addEventListener('click', (e) => {
          if ((e.target as HTMLElement).closest('.rabbit-link') || (e.target as HTMLElement).closest('.quiz-opt')) return
          div.classList.toggle('expanded')
        })

        let lastTap = 0
        div.addEventListener('touchend', (e) => {
          const now = Date.now()
          if (now - lastTap < 300) {
            e.preventDefault()
            const plain = data.text.replace(/<hl>/g,'').replace(/<\/hl>/g,'')
            if (!stash.find(s => s === plain)) {
              stash.push(plain)
              document.getElementById('stash-count')!.textContent = String(stash.length)
              showToast('📚 Saved to stash')
            }
          }
          lastTap = now
        })
      }

      setTimeout(() => {
        const rl = div.querySelector('.rabbit-link') as HTMLElement | null
        if (rl) {
          rl.addEventListener('click', () => {
            loadTopic(rl.dataset.topic!)
          })
        }
      }, 0)

      return div
    }

    function loadTopic(topic: string) {
      currentTopic = topic
      const cards = getCards(topic)
      const feed = document.getElementById('feed')!
      feed.innerHTML = ''
      cards.forEach((c: any, i: number) => feed.appendChild(createCardEl(c, i, cards.length)))
      feed.scrollTop = 0
      updateProgress()
    }

    document.getElementById('start-btn')!.addEventListener('click', () => {
      const input = (document.getElementById('topic-input') as HTMLInputElement).value.trim()
      const topic = input || DEFAULT_TOPIC
      document.getElementById('landing')!.classList.add('hidden')
      document.getElementById('bottombar')!.style.display = 'flex'
      startTime = Date.now()
      scrollTimeInterval = setInterval(updateScrollTime, 10000)
      loadTopic(topic)
    })

    document.getElementById('topic-input')!.addEventListener('keydown', (e) => {
      if ((e as KeyboardEvent).key === 'Enter') document.getElementById('start-btn')!.click()
    })

    document.getElementById('feed')!.addEventListener('scroll', updateProgress)

    document.getElementById('stash-btn')!.addEventListener('click', () => {
      const overlay = document.getElementById('stash-overlay')!
      const list = document.getElementById('stash-list')!
      list.innerHTML = stash.length
        ? stash.map(s => `<div class="stash-item">${s}</div>`).join('')
        : '<div class="stash-empty">Nothing stashed yet. Double-tap cards to save them.</div>'
      overlay.classList.add('open')
    })

    document.getElementById('close-stash')!.addEventListener('click', () => {
      document.getElementById('stash-overlay')!.classList.remove('open')
    })
  }, [])

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
*{margin:0;padding:0;box-sizing:border-box}
:root{--black:#0D0D0D;--green:#B8FF57;--orange:#FF6B35;--white:#F5F5F5;--grey:#888}
html,body{height:100%;overflow:hidden;background:var(--black);font-family:'Inter',sans-serif;color:var(--white);-webkit-tap-highlight-color:transparent;user-select:none}
#landing{position:fixed;inset:0;z-index:100;background:var(--black);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;text-align:center;transition:opacity .5s,transform .5s}
#landing.hidden{opacity:0;transform:translateY(-40px);pointer-events:none}
#landing h1{font-size:clamp(32px,8vw,56px);font-weight:900;line-height:1.1;margin-bottom:16px;letter-spacing:-1px}
#landing h1 span{color:var(--green)}
#landing .sub{font-size:clamp(15px,4vw,19px);color:var(--grey);max-width:420px;line-height:1.5;margin-bottom:40px}
.features{display:flex;flex-direction:column;gap:16px;max-width:380px;width:100%;margin-bottom:40px;text-align:left}
.features .feat{display:flex;gap:12px;align-items:flex-start;font-size:14px;line-height:1.5;color:#ccc}
.features .feat b{color:var(--white)}
.features .feat .icon{font-size:20px;flex-shrink:0;margin-top:1px}
.cta-btn{background:var(--green);color:var(--black);border:none;padding:16px 48px;font-size:18px;font-weight:700;border-radius:60px;cursor:pointer;transition:transform .15s,box-shadow .15s;letter-spacing:-.3px}
.cta-btn:hover{transform:scale(1.04);box-shadow:0 0 30px rgba(184,255,87,.3)}
.cta-btn:active{transform:scale(.97)}
.paste-area{width:100%;max-width:380px;margin-bottom:20px}
.paste-area input{width:100%;padding:14px 18px;border-radius:12px;border:1px solid #333;background:#1a1a1a;color:var(--white);font-size:15px;font-family:'Inter',sans-serif;outline:none;transition:border-color .2s}
.paste-area input:focus{border-color:var(--green)}
.paste-area input::placeholder{color:#555}
#progress{position:fixed;top:0;left:0;height:3px;background:var(--green);z-index:50;transition:width .3s;width:0;box-shadow:0 0 8px rgba(184,255,87,.4)}
#feed{height:100%;overflow-y:scroll;scroll-snap-type:y mandatory;-webkit-overflow-scrolling:touch}
.card{height:100vh;height:100dvh;scroll-snap-align:start;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:32px 24px;position:relative;transition:opacity .2s}
.card-inner{max-width:420px;width:100%}
.card .topic-crumb{position:absolute;top:16px;left:16px;font-size:11px;color:#444;letter-spacing:.5px;text-transform:uppercase}
.card .card-num{position:absolute;top:16px;right:16px;font-size:11px;color:#333}
.card-text{font-size:clamp(20px,5.5vw,26px);line-height:1.55;font-weight:600;letter-spacing:-.3px}
.card-text .hl{color:var(--green);font-weight:700}
.card-detail{margin-top:16px;font-size:14px;line-height:1.6;color:#777;max-height:0;overflow:hidden;transition:max-height .4s ease,opacity .3s;opacity:0}
.card.expanded .card-detail{max-height:200px;opacity:1}
.card .tap-hint{position:absolute;bottom:80px;font-size:12px;color:#333;letter-spacing:.5px}
.card.milestone .card-text{color:var(--green);font-size:clamp(24px,6vw,32px);font-weight:900;text-align:center}
.card.milestone{background:linear-gradient(180deg,#0D0D0D 0%,#1a2a0a 100%)}
.card.quiz .card-text{margin-bottom:20px}
.quiz-opts{display:flex;flex-direction:column;gap:10px;width:100%;max-width:420px}
.quiz-opt{padding:14px 18px;border:1px solid #333;border-radius:12px;font-size:16px;font-weight:600;cursor:pointer;transition:all .2s;background:#1a1a1a;text-align:left}
.quiz-opt:active{transform:scale(.97)}
.quiz-opt.correct{border-color:var(--green);background:#1a2a0a;color:var(--green)}
.quiz-opt.wrong{border-color:#ff4444;background:#2a0a0a;color:#ff4444}
.rabbit-link{display:inline-flex;align-items:center;gap:6px;margin-top:14px;color:var(--green);font-size:14px;font-weight:600;cursor:pointer;opacity:.7;transition:opacity .2s}
.rabbit-link:hover{opacity:1}
#bottombar{position:fixed;bottom:0;left:0;right:0;height:60px;background:linear-gradient(transparent,var(--black) 40%);display:flex;align-items:flex-end;justify-content:center;gap:32px;padding-bottom:16px;z-index:40;pointer-events:none}
#bottombar>div{pointer-events:auto;display:flex;align-items:center;gap:6px;font-size:13px;font-weight:600;color:var(--grey);cursor:pointer;transition:color .2s}
#bottombar>div:hover{color:var(--white)}
#bottombar .streak-num{color:var(--orange);font-weight:700;font-size:15px}
#bottombar .stash-num{color:var(--green);font-weight:700;font-size:15px}
#stash-overlay{position:fixed;inset:0;background:rgba(0,0,0,.92);z-index:80;display:none;flex-direction:column;padding:20px;overflow-y:auto}
#stash-overlay.open{display:flex}
#stash-overlay .stash-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px}
#stash-overlay h2{font-size:20px;font-weight:700}
#stash-overlay .close-stash{font-size:28px;color:var(--grey);cursor:pointer;background:none;border:none;padding:8px}
.stash-item{padding:14px;border:1px solid #222;border-radius:10px;margin-bottom:10px;font-size:14px;line-height:1.5;color:#ccc}
.stash-empty{color:#444;text-align:center;margin-top:40px;font-size:15px}
#toast{position:fixed;bottom:80px;left:50%;transform:translateX(-50%) translateY(20px);background:var(--green);color:var(--black);padding:10px 24px;border-radius:30px;font-size:14px;font-weight:700;opacity:0;transition:all .3s;z-index:60;pointer-events:none}
#toast.show{opacity:1;transform:translateX(-50%) translateY(0)}
@media(min-width:600px){.card{padding:48px 32px}}
      `}} />
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap" rel="stylesheet" />

      <div id="landing">
        <h1>You&apos;re going to <span>scroll anyway.</span></h1>
        <p className="sub">Paste any Wikipedia article, textbook, or PDF. We turn it into an infinite feed you can&apos;t stop swiping. You&apos;ll accidentally learn something.</p>
        <div className="features">
          <div className="feat"><span className="icon">🧠</span><span><b>Scroll → Learn</b> — Any topic becomes bite-sized cards with the same dopamine loop as your worst habits</span></div>
          <div className="feat"><span className="icon">🔥</span><span><b>Streak engine</b> — Miss a day? Your streak dies. You&apos;ll care more than you should</span></div>
          <div className="feat"><span className="icon">📸</span><span><b>Screenshot-ready stats</b> — &quot;I doomscrolled 47 minutes of quantum physics&quot; is the flex nobody knew they needed</span></div>
        </div>
        <div className="paste-area">
          <input type="text" id="topic-input" placeholder="Paste a Wikipedia URL or type a topic..." />
        </div>
        <button className="cta-btn" id="start-btn">Start Scrolling</button>
      </div>

      <div id="progress"></div>
      <div id="feed"></div>

      <div id="bottombar" style={{display:'none'}}>
        <div id="streak-display">🔥 <span className="streak-num">1</span> day · <span id="scroll-time">0m</span></div>
        <div id="stash-btn">📚 <span className="stash-num" id="stash-count">0</span></div>
      </div>

      <div id="stash-overlay">
        <div className="stash-header">
          <h2>📚 Your Stash</h2>
          <button className="close-stash" id="close-stash">×</button>
        </div>
        <div id="stash-list"></div>
      </div>

      <div id="toast"></div>
    </>
  )
}
