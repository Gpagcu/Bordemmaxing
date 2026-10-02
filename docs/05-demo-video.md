# Demo video


**Link:** https://drive.google.com/drive/folders/18FoSPKT7ba4EG2APlqioqsb4gA5Ziv3-?usp=drive_link

## The structure of what I talk about in the Video

**The problem**
This is Bordemmaxing. Deciding what to do when you're bored is its own kind of friction — even a to-do list means browsing and choosing. This removes that: spin a gashapon-style wheel, get one random quest, drawn from 50 presets plus your own, weighted by rarity.

**Quick demo**  
Logged in through Cloudflare Access, spun and let the wheel land, showed an AI-generated quest already in the list, and a completed quest already in History.

**AI segment**
Walked through real entries from AI-USAGE.md: how Claude was used for the initial schema and API, the React screens, and the Cloudflare Access setup; two specific cases where it got something wrong (the unique-quest scoping bug, and the Gemini model deprecation) and how each was actually caught, by testing, not by assuming the first answer was right; then one file written personally, explained on screen.

**Technical highlight**
Opened server.js and explained the proxy-secret check — Render rejects any request without the exact header only the Cloudflare Worker knows, so the raw API URL can't be reached directly even if someone finds it.

**Challenges and what's next**
The CORS debugging between GitHub Pages and Render, specifically discovering auto-deploy had silently never triggered before finding the real cause. What I'd do differently: set up Cloudflare Access in week one instead of the final week, since retrofitting it meant redoing CORS and the deploy pipeline from scratch.


