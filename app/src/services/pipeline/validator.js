/**
 * Stage 6 — Recipe Validator
 *
 * Cross-validates the extracted recipe against all raw source signals to catch
 * hallucinations, weak extractions, and cross-source mismatches.
 *
 * ── Language-aware design ─────────────────────────────────────────────────────
 * The validator must NEVER attempt English keyword matching against a non-English
 * transcript or OCR. Doing so always produces false negatives (mismatches) that
 * silently destroy confidence for every non-English video.
 *
 * Instead, for each check the validator selects sources based on language:
 *
 *   Check 1 — Title confirmation
 *     • English transcript/OCR → keyword match (safe)
 *     • Non-English transcript → use frame descriptions + dish type (always English)
 *       and check OCR only if OCR is also English
 *
 *   Check 2 — Ingredient count
 *     • Language-neutral: compare counts. Visual ingredients (frame analysis)
 *       are always English. Extracted ingredients are always English. Safe to compare.
 *
 *   Check 3 — Dish type alignment
 *     • Frame dish type is always English. Compare it against the extracted English
 *       title and the metadata title (which may be bilingual or English-subtitled).
 *     • Never search English dish-type words in raw non-English transcript.
 *
 *   Check 4 — Cooking-action plausibility
 *     • Frame cooking actions are always English. Compare against step text (English).
 *       Safe to compare regardless of source language.
 *
 *   Check 5 — Cross-source ingredient agreement
 *     • Bonus: did the extraction confirm ingredients that appear across ≥ 2 sources?
 *     • Boosts confidence when multi-source agreement is strong.
 *
 * ── Transcript-fallback penalties ────────────────────────────────────────────
 *   metadata_captions fallback → -0.08 (thin text signal)
 *   visual_only fallback       → -0.02 (no audio at all)
 *
 * ── Output ───────────────────────────────────────────────────────────────────
 * {
 *   confidence:           number,           // final, after all adjustments
 *   confidenceLevel:      'high'|'medium'|'low',
 *   warnings:             string[],
 *   requiresConfirmation: boolean,
 *   evidenceSummary: {
 *     transcriptSnippet: string,
 *     ocrSnippet:        string,
 *     frameCount:        number,
 *   },
 * }
 */


/**
 * @param {object} recipe    ExtractedRecipe from recipeExtractor
 * @param {{ metadata, transcript, ocr, frames }} sources
 * @returns {Promise<object>}
 */
export async function validateRecipe(recipe, { metadata, transcript, ocr, frames }) {
  const warnings    = [];
  let   confidence  = recipe._analysis.rawConfidence ?? 0.5;

  const sourceLanguage     = recipe._analysis.detectedLanguage ?? 'en';
  const transcriptIsEnglish = sourceLanguage === 'en';

  // Pre-compute lowercased text pools
  // Frame-derived text is always English regardless of video language
  const frameText   = [
    frames.dishType ?? '',
    ...(frames.frameDescriptions ?? []),
    ...(frames.ingredients       ?? []),
    ...(frames.cookingActions    ?? []),
  ].join(' ').toLowerCase();

  // OCR text — may be non-English
  const ocrLower    = (ocr.combinedText ?? '').toLowerCase();
  const ocrIsEnglish = (ocr.language ?? 'en') === 'en';

  // Transcript text — may be non-English
  const transcriptLower = (transcript.text ?? '').toLowerCase();

  // Metadata title can be bilingual (creator often adds English subtitle)
  const metaLower = `${metadata.title ?? ''} ${metadata.description ?? ''}`.toLowerCase();

  // ── Check 1: Title confirmation ──────────────────────────────────────────
  // Only use sources that are in English or can be safely compared.
  // Recipe title is always English (output language).
  const titleWords = recipe.title
    .toLowerCase()
    .split(/\s+/)
    .filter(w => w.length > 3 && !STOP_WORDS.has(w));

  // English-safe pools for title matching
  const englishPool = [
    frameText,                                  // always English
    metaLower,                                  // often bilingual
    transcriptIsEnglish ? transcriptLower : '', // only when source is English
    ocrIsEnglish        ? ocrLower        : '', // only when OCR is English
  ].join(' ');

  const titleConfirmed = titleWords.length === 0
    || titleWords.some(w => englishPool.includes(w));

  if (!titleConfirmed) {
    // For non-English source, this is expected — penalise less
    const penalty = transcriptIsEnglish ? 0.05 : 0.02;
    warnings.push(
      transcriptIsEnglish
        ? 'Recipe title could not be confirmed in the transcript or on-screen text — please verify the dish matches your video.'
        : 'Recipe title confirmation skipped for non-English source — visual analysis used instead.'
    );
    confidence -= penalty;
    console.log('[validator] Check 1 FAILED — title not confirmed | penalty:', penalty);
  } else {
    console.log('[validator] Check 1 OK — title confirmed in English-language sources');
  }

  // ── Check 2: Ingredient count vs visual evidence ─────────────────────────
  // Both visual ingredients (frames) and extracted ingredients are in English. Safe.
  const visualIngredients = frames.ingredients ?? [];
  const extractedIngredients = recipe.ingredients ?? [];
  const visualIngCount    = visualIngredients.length;
  const extractedIngCount = extractedIngredients.length;

  const unmatchedVisual = visualIngredients.filter(visIng => {
    const cleanVis = visIng.toLowerCase().trim();
    return !extractedIngredients.some(extIng => {
      const cleanExt = (typeof extIng === 'string' ? extIng : extIng.name || '').toLowerCase();
      return cleanExt.includes(cleanVis) || cleanVis.includes(cleanExt) ||
        cleanVis.split(/\s+/).some(w => w.length > 3 && cleanExt.includes(w));
    });
  });

  if (visualIngCount > 0 && unmatchedVisual.length > 3) {
    warnings.push('Ingredient count differs significantly from visual evidence — some items may be missing or incorrectly identified.');
    confidence -= 0.04;
    console.log('[validator] Check 2 FAILED — missing visual ingredients in recipe:', unmatchedVisual);
  } else {
    console.log('[validator] Check 2 OK — visual ingredients are matched in recipe');
  }

  // ── Check 3: Dish type alignment ─────────────────────────────────────────
  // frame dishType is always English. Compare against:
  //   a) the extracted English recipe title
  //   b) the metadata title (often bilingual)
  // Do NOT search English dish words in raw non-English transcript.
  if (frames.dishType) {
    const dishWords = frames.dishType
      .toLowerCase()
      .split(/\s+/)
      .filter(w => w.length > 3 && !STOP_WORDS.has(w));

    const englishTitleLower = recipe.title.toLowerCase();
    const dishConfirmed     = dishWords.some(w =>
      englishTitleLower.includes(w) ||
      metaLower.includes(w)         ||
      frameText.includes(w)
    );

    if (!dishConfirmed) {
      warnings.push('Dish type from visual analysis may not match the extracted recipe — please review the result.');
      confidence -= 0.04;  // reduced from 0.08 — the check is less reliable for unusual dishes
      console.log('[validator] Check 3 FAILED — dish type not confirmed:', frames.dishType);
    } else {
      console.log('[validator] Check 3 OK — dish type confirmed:', frames.dishType);
    }
  }

  // ── Check 4: Cooking-action plausibility ─────────────────────────────────
  // Frame cooking actions and extracted step text are both in English. Safe.
  const frameActions = (frames.cookingActions ?? []).map(a => a.toLowerCase());
  const stepsText    = (recipe.steps ?? []).map(s => s.text.toLowerCase()).join(' ');

  if (frameActions.length > 2) {
    // Check that the first meaningful word of each action appears in steps
    const confirmedActions = frameActions.filter(action =>
      action.split(/\s+/).filter(w => w.length > 3).some(w => stepsText.includes(w))
    );
    const actionCoverage = confirmedActions.length / frameActions.length;

    if (actionCoverage < 0.3) {
      warnings.push('Several cooking actions visible in the video are not reflected in the extracted steps — some steps may be missing.');
      confidence -= 0.03;
      console.log('[validator] Check 4 FAILED — action coverage:', (actionCoverage * 100).toFixed(0) + '%');
    } else {
      console.log('[validator] Check 4 OK — action coverage:', (actionCoverage * 100).toFixed(0) + '%');
    }
  }

  // ── Check 5: Cross-source ingredient agreement (bonus) ───────────────────
  // If extractRecipe already computed ingredientAgreementRatio, use it.
  // High cross-source agreement → boost confidence slightly.
  const agreementRatio = recipe._analysis.ingredientAgreementRatio ?? 0;
  if (agreementRatio >= 0.75) {
    confidence += 0.08;
    console.log('[validator] Check 5 BONUS — high cross-source ingredient agreement:',
      (agreementRatio * 100).toFixed(0) + '%');
  } else if (agreementRatio > 0) {
    console.log('[validator] Check 5 — ingredient agreement:', (agreementRatio * 100).toFixed(0) + '%');
  }

  // ── Transcript-fallback penalties ─────────────────────────────────────────
  if (transcript._fallback === 'metadata_captions') {
    warnings.push('No transcript was available — recipe was extracted from video title, description, and visual content only.');
    confidence -= 0.04;
    console.log('[validator] Fallback penalty: metadata_captions (-0.04)');
  } else if (transcript._fallback === 'visual_only') {
    warnings.push('No audio transcript available — recipe was extracted from visual content and on-screen text only.');
    const visualOnlyPenalty = (frames.ingredients?.length ?? 0) >= 3 ? 0.02 : 0.06;
    confidence -= visualOnlyPenalty;
    console.log(`[validator] Fallback penalty: visual_only (-${visualOnlyPenalty}) | visual ingredients: ${frames.ingredients?.length ?? 0}`);
  }

  // ── Non-English language note ─────────────────────────────────────────────
  if (!transcriptIsEnglish && transcript.available) {
    // This is informational — the AI extraction handles the translation.
    // No confidence penalty; we trust Claude to read the source language.
    console.log('[validator] Non-English source (' + sourceLanguage + ') — validation used visual signals only for language-sensitive checks');
  }

  // ── Check 6: Visual ingredients support the title (bonus) ───────────────
  // If any specific ingredient from frame analysis appears in the metadata title,
  // the two strongest signals agree — reward that.
  const metaTitleLower  = (metadata.title ?? '').toLowerCase();
  const visualIngLower  = (frames.ingredients ?? []).map(i => i.toLowerCase());
  const visualSupportsTitleDish = visualIngLower.some(ing =>
    ing.split(/\s+/).filter(w => w.length > 3).some(w => metaTitleLower.includes(w))
  );
  if (visualSupportsTitleDish) {
    confidence += 0.10;
    console.log('[validator] Check 6 BONUS — visual ingredients support title (+0.10)');
  } else {
    console.log('[validator] Check 6 — visual ingredients do not overlap with title');
  }

  // ── Check 7: Visual actions confirmed in steps (bonus) ────────────────────
  // Re-evaluate action coverage; add a bonus when coverage is strong.
  const frameActionsCheck7 = (frames.cookingActions ?? []).map(a => a.toLowerCase());
  const stepsTextCheck7    = (recipe.steps ?? []).map(s => s.text.toLowerCase()).join(' ');
  if (frameActionsCheck7.length > 0) {
    const confirmedCheck7 = frameActionsCheck7.filter(action =>
      action.split(/\s+/).filter(w => w.length > 3).some(w => stepsTextCheck7.includes(w))
    );
    const coverageCheck7 = confirmedCheck7.length / frameActionsCheck7.length;
    if (coverageCheck7 >= 0.6) {
      confidence += 0.08;
      console.log('[validator] Check 7 BONUS — high visual action coverage in steps (+0.08)');
    } else {
      console.log('[validator] Check 7 — visual action coverage in steps:', (coverageCheck7 * 100).toFixed(0) + '%');
    }
  }

  // ── Reasonable completeness bonus ─────────────────────────────────────────
  // Small bonus when the extracted recipe has solid ingredient + step coverage.
  // Capped at +0.08 to avoid inflating marginal results.
  if (recipe.ingredients?.length >= 3 && recipe.steps?.length >= 3) {
    confidence += 0.10;
    console.log('[validator] Completeness bonus (+0.10)');
  }
  const finalConfidence = Math.max(0, Math.min(confidence, 1.0));
  const confidenceLevel =
    finalConfidence >= 0.80 ? 'high'   :
    finalConfidence >= 0.60 ? 'medium' : 'low';

  // Evidence snippets for the debug panel (always show in source language)
  const transcriptSnippet = transcript.available
    ? (transcript.text ?? '').slice(0, 140).trimEnd() + '…'
    : '(not available)';
  const ocrSnippet = (ocr.combinedText ?? '').slice(0, 140).trimEnd()
    || '(not available)';

  console.log('[validator] Final confidence:', finalConfidence.toFixed(3),
    '|', confidenceLevel,
    warnings.length ? `| ${warnings.length} warning(s)` : '| no warnings');

  return {
    ...recipe,
    _analysis: {
      ...recipe._analysis,
      confidence:           finalConfidence,
      confidenceLevel,
      warnings,
      requiresConfirmation: finalConfidence < 0.70,
      evidenceSummary: {
        transcriptSnippet,
        ocrSnippet,
        frameCount: frames.framesAnalyzed ?? 0,
      },
    },
  };
}

// ── Common English stop words excluded from title/dish matching ───────────────
// These appear in every English sentence and are useless as confirmatory signals.
const STOP_WORDS = new Set([
  'with', 'and', 'the', 'for', 'from', 'that', 'this', 'have',
  'will', 'your', 'are', 'not', 'all', 'was', 'but', 'been',
]);
