import path from "path";
import { ListObjectsV2Command, PutObjectCommand } from "@aws-sdk/client-s3";
import { createR2Client, R2_BUCKET } from "./r2-client.mjs";

const MANIFEST_KEY = "resources-manifest.json";
const ROOT_LABEL = "Contents";
const ROOT_WEB_PATH = "/contents";

const collator = new Intl.Collator("en", { sensitivity: "base", numeric: true });

const getExtension = (fileName) => {
  const ext = path.extname(fileName);
  return ext ? ext.slice(1).toLowerCase() : "";
};

const listAllObjects = async (client) => {
  const keys = [];
  let continuationToken;

  do {
    const res = await client.send(
      new ListObjectsV2Command({
        Bucket: R2_BUCKET,
        ContinuationToken: continuationToken,
      })
    );
    for (const obj of res.Contents || []) {
      // Skip the manifest itself
      if (obj.Key === MANIFEST_KEY) continue;
      keys.push(obj.Key);
    }
    continuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (continuationToken);

  return keys;
};

const buildTree = (keys) => {
  // Build a nested map structure
  const root = { dirs: new Map(), files: [] };

  for (const key of keys) {
    const parts = key.split("/");
    let current = root;

    for (let i = 0; i < parts.length - 1; i++) {
      const dirName = parts[i];
      if (!current.dirs.has(dirName)) {
        current.dirs.set(dirName, { dirs: new Map(), files: [] });
      }
      current = current.dirs.get(dirName);
    }

    current.files.push(parts[parts.length - 1]);
  }

  // Convert to manifest format
  const convertNode = (node, webPath) => {
    const children = [];

    // Sort directories first, then files, both alphabetically
    const dirEntries = [...node.dirs.entries()].sort((a, b) => collator.compare(a[0], b[0]));
    const fileEntries = [...node.files].sort((a, b) => collator.compare(a, b));

    for (const [name, childNode] of dirEntries) {
      const childWebPath = `${webPath}/${name}`;
      children.push({
        type: "directory",
        name,
        path: childWebPath,
        children: convertNode(childNode, childWebPath),
      });
    }

    for (const name of fileEntries) {
      children.push({
        type: "file",
        name,
        path: `${webPath}/${name}`,
        extension: getExtension(name),
      });
    }

    return children;
  };

  return convertNode(root, ROOT_WEB_PATH);
};

const generateAndUpload = async () => {
  const client = createR2Client();

  console.log("Listing R2 objects...");
  const keys = await listAllObjects(client);
  console.log(`Found ${keys.length} objects.`);

  const manifest = {
    rootLabel: ROOT_LABEL,
    rootPath: ROOT_WEB_PATH,
    children: buildTree(keys),
  };

  const body = JSON.stringify(manifest);

  await client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: MANIFEST_KEY,
      Body: body,
      ContentType: "application/json",
      CacheControl: "no-cache",
    })
  );

  console.log(`Manifest uploaded to R2 (${MANIFEST_KEY}, ${body.length} bytes)`);
};

generateAndUpload().catch((err) => {
  console.error(err);
  process.exit(1);
});
