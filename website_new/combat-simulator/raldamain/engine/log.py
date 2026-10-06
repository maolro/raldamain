"""Combat logging: a readable transcript plus a structured event stream.

The transcript is what you read when debugging one fight; the event stream is
what the batch runner aggregates over thousands of them.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class CombatLog:
    seed: int = 0
    lines: list[str] = field(default_factory=list)
    events: list[dict[str, Any]] = field(default_factory=list)
    echo: bool = False
    round: int = 0

    def line(self, text: str = "", indent: int = 0) -> None:
        rendered = ("  " * indent) + text if text else ""
        self.lines.append(rendered)
        if self.echo:
            print(rendered)

    def header(self, text: str) -> None:
        self.line()
        self.line(text)
        self.line("-" * len(text))

    def event(self, kind: str, **data: Any) -> None:
        self.events.append({"round": self.round, "kind": kind, **data})

    def text(self) -> str:
        return "\n".join(self.lines)

    def of_kind(self, kind: str) -> list[dict[str, Any]]:
        return [e for e in self.events if e["kind"] == kind]
