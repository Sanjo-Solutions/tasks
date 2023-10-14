import remarkGfm from "remark-gfm"
import remarkHeadingId from "remark-heading-id"
import classNames from "rehype-class-names"
import rehypeExternalLinks from "rehype-external-links"

export const mdxOptions = {
  remarkPlugins: [remarkGfm, [remarkHeadingId, { defaults: true }]],
  rehypePlugins: [
    [
      rehypeExternalLinks,
      { target: "_blank", rel: ["noopener", "noreferrer"] },
    ],
    [classNames, { blockquote: "blockquote" }],
  ],
}
