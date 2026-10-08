# Good Vibes sweep

The Good Vibes page (staff.iara.nyc/lineup/vibes) renders `/vibes.json`.
Phones re-check it every 5 minutes, so committing and pushing a change to
`vibes.json` (plus any new image in `img/vibes/`) is all it takes to publish.

## Rules
- Real content only. Quote text exactly; never paraphrase a review or invent one.
- Positive only: 5-star reviews, or posts/articles that are clearly enthusiastic.
  Skip anything mixed, negative, or ambiguous (log it in the run summary instead).
- Never iara's own posts, the PR agency (@hallpr), or paid placements.
- Reviewer names: first name + last initial ("Douglas R."). Instagram: the @handle.
- No em-dashes in anything we write (descriptions, pull quotes are verbatim).
- Dedupe by `id` and by `url`. Never remove an existing item unless Jay asks.

## Item shape
```
{ "id": "ig-<handle>" | "g-<first>-<initial>" | "press-<outlet>" | "shout-<slug>",
  "type": "press" | "review" | "instagram" | "shoutout" | "note",
  "source": "Google" | "Resy" | "Yelp" | "Instagram" | "<Outlet>",
  "author": "...", "stars": 5, "text": "verbatim", "pull": "short verbatim line (optional, for the hero)",
  "title": "(press headline)", "url": "https://...", "image": "/img/vibes/<id>.jpg" or https URL,
  "date": "YYYY-MM-DD or empty", "added": "YYYY-MM-DDTHH:MM", "featured": true|false }
```
`added` drives the NEW tag and sort order, so set it to the time you add the item.
Feature (hero) at most ~8 items: press plus the strongest lines.

## Sources, every run
1. **Press**: `~/Claude/iara-framer/PressGridEmbed.tsx` `DEFAULTS` (what iara.nyc/press shows).
   Any article not in vibes.json becomes a `press` item (reuse its description, image, link).
2. **Google reviews**: Google Maps place `0x89c25929263c8d83:0xec99e56bbbe34371`, Reviews tab,
   sort Newest. New 5-star reviews with text only.
3. **Instagram**: instagram.com/iara.nyc/tagged/ (Chrome is signed in). New posts by other
   accounts; screenshot the tile into `img/vibes/ig-<handle>[-n].jpg`; caption = a short exact
   phrase from their caption; url = the post link.
4. **Resy / Yelp**: iara's Resy and Yelp pages, new 5-star reviews with text.
5. **Web**: news search for "iara" "205 Allen" / "Vitor Mendes" for new articles or blogs.
6. **Jay's submissions**: screenshots or links Jay sends; screenshots go in as `note` or
   `instagram` items with the image saved to `img/vibes/`.

## Publish
Validate the JSON, commit `vibes.json` + new images with a short message, push to `main`,
then confirm https://staff.iara.nyc/vibes.json contains the new ids.
