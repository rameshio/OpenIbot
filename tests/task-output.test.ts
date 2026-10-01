import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TaskOutput } from "../src/components/workspace/task-output";

const render = (text: string) =>
  renderToStaticMarkup(createElement(TaskOutput, { text }));

test("generated HTML and unsafe link syntax stay inert and readable", () => {
  const html = render(
    '<script>alert("generated")</script>\n<img src=x onerror="alert(1)">\n[Open](javascript:alert(1))',
  );

  assert.match(
    html,
    /&lt;script&gt;alert\(&quot;generated&quot;\)&lt;\/script&gt;/,
  );
  assert.match(html, /&lt;img src=x onerror=&quot;alert\(1\)&quot;&gt;/);
  assert.match(html, /\[Open\]\(javascript:alert\(1\)\)/);
  assert.doesNotMatch(html, /<(?:script|img|a)\b/i);
});

test("an unfinished streamed code fence preserves partial code without creating HTML", () => {
  const partial = '```html\n<section>\n  <script>alert("partial")</script>';
  const html = render(partial);

  assert.match(html, /<pre\b[^>]*><code>&lt;section&gt;\n/);
  assert.match(
    html,
    /&lt;script&gt;alert\(&quot;partial&quot;\)&lt;\/script&gt;/,
  );
  assert.match(html, /aria-label="Copy code"/);
  assert.doesNotMatch(html, /<(?:section|script)\b/i);

  const completed = render(
    `${partial}\n</section>\n\`\`\`\n\nReady to review.`,
  );
  assert.match(completed, /&lt;\/section&gt;<\/code><\/pre>/);
  assert.match(completed, /<p\b[^>]*>Ready to review\.<\/p>/);
});

test("headings and lists expose readable structure and inline emphasis", () => {
  const html = render(
    "# Delivery plan\n\n- **Research** the constraints\n- Draft `proposal.md`\n\n3. Review the result\n4. Share the next steps",
  );

  assert.match(html, /role="heading" aria-level="2"[^>]*>Delivery plan<\/div>/);
  assert.match(html, /<ul\b/);
  assert.match(html, /<strong\b[^>]*>Research<\/strong> the constraints/);
  assert.match(html, /<code\b[^>]*>proposal\.md<\/code>/);
  assert.match(html, /<ol start="3"/);
  assert.equal((html.match(/<li\b/g) ?? []).length, 4);
  assert.match(html, />Review the result<\/li>/);
  assert.match(html, />Share the next steps<\/li>/);
});
