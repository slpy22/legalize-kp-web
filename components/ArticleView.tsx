import type { Article } from "@/lib/types";

interface Props {
  articles: Article[];
}

export default function ArticleView({ articles }: Props) {
  let currentChapter = "";

  return (
    <div className="law-content">
      {articles.map((art) => {
        const showChapterHeading =
          art.chapter && art.chapter !== currentChapter;
        if (art.chapter) currentChapter = art.chapter;

        return (
          <div key={art.id} id={`art-${art.article_number}`}>
            {showChapterHeading && (
              <h2 id={`chapter-${art.chapter}`}>{art.chapter}</h2>
            )}
            <h5>
              제{art.article_number}조
              {art.article_title ? ` (${art.article_title})` : ""}
            </h5>
            <p className="whitespace-pre-wrap">{art.content}</p>
          </div>
        );
      })}
    </div>
  );
}
