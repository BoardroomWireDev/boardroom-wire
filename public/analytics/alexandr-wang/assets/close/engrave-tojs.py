import json, sys
r = json.load(open(sys.argv[1]))
out = {}
for k, v in r.items():
    if isinstance(v, list) and not v: continue
    if isinstance(v, list) and isinstance(v[0], str): out[k] = "".join(v)
    else: out[k] = v
hdr = ("/* The open-head close as a white-line engraving (b066 pass 6, Ive, 10 Oct 2026). Vector paths in page space (1920x1080),\n"
       "   traced from the writer's picked thumbnail art (thumbnails/PRD PRD_AW_02 and PRD_AW_04) by the scratchpad engraver: each line\n"
       "   follows the form, its width is the art's tone. Generated file: do not edit by hand. */\n")
open(sys.argv[2], "w").write(hdr + "window.OPEN_HEAD_ENGRAVING = " + json.dumps(out, separators=(",", ":")) + ";\n")
