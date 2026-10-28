// A small HCL reader for the subset used by these modules.
//
// The demo needs to show real module inputs and outputs, and the validator
// needs to compare declarations with usages. A full HCL parser (expressions,
// functions, for expressions) is not required for either, so this scanner
// understands blocks, labels and attribute values and leaves expressions as
// raw source text. It is deliberately lenient: syntax balance is checked by
// `syntaxIssues`, and everything else is inspected structurally.

/** Replace strings, heredocs and comments with spaces, preserving offsets. */
export function maskSource(source) {
  const chars = source.split("");
  const out = source.split("");
  let index = 0;
  const blank = (from, to) => { for (let i = from; i < to; i++) if (chars[i] !== "\n") out[i] = " "; };

  while (index < chars.length) {
    const ch = chars[index];
    const next = chars[index + 1];

    if (ch === "#") {
      const end = source.indexOf("\n", index);
      const stop = end === -1 ? source.length : end;
      blank(index, stop);
      index = stop;
      continue;
    }
    if (ch === "/" && next === "/") {
      const end = source.indexOf("\n", index);
      const stop = end === -1 ? source.length : end;
      blank(index, stop);
      index = stop;
      continue;
    }
    if (ch === "/" && next === "*") {
      const end = source.indexOf("*/", index + 2);
      const stop = end === -1 ? source.length : end + 2;
      blank(index, stop);
      index = stop;
      continue;
    }
    if (ch === "<" && next === "<") {
      const header = source.slice(index).match(/^<<-?([A-Za-z_][A-Za-z0-9_]*)/);
      if (header) {
        const marker = header[1];
        const lineEnd = source.indexOf("\n", index);
        let cursor = lineEnd === -1 ? source.length : lineEnd + 1;
        while (cursor < source.length) {
          const close = source.indexOf("\n", cursor);
          const stop = close === -1 ? source.length : close;
          if (source.slice(cursor, stop).trim() === marker) break;
          cursor = stop + 1;
        }
        blank(index + 2, cursor);
        index = cursor;
        continue;
      }
    }
    if (ch === '"' || ch === "'") {
      const quote = ch;
      let cursor = index + 1;
      while (cursor < chars.length) {
        if (chars[cursor] === "\\" && quote === '"') { cursor += 2; continue; }
        if (chars[cursor] === quote) break;
        cursor++;
      }
      blank(index + 1, cursor);
      index = cursor + 1;
      continue;
    }
    index++;
  }
  return out.join("");
}

/** Structural balance check for braces, brackets and parentheses. */
export function syntaxIssues(source) {
  const masked = maskSource(source);
  const issues = [];
  const stack = [];
  const pairs = { "}": "{", "]": "[", ")": "(" };
  for (let index = 0; index < masked.length; index++) {
    const ch = masked[index];
    if (ch === "{" || ch === "[" || ch === "(") stack.push({ ch, index });
    else if (ch in pairs) {
      const open = stack.pop();
      if (!open) issues.push(`unexpected "${ch}" at offset ${index}`);
      else if (open.ch !== pairs[ch]) issues.push(`"${open.ch}" closed by "${ch}" at offset ${index}`);
    }
  }
  for (const open of stack) issues.push(`unclosed "${open.ch}" at offset ${open.index}`);
  if (masked.split("\n").length > 1 && !source.endsWith("\n")) issues.push("file does not end with a newline");
  return issues;
}

const isLineStart = (masked, index) => {
  let cursor = index - 1;
  while (cursor >= 0 && (masked[cursor] === " " || masked[cursor] === "\t")) cursor--;
  return cursor < 0 || masked[cursor] === "\n";
};

function readWord(masked, index) {
  const match = masked.slice(index).match(/^[A-Za-z_][A-Za-z0-9_-]*/);
  return match ? { value: match[0], end: index + match[0].length } : null;
}

function readString(source, masked, index) {
  if (source[index] !== '"') {
    const word = readWord(masked, index);
    return word ? { value: word.value, end: word.end, quoted: false } : null;
  }
  let end = index + 1;
  while (end < source.length) {
    if (source[end] === "\\") { end += 2; continue; }
    if (source[end] === '"') break;
    end++;
  }
  return { value: source.slice(index + 1, end), end: end + 1, quoted: true };
}

function matchingBrace(masked, openIndex) {
  let depth = 0;
  for (let index = openIndex; index < masked.length; index++) {
    if (masked[index] === "{") depth++;
    else if (masked[index] === "}") {
      depth--;
      if (depth === 0) return index;
    }
  }
  return -1;
}

/** Parse one body (a file or the inside of a block) into attributes and blocks. */
function parseBody(source, masked, start, end) {
  const attributes = {};
  const blocks = [];
  let index = start;

  while (index < end) {
    while (index < end && /\s/.test(source[index])) index++;
    if (index >= end) break;
    if (!isLineStart(masked, index)) { index++; continue; }

    const word = readWord(masked, index);
    if (!word) { index++; continue; }

    // Read labels until `{` (block) or `=` (attribute).
    let cursor = word.end;
    const labels = [];
    let mode = null;
    while (cursor < end) {
      while (cursor < end && (source[cursor] === " " || source[cursor] === "\t")) cursor++;
      if (source[cursor] === "{") { mode = "block"; break; }
      if (source[cursor] === "=") { mode = "attribute"; break; }
      if (source[cursor] === "\n") { mode = "bare"; break; }
      const label = readString(source, masked, cursor);
      if (!label) break;
      labels.push(label.value);
      cursor = label.end;
    }

    if (mode === "block") {
      const close = matchingBrace(masked, cursor);
      if (close === -1) break;
      const body = parseBody(source, masked, cursor + 1, close);
      blocks.push({ type: word.value, labels, attributes: body.attributes, blocks: body.blocks, source: source.slice(index, close + 1) });
      index = close + 1;
      continue;
    }

    if (mode === "attribute") {
      cursor++; // skip `=`
      const valueStart = cursor;
      let depth = 0;
      while (cursor < end) {
        const ch = masked[cursor];
        if (ch === "(" || ch === "[" || ch === "{") depth++;
        else if (ch === ")" || ch === "]" || ch === "}") depth--;
        else if (ch === "\n" && depth <= 0) break;
        cursor++;
      }
      attributes[word.value] = source.slice(valueStart, cursor).trim();
      index = cursor;
      continue;
    }

    index = Math.max(word.end, index + 1);
  }

  return { attributes, blocks };
}

/** Parse a .tf file into `{ attributes, blocks }`. */
export function parseHcl(source) {
  const text = String(source ?? "");
  const masked = maskSource(text);
  return parseBody(text, masked, 0, text.length);
}

export function blocksOfType(blocks, type) {
  return blocks.filter((block) => block.type === type);
}

export function findBlock(blocks, type, label) {
  return blocks.find((block) => block.type === type && (label === undefined || block.labels[0] === label)) || null;
}

export function unquote(value) {
  if (value === undefined || value === null) return value;
  const text = String(value).trim();
  if (text.startsWith('"') && text.endsWith('"')) return text.slice(1, -1);
  return text;
}

/** Remove comments but keep string interpolations, where `var.x` usually lives. */
function stripComments(source) {
  const chars = source.split("");
  const out = source.split("");
  let index = 0;
  const blank = (from, to) => { for (let i = from; i < to; i++) if (chars[i] !== "\n") out[i] = " "; };
  while (index < chars.length) {
    const ch = chars[index];
    const next = chars[index + 1];
    if (ch === "#" || (ch === "/" && next === "/")) {
      const end = source.indexOf("\n", index);
      const stop = end === -1 ? source.length : end;
      blank(index, stop);
      index = stop;
      continue;
    }
    if (ch === "/" && next === "*") {
      const end = source.indexOf("*/", index + 2);
      const stop = end === -1 ? source.length : end + 2;
      blank(index, stop);
      index = stop;
      continue;
    }
    if (ch === '"' || ch === "'") {
      let cursor = index + 1;
      while (cursor < chars.length) {
        if (chars[cursor] === "\\" && ch === '"') { cursor += 2; continue; }
        if (chars[cursor] === ch) break;
        cursor++;
      }
      index = cursor + 1;
      continue;
    }
    index++;
  }
  return out.join("");
}

/** Which `var.<name>` references appear in a source file, including inside strings. */
export function referencedVariables(source) {
  const cleaned = stripComments(source);
  const names = new Set();
  for (const match of cleaned.matchAll(/\bvar\.([A-Za-z_][A-Za-z0-9_]*)/g)) names.add(match[1]);
  return [...names];
}

/** Variables declared in a variables.tf source, in declaration order. */
export function variableDefinitions(source) {
  const parsed = parseHcl(source);
  return blocksOfType(parsed.blocks, "variable").map((block) => ({
    name: block.labels[0],
    type: block.attributes.type ? block.attributes.type.trim() : "",
    description: unquote(block.attributes.description || ""),
    default: block.attributes.default,
    sensitive: /^true$/i.test(String(block.attributes.sensitive || "").trim()),
  }));
}

/** Outputs declared in an outputs.tf source. */
export function outputDefinitions(source) {
  const parsed = parseHcl(source);
  return blocksOfType(parsed.blocks, "output").map((block) => ({
    name: block.labels[0],
    description: unquote(block.attributes.description || ""),
    value: block.attributes.value || "",
  }));
}

/** Resources in a main.tf source. */
export function resourceDefinitions(source) {
  const parsed = parseHcl(source);
  return blocksOfType(parsed.blocks, "resource").map((block) => ({
    type: block.labels[0],
    name: block.labels[1],
    blockNames: block.blocks.map((entry) => entry.type),
  }));
}

/** `module` blocks from an example, with their non-meta attributes. */
export function moduleBlocks(source) {
  const parsed = parseHcl(source);
  return blocksOfType(parsed.blocks, "module").map((block) => {
    const inputs = {};
    for (const [key, value] of Object.entries(block.attributes)) {
      if (["source", "version", "providers", "depends_on", "count", "for_each"].includes(key)) continue;
      inputs[key] = value;
    }
    return {
      name: block.labels[0],
      source: unquote(block.attributes.source || ""),
      inputs,
    };
  });
}
