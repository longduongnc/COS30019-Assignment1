"""Figure 1: say-do gap for Australia's AI Ethics Principles.

Data: Fifth Quadrant (2024), Australian Responsible AI Index 2024: Executive
summary, p. 4. Agreement = % of organisations agreeing with a performance
statement for the principle; implementation = % implementing the example
practice listed for that principle. n = 413.
"""
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.lines import Line2D

ROWS = [  # (principle, agree %, implemented %)
    ("Human-centred values", 82, 22),
    ("Privacy protection and security", 84, 31),
    ("Accountability", 79, 27),
    ("Human, societal and\nenvironmental wellbeing", 77, 26),
    ("Transparency and explainability", 76, 29),
    ("Reliability and safety", 82, 37),
    ("Contestability", 73, 30),
    ("Fairness", 69, 35),
]
ROWS.sort(key=lambda r: r[1] - r[2], reverse=True)

SAY, DO = "#86b6ef", "#1c5cab"          # one hue, two shades (validated ordinal pair)
INK, INK2, MUTED = "#0b0b0b", "#52514e", "#898781"
GRID, AXIS, CONNECT = "#e1e0d9", "#c3c2b7", "#c3c2b7"

plt.rcParams.update({"font.family": ["Arial", "Helvetica", "DejaVu Sans"], "font.size": 8.5})
fig, ax = plt.subplots(figsize=(6.3, 3.35), dpi=300)
fig.subplots_adjust(left=0.33, right=0.88, top=0.84, bottom=0.15)

for i, (name, say, do) in enumerate(ROWS):
    y = len(ROWS) - 1 - i
    ax.plot([do, say], [y, y], color=CONNECT, lw=1.6, solid_capstyle="round", zorder=1)
    ax.scatter([say], [y], s=58, color=SAY, edgecolors="white", linewidths=1.2, zorder=3)
    ax.scatter([do], [y], s=58, color=DO, edgecolors="white", linewidths=1.2, zorder=3)
    ax.text(-3, y, name, ha="right", va="center", color=INK, fontsize=8.5, linespacing=1.05)
    ax.text(104, y, f"{say - do}", ha="left", va="center", color=INK, fontsize=8.5, fontweight="bold")

ax.text(104, len(ROWS) - 0.35, "Gap\n(points)", ha="left", va="bottom", color=INK2, fontsize=7.5, linespacing=1.1)
ax.set_xlim(0, 100)
ax.set_ylim(-0.6, len(ROWS) - 0.4)
ax.set_xticks(range(0, 101, 20))
ax.set_xticklabels([f"{t}%" for t in range(0, 101, 20)], color=MUTED, fontsize=7.5)
ax.set_yticks([])
ax.tick_params(axis="x", length=0, pad=4)
ax.grid(axis="x", color=GRID, lw=0.6)
ax.set_axisbelow(True)
for side in ("top", "right", "left"):
    ax.spines[side].set_visible(False)
ax.spines["bottom"].set_color(AXIS)
ax.spines["bottom"].set_linewidth(0.6)
ax.set_xlabel("% of Australian organisations (n = 413)", color=INK2, fontsize=7.5, labelpad=6)

handles = [
    Line2D([], [], marker="o", ls="", ms=7, mfc=SAY, mec="white", mew=1.0, label="Agree their AI aligns with the principle"),
    Line2D([], [], marker="o", ls="", ms=7, mfc=DO, mec="white", mew=1.0, label="Have implemented a matching practice"),
]
fig.legend(handles=handles, loc="upper left", bbox_to_anchor=(0.005, 0.995), ncol=2, frameon=False,
           fontsize=8, handletextpad=0.3, columnspacing=1.6, labelcolor=INK)

out = Path(__file__).resolve().parent.parent / "report" / "figures" / "figure1-say-do-gap.png"
fig.savefig(out, dpi=300, facecolor="white")
print("wrote", out)
