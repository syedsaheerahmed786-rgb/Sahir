'use strict';

/**
 * Cleaning for the shapes the two live booking sheets actually contain.
 *
 * Every function here is deliberately conservative: when a value cannot be read with
 * confidence it returns null and records why, rather than guessing. The import script
 * turns those reasons into a review list. Silently "fixing" a wrong phone number or a
 * wrong wedding date is worse than leaving it flagged.
 */

const PHONE_MIN = 6; // Indian mobile numbers start 6-9.

/**
 * Phone numbers in the sheets appear as 6001744676, 918638445693, 917002564366,
 * ' 84729 90090' and 70021623319 (eleven digits - a typo). Normalise to E.164 where
 * the number is unambiguous, otherwise return valid: false and keep the raw value.
 */
function phone(raw) {
  const original = raw == null ? '' : String(raw).trim();
  let digits = original.replace(/\D/g, '');

  // Strip an international prefix: 0091..., 91..., or a leading trunk 0.
  if (digits.length > 10 && digits.startsWith('0091')) digits = digits.slice(4);
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);

  if (digits.length !== 10 || Number(digits[0]) < PHONE_MIN) {
    return { e164: null, raw: original, valid: false, reason: digits.length + ' digits after cleaning' };
  }
  return { e164: '+91' + digits, raw: original, valid: true, reason: null };
}

/** Six-digit Indian PIN, from a dedicated column or from the tail of a free-text address. */
function pincode(value) {
  const s = value == null ? '' : String(value);
  const explicit = s.match(/PIN\s*(?:code)?\s*[:\-]?\s*(\d{6})/i);
  if (explicit) return explicit[1];
  const bare = s.match(/\b(\d{6})\b/);
  return bare ? bare[1] : null;
}

/** The address column carries the PIN inline and wraps across lines. Keep the prose, drop the PIN. */
function address(value) {
  return String(value == null ? '' : value)
    .replace(/PIN\s*(?:code)?\s*[:\-]?\s*\d{6}\s*$/i, '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join(', ')
    .replace(/\s*,\s*,+/g, ',')
    .replace(/[,\s]+$/, '')
    .trim();
}

/** Collapse the stray spacing and keep the customer's own capitalisation and script. */
function name(value) {
  return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
}

/** 'dd/mm/yyyy hh:mm:ss' as the sheets write it. Returns null rather than an Invalid Date. */
function sheetTimestamp(value) {
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  const m = String(value == null ? '' : value).trim()
    .match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ ,]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (!m) return null;
  const d = new Date(Date.UTC(
    Number(m[3]), Number(m[2]) - 1, Number(m[1]),
    Number(m[4] || 0), Number(m[5] || 0), Number(m[6] || 0)
  ));
  return isNaN(d.getTime()) ? null : d;
}

/** An ISO calendar date with no time or zone, which is what a wedding date is. */
function isoDate(value) {
  if (value instanceof Date && !isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  const s = String(value == null ? '' : value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmy) {
    return dmy[3] + '-' + dmy[2].padStart(2, '0') + '-' + dmy[1].padStart(2, '0');
  }
  return null;
}

/**
 * The cards form writes the literal string 'Decide on WhatsApp' into the inside-card URL
 * column. That is a pending decision, not a URL, so it becomes null plus a flag.
 */
function optionalUrl(value) {
  const s = String(value == null ? '' : value).trim();
  if (!s) return { url: null, pending: false };
  if (!/^https?:\/\//i.test(s)) return { url: null, pending: true };
  return { url: s, pending: false };
}

/** The boards form puts several Drive links in one cell, newline- or space-separated. */
function urlList(value) {
  return String(value == null ? '' : value)
    .split(/[\s\n]+/)
    .map((s) => s.trim())
    .filter((s) => /^https?:\/\//i.test(s));
}

/**
 * The boards sheet encodes the whole configuration in one cell, e.g.
 *   'B1 - Caricature (Haldi & Chooda) | Design: Catalogue Design (https://...) | Txt: None | Date: 2026-09-21'
 *   'B1 - Standard (Annaprashan) | Design: Custom Upload | Txt: None | Date: N/A'
 * Pull it apart so the fields become queryable. Anything unparsed stays in `rest`.
 */
function boardConfig(value) {
  const s = String(value == null ? '' : value).trim();
  const out = {
    package: null, edition: null, event_name: null,
    design_kind: null, design_url: null, display_text: null, date: null, rest: null
  };
  if (!s) return out;

  const parts = s.split('|').map((p) => p.trim());
  const head = parts.shift() || '';
  const headMatch = head.match(/^(\S+)\s*-\s*(Standard|Caricature|Photo)\s*(?:\(([\s\S]*)\))?\s*$/i);
  if (headMatch) {
    out.package = headMatch[1];
    out.edition = headMatch[2].toLowerCase();
    out.event_name = headMatch[3] ? headMatch[3].trim() : null;
  } else {
    out.rest = head;
  }

  for (const part of parts) {
    const design = part.match(/^Design:\s*(Catalogue Design|Custom Upload)\s*(?:\((.*)\))?\s*$/i);
    if (design) {
      out.design_kind = /custom/i.test(design[1]) ? 'custom' : 'catalogue';
      out.design_url = design[2] && /^https?:\/\//i.test(design[2].trim()) ? design[2].trim() : null;
      continue;
    }
    const txt = part.match(/^Txt:\s*([\s\S]*)$/i);
    if (txt) {
      const v = txt[1].trim();
      out.display_text = (!v || /^(none|n\/a)$/i.test(v)) ? null : v;
      continue;
    }
    const date = part.match(/^Date:\s*(.*)$/i);
    if (date) {
      out.date = isoDate(date[1].trim());
      continue;
    }
    out.rest = out.rest ? out.rest + ' | ' + part : part;
  }
  return out;
}

/** Editions are a closed set on the boards form. */
function edition(value) {
  const s = String(value == null ? '' : value).trim().toLowerCase();
  return ['standard', 'caricature', 'photo'].indexOf(s) >= 0 ? s : null;
}

module.exports = {
  phone, pincode, address, name, sheetTimestamp, isoDate,
  optionalUrl, urlList, boardConfig, edition
};
