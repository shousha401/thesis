/**
 * Renders a structured-data block.
 *
 * `JSON.stringify` output is escaped before it reaches the page: a title
 * containing `</script>` would otherwise close the tag early and inject markup.
 * Titles are written by the hosts, so this is a real path, not a hypothetical.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  const json = JSON.stringify(data).replace(/</g, '\\u003c');

  return (
    <script
      type="application/ld+json"
      // The content is serialised JSON with `<` escaped, never host markup.
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
