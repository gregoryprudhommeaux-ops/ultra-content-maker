import { getAuthorProfile } from "./author";
import { listArticleBatches } from "./articles";

/** Where to send the user after sign-in or home. */
export async function resolveLandingPath(userId: string): Promise<string> {
  const author = await getAuthorProfile(userId);
  const profileSaved = author?.status === "complete";

  if (!profileSaved) {
    return "/setup/author";
  }

  const batches = await listArticleBatches(userId);
  const articleCount = batches.reduce((n, b) => n + b.articles.length, 0);

  if (articleCount === 0) {
    return "/setup/author";
  }

  return "/articles/new";
}
