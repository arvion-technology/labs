// A small YAML subset parser, sized for compose files.
//
// Supports block mappings, block sequences of scalars, flow sequences (used by
// healthcheck test arrays), quoted strings, comments, booleans, null and numbers.
// It deliberately does not support anchors, tags, multi-document files or block
// scalars: the compose files in this repository use none of them, and a parser
// that claims more than it implements is worse than one with a clear boundary.

export class YamlError extends Error {
  constructor(message, line) {
    super(line ? `${message} (line ${line})` : message);
    this.name = "YamlError";
    this.line = line;
  }
}

function stripComment(text) {
  let quote = null;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quote) {
      if (ch === "\\" && quote === '"') i++;
      else if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'") quote = ch;
    else if (ch === "#" && (i === 0 || text[i - 1] === " " || text[i - 1] === "\t")) return text.slice(0, i);
  }
  return text;
}

function splitFlow(text) {
  const parts = [];
  let quote = null;
  let depth = 0;
  let current = "";
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quote) {
      current += ch;
      if (ch === "\\" && quote === '"') { current += text[++i] ?? ""; continue; }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") { quote = ch; current += ch; continue; }
    if (ch === "[" || ch === "{") depth++;
    if (ch === "]" || ch === "}") depth--;
    if (ch === "," && depth === 0) { parts.push(current.trim()); current = ""; continue; }
    current += ch;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

function parseScalar(raw) {
  const text = raw.trim();
  if (text === "") return null;
  if (/^[&*][^\s]*/.test(text)) throw new YamlError("anchors and aliases are not supported");
  if (text === "{}") return {};
  if (text === "[]") return [];
  if (text.startsWith("[") && text.endsWith("]")) {
    return splitFlow(text.slice(1, -1)).map(parseScalar);
  }
  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) {
    const inner = text.slice(1, -1);
    return text.startsWith('"') ? inner.replace(/\\"/g, '"').replace(/\\\\/g, "\\") : inner.replace(/''/g, "'");
  }
  if (text === "true") return true;
  if (text === "false") return false;
  if (text === "null" || text === "~") return null;
  if (/^-?\d+(\.\d+)?$/.test(text)) return Number(text);
  return text;
}

function tokenise(text) {
  const lines = [];
  const raw = text.split(/\r?\n/);
  for (let i = 0; i < raw.length; i++) {
    const withoutComment = stripComment(raw[i]);
    if (!withoutComment.trim()) continue;
    if (withoutComment.includes("\t")) throw new YamlError("tabs are not valid YAML indentation", i + 1);
    const indent = withoutComment.match(/^ */)[0].length;
    lines.push({ content: withoutComment.trim(), indent, line: i + 1 });
  }
  return lines;
}

function parseBlock(lines, start, indent) {
  if (lines[start].content.startsWith("-")) return parseSequence(lines, start, indent);
  return parseMapping(lines, start, indent);
}

function parseSequence(lines, start, indent) {
  const items = [];
  let i = start;
  while (i < lines.length) {
    const line = lines[i];
    if (line.indent < indent) break;
    if (line.indent > indent) throw new YamlError("unexpected indentation in sequence", line.line);
    if (!line.content.startsWith("-")) break;
    const rest = line.content.slice(1).trim();
    if (!rest) {
      if (i + 1 >= lines.length || lines[i + 1].indent <= indent) { items.push(null); i++; continue; }
      const [value, next] = parseBlock(lines, i + 1, lines[i + 1].indent);
      items.push(value);
      i = next;
      continue;
    }
    if (rest.includes(": ") && !rest.startsWith('"') && !rest.startsWith("'")) {
      throw new YamlError("sequence items that are mappings are not supported", line.line);
    }
    items.push(parseScalar(rest));
    i++;
  }
  return [items, i];
}

function parseMapping(lines, start, indent) {
  const object = {};
  let i = start;
  while (i < lines.length) {
    const line = lines[i];
    if (line.indent < indent) break;
    if (line.indent > indent) throw new YamlError("unexpected indentation in mapping", line.line);
    if (line.content.startsWith("-")) break;
    const colon = findColon(line.content);
    if (colon === -1) throw new YamlError(`expected "key: value", got "${line.content}"`, line.line);
    const key = line.content.slice(0, colon).trim();
    const rest = line.content.slice(colon + 1).trim();
    if (!key) throw new YamlError("empty key", line.line);
    if (rest !== "") {
      object[key] = parseScalar(rest);
      i++;
      continue;
    }
    if (i + 1 < lines.length && lines[i + 1].indent > indent) {
      const [value, next] = parseBlock(lines, i + 1, lines[i + 1].indent);
      object[key] = value;
      i = next;
    } else {
      object[key] = null;
      i++;
    }
  }
  return [object, i];
}

function findColon(text) {
  let quote = null;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quote) {
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") { quote = ch; continue; }
    if (ch === ":" && (i === text.length - 1 || text[i + 1] === " " || text[i + 1] === "\t")) return i;
  }
  return -1;
}

export function parseYaml(text) {
  if (typeof text !== "string") throw new YamlError("parseYaml needs a string");
  const lines = tokenise(text);
  if (!lines.length) return null;
  const [value, next] = parseBlock(lines, 0, lines[0].indent);
  if (next !== lines.length) throw new YamlError("could not parse the whole document", lines[next].line);
  return value;
}
