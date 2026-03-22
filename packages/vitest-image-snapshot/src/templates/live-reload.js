let lastModified;
setInterval(async () => {
  try {
    const res = await fetch(location.href, { method: "HEAD" });
    const modified = res.headers.get("last-modified");
    if (lastModified && modified !== lastModified) location.reload();
    lastModified = modified;
  } catch {}
}, 500);
