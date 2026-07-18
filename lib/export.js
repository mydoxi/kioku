// Kioku — export converters (dashboard-side).

const PLATFORM_LABEL = { claude: "Claude", chatgpt: "ChatGPT", gemini: "Gemini" };

export function conversationToMarkdown(convo) {
  const lines = [
    `# ${convo.title}`,
    "",
    `> Platform: ${PLATFORM_LABEL[convo.platform] || convo.platform} · Archived by Kioku · ${new Date(convo.updatedAt).toLocaleString()}`,
    `> ${convo.url}`,
    "",
  ];
  for (const m of convo.messages) {
    lines.push(`## ${m.role === "user" ? "You" : "Assistant"}`, "", m.text, "");
  }
  return lines.join("\n");
}

export function conversationsToMarkdown(convos) {
  return convos.map(conversationToMarkdown).join("\n\n---\n\n");
}

export function conversationsToJson(convos) {
  return JSON.stringify(
    {
      exportedBy: "Kioku",
      exportedAt: new Date().toISOString(),
      count: convos.length,
      conversations: convos,
    },
    null,
    2
  );
}

export function safeFilename(name, ext) {
  return name.replace(/[\\/:*?"<>|]/g, "_").slice(0, 80) + ext;
}

export function download(content, filename, mime) {
  const blob = new Blob([content], { type: mime });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
