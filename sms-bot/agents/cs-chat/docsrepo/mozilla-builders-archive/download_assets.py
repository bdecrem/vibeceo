#!/usr/bin/env python3
import subprocess
import os

# Showcase images from alumni.html
showcase_images = [
    "adacraft.png", "Afroomart.png", "Ameelio.jpg", "arc.png", "Badhat.png",
    "blockparty.png", "Cabal.png", "campop.png", "ChestnutAI.png", "cinevva.png",
    "CovidVelocity.jpg", "credder.png", "darkforest.png", "disco.png", "dns.png",
    "Earthstar.png", "Finary.png", "Flatend.png", "geecko.png", "Gem.png",
    "GoSpendLocal.png", "hackernoon.jpeg", "herhealth.png", "huggnote.png", "humanid.jpg",
    "Impactful.png", "Jam-Sesh.png", "jothefish.png", "kanary.jpeg", "kosmi.png",
    "Lumos.png", "massive.jpeg", "mbmotion.png", "mbtalium.png", "Meething.png",
    "memex.png", "mobius.png", "Mobius.png", "mogul.png", "Neutral.png",
    "NewsAtlas.png", "orca.jpg", "P2P-CDN.png", "pory.png", "Potato-land.png",
    "Quadrant-Health.png", "quadrant.png", "rant.png", "raven.jpg", "readocracy.png",
    "realms.png", "relay.png", "Remote-Students.png", "rendez.jpg", "superduper.png",
    "taonga.png", "ThinkLocal.jpg", "Trofi.png", "trustmarkit.png", "umbrel.png",
    "unCached.png", "UnstoppableDomains.png", "ununu.png", "venture.jpg", "Vizly.jpg",
    "Vngle.png", "voiceblasts.png"
]

# Team member images from index.html
team_images = [
    "afua-bruce.png", "bart.jpg", "bijan-marashi.jpg", "chris-ategeka.jpg",
    "daniel-vogel.jpg", "emilykager.jpg", "holly-liu.jpg", "kathy-pham-bw.jpg",
    "mariaalegre.jpg", "mark-mayo.jpg", "mullenweg.jpg", "neeharika.jpg",
    "noah-karesh.png", "parisa-tabriz.jpg", "patrick-lee.jpg", "patrick-lu.jpeg",
    "prerna-gupta.jpg", "tanya-soman.png", "share.jpg"
]

os.chdir("assets/showcase")
for img in showcase_images:
    url = f"https://web.archive.org/web/20240229114449/https://builders.mozilla.community/assets/showcase/{img}"
    print(f"Downloading {img}...")
    subprocess.run(["curl", "-L", "-s", url, "-o", img])

os.chdir("../img")
for img in team_images:
    url = f"https://web.archive.org/web/20240229114449/https://builders.mozilla.community/assets/img/{img}"
    print(f"Downloading {img}...")
    subprocess.run(["curl", "-L", "-s", url, "-o", img])

print("Done downloading all images!")
