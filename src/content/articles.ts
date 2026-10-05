import { BUILD_ARTICLES } from "./articles-build";
import { PLANNING_ARTICLES } from "./articles-planning";
import type { Article } from "./types";

/** Every article, newest first. */
export const ARTICLES: Article[] = [
	...PLANNING_ARTICLES,
	...BUILD_ARTICLES,
].sort((a, b) =>
	(b.updated ?? b.published).localeCompare(a.updated ?? a.published),
);

export function getArticle(slug: string): Article | undefined {
	return ARTICLES.find((a) => a.slug === slug);
}

export const ARTICLE_CATEGORIES = [...new Set(ARTICLES.map((a) => a.category))];
