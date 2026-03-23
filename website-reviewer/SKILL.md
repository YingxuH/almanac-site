---
name: website-reviewer
description: "Simulated first-visit review of the Almanac website (yingxuh.github.io/almanac-site/) by 4 user personas plus a meta-reviewer. Use this skill whenever someone asks to review the Almanac site, get website feedback, check how the site lands with users, or run a UX review. Also trigger on 'how does the site look', 'review the landing page', 'get feedback on Almanac', or 'run site reviewers'."
---

# Almanac Website Reviewer

> ⚠️ **THIS SKILL IS FOR WEBSITE / LANDING PAGE UX REVIEW ONLY.**
> Do NOT use this skill to review written articles or blog posts.
> For technical article review → use the `technical-blog-reviewer` skill instead.

Simulate 5 independent first-visit reviews of the Almanac website, then aggregate findings.

## Target

https://yingxuh.github.io/almanac-site/

## Persona Reference Files

Read from `references/` when executing each reviewer. Each file has the persona backstory, scoring rubric, and output format.

| File | Persona | Simulates |
|------|---------|-----------|
| `references/persona_ml_lead.md` | The ML Tech Lead | Senior engineer evaluating signal quality and methodology |
| `references/persona_fresh_grad.md` | The Fresh Grad | Junior dev deciding if this is worth following |
| `references/persona_skeptic.md` | The Skeptic | Experienced forecasting practitioner stress-testing claims |
| `references/persona_product.md` | The Product Person | PM/founder evaluating positioning and conversion |
| `references/persona_meta.md` | The Meta-Reviewer | Aggregates all 4 reviews into actionable fixes |

## Workflow

1. **Fetch the site.** Use WebFetch on the target URL to get current content. Then run `curl -s <URL> | grep 'data-value'` to extract JS-animated values (see caveat below).
2. **Run all 4 audience personas in parallel.** Each reads their reference file, then reviews the fetched site content. No dependencies between them.
3. **Run the meta-reviewer.** Feed it all 4 persona reviews. It produces the top 3 issues and a summary.
4. **Save results** to `latest-review.md` in this skill's directory.

### JS-Animated Values Caveat

The Almanac site uses JavaScript animations (e.g., gauge counters that start at 0 and animate to their real value). WebFetch and static HTML fetches capture the **initial state before JS runs**, so animated metrics will show 0% or empty. To get the real values:

1. Run `curl -s <URL>` and look for `data-value`, `data-target`, or similar HTML attributes that hold the final value.
2. When providing site content to persona reviewers, **always replace the static text with the `data-value` attribute values**. For example, if the HTML says `<span data-value="76">0</span>`, report "System Confidence: 76%", not "0%".
3. Note in the site content block: "Values below are extracted from data attributes (post-animation targets), not the initial render state."

This prevents reviewers from flagging JS animation starting states as bugs or broken metrics.

## Scoring (per persona)

Each persona scores 4 dimensions on a 1-10 scale:

| Dimension | What it measures |
|-----------|-----------------|
| First Impression | Would I stay past 5 seconds? Does the page load, look credible, communicate purpose? |
| Value Prop Clarity | Do I understand what this is and why I'd care — in under 15 seconds? |
| Trust & Credibility | Do I believe the data, methodology, and predictions? Or does it feel like AI slop? |
| Would Subscribe | Binary Y/N + one-sentence reason. The ultimate conversion signal. |

**Overall score** = unweighted average of the three 1-10 dimensions.

## Score Calibration

Reviewers must anchor scores to this scale — do not inflate:

| Score | Meaning |
|:-----:|---------|
| 9-10 | Exceptional. Best-in-class execution you'd hold up as an example. Rarely given. |
| 8 | Genuinely impressive. No significant issues. You'd recommend this to peers unprompted. |
| 7 | Solid. Works, but you can name specific things holding it back. |
| 5-6 | Mediocre. Functional but forgettable. Would not recommend or return. |
| 3-4 | Below average. Clear problems that would cause many visitors to leave. |
| 1-2 | Broken or actively harmful to the user experience. |

A score of 7 should feel like a stretch, not a default. Most early-stage products land in the 4-6 range.

## Acceptance Criteria

| Criterion | Threshold |
|-----------|-----------|
| Average score across personas | >= 8.0 |
| No persona scores below | 6 on any dimension |
| Meta-reviewer critical issues | 0 (issues that would cause a visitor to leave) |

## Output

Results are saved to `latest-review.md` with: per-persona scores, subscribe decisions, the meta-reviewer's top 3 issues, and a pass/fail verdict.
