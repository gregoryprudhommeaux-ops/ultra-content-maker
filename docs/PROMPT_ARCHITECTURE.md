# PROMPT_ARCHITECTURE — ULTRA CONTENT MAKER (v2)

**Persona generation:** the expert `promptText` and `gaps` are written in `author.contentLanguage` (fallback: UI locale). **Article generation** uses the same language for post bodies.

Enforce in Server Actions:

1. User session valid (Firebase ID token).  
2. `persona.status === validated` before article generation.  
3. Zod-validate all LLM JSON outputs.  
4. Timeout: Persona 60s, articles 90s, revision 45s.

---

## Inputs assembled from Firestore

| Prompt | Inputs |
|--------|--------|
| `persona_generate` | `author`, `audience` (if not skipped), `sources[]` URLs, `contentLanguage` |
| `articles_generate` | `persona.promptText` (validated), `contentLanguage`, optional `audience` |
| `article_revise` | `persona.promptText`, current article, `refinement` answers + comments |

**MVP:** URLs are passed as plain text references; no scraped page body unless added later.

---

## 1. `persona_generate`

**Model:** `gpt-4o`  
**Output:** `{ "promptText": string, "gaps": string[] }`  

`promptText` = long expert system prompt (target: 2 000–8 000+ tokens allowed). Structure inside the text:

- Role: expert LinkedIn ghostwriter for this author  
- Author context (from URLs + optional short fields)  
- Audience context (light sketch)  
- Voice & tone rules  
- Structure of a strong LinkedIn post for this author  
- Topics to emphasize / avoid  
- Hook patterns, body length, formatting (line breaks, bullets)  
- What **not** to do (generic fluff, wrong audience, etc.)  
- How to use Large vs niche angles if relevant  
- Placeholder section for CTA (signature added at article validation, not in Persona)

**System (summary):**  
You are a senior B2B LinkedIn strategist. Produce a **complete expert prompt** in the language given by `contentLanguage` / `personaLanguage` (`en` | `fr` | `es`). Posts and `gaps` use the same language. If URLs were not fetched, infer carefully from URL labels/types.

**User variables:** `{author}`, `{audience}`, `{sources}`, `{contentLanguage}`

---

## 2. `articles_generate`

**Model:** `gpt-4o`  
**Input:** validated `persona.promptText`  
**Output:**

```json
{
  "articles": [
    { "hook": "...", "body": "...", "ps": "..." }
  ]
}
```

Exactly **4** items (or **3** if product flag — default **4**).

**Instruction:** Write in `{contentLanguage}`. Each post must follow the Persona. Vary angles (story, insight, contrarian, how-to). Do **not** include final CTA line—user adds at validation.

---

## 3. `article_revise`

**Model:** `gpt-4o`  
**Input:** `persona.promptText`, current `{hook, body, ps}`, `refinement` map  
**Output:** `{ "hook", "body", "ps" }`  

**Instruction:** Apply user answers to tone/theme/length/hook and `globalComment`. Keep language. Preserve author voice per Persona.

---

## 4. Refinement questions (fixed — not LLM-generated in MVP)

| id | questionKey (i18n) | Purpose |
|----|-------------------|---------|
| `tone` | `refinement.tone` | Voice fit |
| `theme` | `refinement.theme` | Topic/angle fit |
| `length` | `refinement.length` | Too long/short |
| `hook` | `refinement.hook` | Opening strength |

Answers: `yes` | `no` | `partial` (or 1–5 scale in UI).

---

## 5. CTA assembly (no LLM in MVP)

On validate, server builds:

```txt
{body}

{ps if any}

{cta.text}
{cta.linkUrl if any}
```

Stored in `article.exportText`.

---

## 6. Removed prompts (v1)

| v1 prompt | v2 |
|-----------|-----|
| `content_brain_generate` (12 blocks) | `persona_generate` (single `promptText`) |
| `post_ideas_generate` (10 ideas) | removed |
| `editorial_calendar_generate` | removed |
| `post_draft_large` / `post_draft_niche` | `articles_generate` + `article_revise` |

---

## 7. Prompt storage

- Templates: `docs/prompts/*.md` or `src/lib/prompts/*.ts`  
- Not stored in Firestore for MVP  
- Log each run in `users/{uid}/generations/{id}`

---

## Related docs

`PRD.md`, `DATA_MODEL.md`, `USER_FLOW.md`
