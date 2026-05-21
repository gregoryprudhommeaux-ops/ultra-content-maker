import { ArticleEditor } from "@/components/articles/article-editor";

type Props = { params: Promise<{ id: string }> };

export default async function ArticleDetailPage({ params }: Props) {
  const { id } = await params;
  return <ArticleEditor articleId={id} />;
}
