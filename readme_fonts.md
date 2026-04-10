# Icons aus Datei exportieren

```bash
conda activate tools
pyftsubset google-icons-rounded.woff2 \
  --text="arrow_downward arrow_upward chevron_left chevron_right close expand_more filter_alt filter_alt_off refresh search unfold_more workspaces" \
  --layout-features="liga,clig,rlig,ccmp,calt" \
  --flavor=woff2 \
  --output-file=picker-icons.woff2

base64 -w0 picker-icons.woff2 | wl-copy
```