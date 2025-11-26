import { promises as fs } from "fs";
import path from "path";

const ROOT_LABEL = "Contents";
const ROOT_WEB_PATH = "/contents";
const CONTENTS_DIR = path.resolve("contents");
const OUTPUT_FILE = path.resolve("public/resources-manifest.json");
const SITEIGNORE_PATH = path.join(CONTENTS_DIR, ".siteignore");

const collator = new Intl.Collator(undefined, { sensitivity: "base", numeric: true });

const sortEntries = (entries) =>
  entries.slice().sort((a, b) => {
    const aIsDir = a.isDirectory();
    const bIsDir = b.isDirectory();
    if (aIsDir && !bIsDir) return -1;
    if (!aIsDir && bIsDir) return 1;
    return collator.compare(a.name, b.name);
  });

const getExtension = (fileName) => {
  const ext = path.extname(fileName);
  return ext ? ext.slice(1).toLowerCase() : "";
};

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
  const suffix = "$";
  const source = `${prefix}${body}${suffix}`;
  return new RegExp(source);
};

const parseSiteignore = (rawRules) => {
  return rawRules
    .split(/\r?\n/)
    .map((line) => line.replace(/\r$/, ""))
    .map((line) => {
      if (!line.trim()) return null;
      let rule = line;

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
};

const loadIgnoreRules = async () => {
  try {
    const raw = await fs.readFile(SITEIGNORE_PATH, "utf8");
    return parseSiteignore(raw);
  } catch (error) {
    if (error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
};

const createIsIgnored = (rules) => {
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

const buildChildren = async (fsDirPath, webDirPath, relativeDirPath, isIgnored) => {
  const entries = await fs.readdir(fsDirPath, { withFileTypes: true });
  const sorted = sortEntries(entries);

  const children = [];
  for (const entry of sorted) {
    const entryFsPath = path.join(fsDirPath, entry.name);
    const entryWebPath = path.posix.join(webDirPath, entry.name);
    const entryRelativePath = relativeDirPath ? `${relativeDirPath}/${entry.name}` : entry.name;

    if (isIgnored(entryRelativePath, entry.isDirectory())) {
      continue;
    }

    if (entry.isDirectory()) {
      children.push({
        type: "directory",
        name: entry.name,
        path: entryWebPath,
        children: await buildChildren(entryFsPath, entryWebPath, entryRelativePath, isIgnored),
      });
    } else {
      children.push({
        type: "file",
        name: entry.name,
        path: entryWebPath,
        extension: getExtension(entry.name),
      });
    }
  }

  return children;
};

const generateManifest = async () => {
  const stats = await fs.stat(CONTENTS_DIR).catch(() => null);
  if (!stats || !stats.isDirectory()) {
    throw new Error("`contents` directory not found or is not a directory.");
  }

  const ignoreRules = await loadIgnoreRules();
  const isIgnored = createIsIgnored(ignoreRules);

  const manifest = {
    rootLabel: ROOT_LABEL,
    rootPath: ROOT_WEB_PATH,
    children: await buildChildren(CONTENTS_DIR, ROOT_WEB_PATH, "", isIgnored),
  };

  await fs.mkdir(path.dirname(OUTPUT_FILE), { recursive: true });
  await fs.writeFile(OUTPUT_FILE, JSON.stringify(manifest, null, 2), "utf8");
  console.log(`Manifest written to ${OUTPUT_FILE}`);
};

generateManifest().catch((error) => {
  console.error(error);
  process.exit(1);
});
