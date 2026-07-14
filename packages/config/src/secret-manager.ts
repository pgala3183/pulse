import { ConfigError } from "./load-config";

/**
 * Google Secret Manager resolver.
 * Expects refs like:
 * - `secret:projects/my-proj/secrets/api-key/versions/latest`
 * - `gsm:api-key` (uses GCP_PROJECT_ID)
 */
export function createGcpSecretResolver(
  env: NodeJS.ProcessEnv,
): (ref: string) => Promise<string> {
  let clientPromise: Promise<{
    accessSecretVersion: (req: {
      name: string;
    }) => Promise<[{ payload?: { data?: Uint8Array | string | null } | null }]>;
  }> | null = null;

  const getClient = async () => {
    if (!clientPromise) {
      clientPromise = (async () => {
        try {
          // Optional dependency — only required in deployed GSM environments.
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const gsm = require("@google-cloud/secret-manager") as {
            SecretManagerServiceClient: new () => {
              accessSecretVersion: (req: {
                name: string;
              }) => Promise<[{ payload?: { data?: Uint8Array | string | null } | null }]>;
            };
          };
          return new gsm.SecretManagerServiceClient();
        } catch (error) {
          throw new ConfigError(
            "CONFIG_BACKEND=gcp-secret-manager requires @google-cloud/secret-manager to be installed",
            error,
          );
        }
      })();
    }
    return clientPromise;
  };

  return async (ref: string) => {
    const name = toSecretVersionName(ref, env);
    const client = await getClient();
    const [response] = await client.accessSecretVersion({ name });
    const data = response.payload?.data;
    if (data === undefined || data === null) {
      throw new ConfigError(`Secret ${name} has empty payload`);
    }
    return typeof data === "string" ? data : Buffer.from(data).toString("utf8");
  };
}

function toSecretVersionName(ref: string, env: NodeJS.ProcessEnv): string {
  if (ref.startsWith("secret:")) {
    const path = ref.slice("secret:".length);
    if (path.includes("/secrets/")) {
      return path.includes("/versions/") ? path : `${path}/versions/latest`;
    }
    throw new ConfigError(
      `Invalid secret: ref "${ref}". Expected secret:projects/PROJECT/secrets/NAME[/versions/VERSION]`,
    );
  }

  if (ref.startsWith("gsm:")) {
    const secretId = ref.slice("gsm:".length);
    const projectId = env["GCP_PROJECT_ID"] ?? env["GOOGLE_CLOUD_PROJECT"];
    if (!projectId) {
      throw new ConfigError("gsm: refs require GCP_PROJECT_ID (or GOOGLE_CLOUD_PROJECT)");
    }
    return `projects/${projectId}/secrets/${secretId}/versions/latest`;
  }

  throw new ConfigError(`Unsupported secret ref "${ref}"`);
}
