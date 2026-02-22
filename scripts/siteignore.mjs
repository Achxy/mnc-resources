import { promises as fs } from "fs";

const escapeRegex = (char) => (/[\\^$+?.()|{}[\]]/.test(char) ? `\\${char}` : char);

const globToRegExp = (glob) => {
  let regex = "";
  for (let i = 0; i < glob.length; i += 1) {
    const char = glob[i];
    if (char === "\\") {
      if (i + 1 < glob.length) {
        i += 1;
        regex += escapeRegex(glob[i]);
      }
      continue;
    }
    if (char === "*") {
      const isDoubleStar = glob[i + 1] === "*";
      if (isDoubleStar) {
        const followedBySlash = glob[i + 2] === "/";
        if (followedBySlash) {
          regex += "(?:.*/)?";
          i += 2;
          continue;
        }
        regex += ".*";
        i += 1;
        continue;
      }
      regex += "[^/]*";
      continue;
    }
    if (char === "?") {
      regex += "[^/]";
      continue;
    }
    if (char === "[") {
      const closingIndex = glob.indexOf("]", i + 1);
      if (closingIndex !== -1) {
        const content = glob.slice(i + 1, closingIndex);
        regex += `[${content}]`;
        i = closingIndex;
        continue;
      }
      regex += "\\[";
      continue;
    }
    regex += escapeRegex(char);
  }
  return regex;
};

const buildRegexFromPattern = (pattern, anchored) => {
  const prefix = anchored ? "^" : "^(?:.*/)?";
  const body = globToRegExp(pattern);
  return new RegExp(`${prefix}${body}$`);
};

const parseSiteignore = (rawRules) =>
  rawRules
    .split(/\r?\n/)
    .map((line) => line.replace(/\r$/, ""))
    .map((line) => {
      if (!line.trim()) return null;
      let rule = line.trimEnd();

      if (rule.startsWith("\\") && (rule[1] === "#" || rule[1] === "!")) {
        rule = rule.slice(1);
      }
      if (rule.startsWith("#")) return null;

      let negated = false;
      if (rule.startsWith("!")) {
        negated = true;
        rule = rule.slice(1);
      }

      let dirOnly = false;
      if (rule.endsWith("/")) {
        dirOnly = true;
        rule = rule.slice(0, -1);
      }

      const anchored = rule.startsWith("/");
      const cleanedPattern = anchored ? rule.slice(1) : rule;
      if (!cleanedPattern) return null;

      const regex = buildRegexFromPattern(cleanedPattern, anchored);
      return { regex, negated, dirOnly };
    })
    .filter(Boolean);

export const loadIgnoreRules = async (siteignorePath) => {
  try {
    const raw = await fs.readFile(siteignorePath, "utf8");
    return parseSiteignore(raw);
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
};

export const createIsIgnored = (rules) => {
  if (!rules.length) return () => false;

  return (relativePath, isDir) => {
    let ignored = false;
    for (const rule of rules) {
      if (rule.dirOnly && !isDir) continue;
      if (rule.regex.test(relativePath)) {
        ignored = !rule.negated;
      }
    }
    return ignored;
  };
};
