import { createHash } from "node:crypto";

export type ArtifactFormat = "html" | "jsx" | "source" | "text";

export type CriterionSignal = {
  criterion: string;
  signals: string[];
};

export type ArtifactAnalysis = {
  format: ArtifactFormat;
  characterCount: number;
  sha256: string;

  structure: {
    hasDoctype: boolean;
    hasHtmlRoot: boolean;
    hasHead: boolean;
    hasBody: boolean;
    footerCount: number;
    navigationCount: number;
    headingCount: number;
    imageCount: number;
    imagesWithAltCount: number;
    linkCount: number;
    formCount: number;
    scriptCount: number;
    styleBlockCount: number;
    mediaQueryCount: number;
    responsiveUtilityCount: number;
    pricingMarkerCount: number;
    testimonialMarkerCount: number;
    ariaAttributeCount: number;
  };

  observations: string[];

  criterionSignals: CriterionSignal[];

  security: {
    suspiciousInstructionCount: number;
    suspiciousInstructions: {
      type: string;
      excerpt: string;
    }[];
  };
};

function countMatches(content: string, pattern: RegExp): number {
  return content.match(pattern)?.length ?? 0;
}

function countAttributeMarkers(
  content: string,
  attribute: "class" | "id",
  keywords: RegExp,
): number {
  const attributes = content.matchAll(
    new RegExp(`\\b${attribute}\\s*=\\s*(["'])(.*?)\\1`, "gis"),
  );

  let count = 0;

  for (const match of attributes) {
    if (keywords.test(match[2])) {
      count++;
    }
  }

  return count;
}

function detectFormat(content: string): ArtifactFormat {
  const looksLikeMarkup =
    /<!doctype\s+html|<html\b|<body\b|<section\b|<div\b/i.test(content);

  const looksLikeJsx =
    /\bclassName\s*=/.test(content) ||
    /export\s+default\s+function\b/.test(content) ||
    /<[A-Z][A-Za-z0-9.]*(?:\s|\/?>)/.test(content);

  if (looksLikeJsx) return "jsx";
  if (looksLikeMarkup) return "html";

  if (/\b(?:import|export|function|const|let|var|class)\b/.test(content)) {
    return "source";
  }

  return "text";
}

const INJECTION_PATTERNS: {
  type: string;
  pattern: RegExp;
}[] = [
  {
    type: "Instruction override",
    pattern: /ignore\s+(?:all\s+)?(?:previous|prior|above)\s+instructions/i,
  },
  {
    type: "Verification manipulation",
    pattern:
      /(?:mark|declare|consider)\s+(?:this|the submission|the deliverable)?\s*(?:as\s+)?approved/i,
  },
  {
    type: "Verifier-directed instruction",
    pattern:
      /(?:AI verifier|verification agent|TrustLayer)\s*[:,]?\s*(?:ignore|override|approve|bypass)/i,
  },
  {
    type: "System prompt extraction",
    pattern:
      /(?:reveal|print|expose|show)\s+(?:the\s+)?(?:system prompt|hidden instructions)/i,
  },
];

function detectSuspiciousInstructions(content: string) {
  const matches: {
    type: string;
    excerpt: string;
  }[] = [];

  for (const rule of INJECTION_PATTERNS) {
    const match = rule.pattern.exec(content);

    if (!match) continue;

    const start = Math.max(0, match.index - 50);
    const end = Math.min(content.length, match.index + match[0].length + 80);

    matches.push({
      type: rule.type,
      excerpt: content.slice(start, end).replace(/\s+/g, " ").trim(),
    });
  }

  return matches;
}

export function analyzeArtifact(
  content: string,
  criteria: string[] = [],
): ArtifactAnalysis {
  const normalized = content.slice(0, 1_000_000);

  const pricingMarkerCount =
    countAttributeMarkers(
      normalized,
      "class",
      /pricing|price-card|pricing-card|plan-card/i,
    ) +
    countAttributeMarkers(
      normalized,
      "id",
      /pricing|price-card|pricing-card|plan-card/i,
    );

  const testimonialMarkerCount =
    countAttributeMarkers(
      normalized,
      "class",
      /testimonial|review-card|customer-quote/i,
    ) +
    countAttributeMarkers(
      normalized,
      "id",
      /testimonial|review-card|customer-quote/i,
    );

  const structure = {
    hasDoctype: /<!doctype\s+html/i.test(normalized),
    hasHtmlRoot: /<html\b/i.test(normalized),
    hasHead: /<head\b/i.test(normalized),
    hasBody: /<body\b/i.test(normalized),

    footerCount: countMatches(normalized, /<footer\b/gi),
    navigationCount: countMatches(normalized, /<nav\b/gi),
    headingCount: countMatches(normalized, /<h[1-6]\b/gi),
    imageCount: countMatches(normalized, /<img\b/gi),
    imagesWithAltCount: countMatches(normalized, /<img\b[^>]*\balt\s*=/gi),
    linkCount: countMatches(normalized, /<a\b/gi),
    formCount: countMatches(normalized, /<form\b/gi),
    scriptCount: countMatches(normalized, /<script\b/gi),
    styleBlockCount: countMatches(normalized, /<style\b/gi),
    mediaQueryCount: countMatches(normalized, /@media\b/gi),
    responsiveUtilityCount: countMatches(
      normalized,
      /\b(?:sm|md|lg|xl|2xl):[A-Za-z0-9_-]+/g,
    ),
    pricingMarkerCount,
    testimonialMarkerCount,
    ariaAttributeCount: countMatches(normalized, /\baria-[a-z-]+\s*=/gi),
  };

  const observations: string[] = [];

  if (structure.hasHtmlRoot) {
    observations.push("HTML root element detected.");
  }

  if (structure.hasHead && structure.hasBody) {
    observations.push("HTML head and body elements detected.");
  }

  observations.push(`${structure.footerCount} footer element(s) detected.`);

  observations.push(`${structure.linkCount} anchor element(s) detected.`);

  observations.push(
    `${structure.imageCount} image element(s) detected; ` +
      `${structure.imagesWithAltCount} have alt attributes.`,
  );

  observations.push(
    `${structure.mediaQueryCount} CSS media query/queries detected.`,
  );

  observations.push(
    `${structure.responsiveUtilityCount} responsive utility token(s) detected.`,
  );

  observations.push(
    `${structure.pricingMarkerCount} pricing-related class/id marker(s) detected.`,
  );

  observations.push(
    `${structure.testimonialMarkerCount} testimonial-related class/id marker(s) detected.`,
  );

  observations.push(
    "Static source analysis does not establish that the page renders correctly.",
  );

  const criterionSignals = criteria.map((criterion) => {
    const signals: string[] = [];
    const requirement = criterion.toLowerCase();

    if (/responsive|mobile|tablet|screen size/.test(requirement)) {
      signals.push(`Media queries found: ${structure.mediaQueryCount}.`);
      signals.push(
        `Responsive utility tokens found: ${structure.responsiveUtilityCount}.`,
      );
    }

    if (/footer/.test(requirement)) {
      signals.push(`Footer elements found: ${structure.footerCount}.`);
    }

    if (/pricing|price|plans?/.test(requirement)) {
      signals.push(
        `Pricing-related class/id markers found: ${structure.pricingMarkerCount}.`,
      );
    }

    if (/testimonial|customer review|client review/.test(requirement)) {
      signals.push(
        `Testimonial-related class/id markers found: ${structure.testimonialMarkerCount}.`,
      );
    }

    if (/links?|navigation|navbar|menu/.test(requirement)) {
      signals.push(`Anchor elements found: ${structure.linkCount}.`);
      signals.push(`Navigation elements found: ${structure.navigationCount}.`);
    }

    if (/images?|alt text|accessibility/.test(requirement)) {
      signals.push(
        `Images with alt attributes: ${structure.imagesWithAltCount} of ${structure.imageCount}.`,
      );
      signals.push(`ARIA attributes found: ${structure.ariaAttributeCount}.`);
    }

    if (signals.length === 0) {
      signals.push(
        "No specific structural heuristic applies; further content evaluation is required.",
      );
    }

    return { criterion, signals };
  });

  const suspiciousInstructions = detectSuspiciousInstructions(normalized);

  return {
    format: detectFormat(normalized),
    characterCount: content.length,
    sha256: createHash("sha256").update(content).digest("hex"),

    structure,
    observations,
    criterionSignals,

    security: {
      suspiciousInstructionCount: suspiciousInstructions.length,
      suspiciousInstructions,
    },
  };
}
