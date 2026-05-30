# Email draft — Alex & Doug, Stride OS v2

> Send two copies, one each. Same body. Personalize the opening line where noted.
> The link is the same one they already have (your Vercel URL — confirm it still works after pushing).

---

## Subject options (pick one)

- **A:** Stride OS v2 — took your notes, ready for you to break it again
- **B:** Quick favor — Stride OS update, want to see if I addressed your feedback?
- **C:** v2 is up — easy pace fixed, more zones, want a second look?

---

## Body

Hey [Alex / Doug],

Quick update — I went back through our call and rebuilt the calculator with what you said specifically.

The biggest fix: easy pace was showing way too hot (the 78–82% you flagged). That's now corrected — Emma at a 16:43 5K now gets about a 7:16/mile easy instead of the 6:27 I was showing you. Recovery is also exposed as its own preset for the slowest aerobic days.

I also pulled in the full zone spectrum to the front page so you don't have to dig — Recovery, Easy, Steady, Tempo, Threshold, CV, Race, VO2, Speed are all one click each, labeled with the percentages so coaches see exactly what the math is doing.

[For Doug only:] The age/training-age guardrail is actually already in there — I had it tucked under "Advanced Settings" so you wouldn't have seen it on our call. If you save an athlete and toggle that on, the easy and aerobic zones shift down for younger or developing athletes. I'm going to surface it more in the next pass.

[For Alex only:] On the multi-data-point prediction — the foundation for that is built in the athlete profile (you can log multiple PRs and the system will show where the athlete is over- or under-performing), but I want to walk you through it live since the demo I gave you didn't get into that.

Same link to play with it:
**[your Vercel URL]**

If you decide it's worth it long-term, here's the link to keep ongoing access at $20/mo:
**[your Stripe Payment Link — paste after Stripe_Setup_SOP.md Step 4]**

No pressure on the subscription — try v2 first, decide later. The app stays free to use either way for now; the link is for when you want to commit.

Try the Emma case again. If the easy pace looks right this time, I'd love 15 minutes to show you the saved-athlete side of it next week. Doug — you mentioned a couple of coaches from Reagan and Johnson; happy to send them the link directly if you want to make an intro.

Thanks for the brutal feedback. It actually made the product better.

— Anthoney

---

## Things to verify before sending

- [ ] Open the deployed URL after pushing. Try the Emma case (Female, 22, 8 years training, 55 mpw, college, 5K, 16:43).
- [ ] Click each preset chip. Confirm each one shows the labeled pace and the percentage value updates.
- [ ] Pull up the 5K → mile split at Easy (65%). Should be roughly 7:16/mile, not 6:27.
- [ ] Spot-check the recovery preset (55%). Should be ~7:48/mile for Emma.
- [ ] If you mention Doug's age-calibration ask, save an athlete and toggle Advanced Settings → Pace Guardrail → Conservative. Confirm easy zone shifts down ~5%.

## What this email deliberately does NOT do

- Doesn't promise the MileSplit data-source switch (Doug's ask). That's v3.
- Doesn't promise to expose multi-PR in the free tier. That's a future product decision.
- Doesn't ask for money. The frame is "did I address your feedback" — moneymaker pitch happens face-to-face on the next call, not in this email.

## Source of the fix (for your reference, not for the email)

Single change in `09_Products/StrideOS/index.html`, lines 3796–3805 and 3774–3776:
- Free-tier preset row went from `[80, 'Easy'], [90, 'Threshold'], [100, 'Race'], [110, 'Speed']` to the full 9-zone spectrum at the correct Canova percentages.
- Slider min dropped from 60% to 50% so the Recovery preset works.

The math: Canova multiplier = `2 - (pct/100)`. Emma's 5K race pace is 5:23/mile. At 65% Easy, multiplier 1.35 → 7:16/mile. At the old 80% default, multiplier 1.20 → 6:27/mile. That's exactly the gap Alex flagged. Fix verified.
