import { DraftReviewClient } from "@/components/draft-review/draft-review-client";

type Props = {
  params: Promise<{ locale: string; token: string }>;
};

export default async function DraftReviewPage({ params }: Props) {
  const { token } = await params;
  return <DraftReviewClient token={token} />;
}
