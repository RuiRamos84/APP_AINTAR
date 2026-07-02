"""Stop hook: lembra de atualizar documentacao (README/CLAUDE.md/Obsidian) quando
ha alteracoes de codigo em rotas/servicos/componentes sem alteracoes de docs na mesma sessao.

Dispara no maximo uma vez por sessao (usa um marker em .claude/.tmp-doc-sync/).
"""
import json
import os
import re
import subprocess
import sys

SRC_PATTERN = re.compile(
    r"^(backend/app/(routes|services|models)/"
    r"|frontend/src/(pages|services|components)/"
    r"|frontend-v2/src/(features|core|services)/)"
)
DOC_PATTERN = re.compile(r"(^CLAUDE\.md$|README\.md$|^docs/|\.md$)")


def sh(repo_root, args):
    result = subprocess.run(
        args, cwd=repo_root, capture_output=True, text=True, shell=False
    )
    return result.stdout.splitlines() if result.returncode == 0 else []


def main():
    try:
        raw = sys.stdin.read()
        data = json.loads(raw) if raw.strip() else {}
    except Exception:
        data = {}

    session_id = data.get("session_id") or "default"

    repo_root_result = subprocess.run(
        ["git", "rev-parse", "--show-toplevel"], capture_output=True, text=True
    )
    if repo_root_result.returncode != 0:
        print("{}")
        return
    repo_root = repo_root_result.stdout.strip()

    marker_dir = os.path.join(repo_root, ".claude", ".tmp-doc-sync")
    os.makedirs(marker_dir, exist_ok=True)
    marker = os.path.join(marker_dir, f"warned-{session_id}")

    if os.path.exists(marker):
        print("{}")
        return

    modified = sh(repo_root, ["git", "diff", "--name-only", "HEAD"])
    untracked = sh(repo_root, ["git", "ls-files", "--others", "--exclude-standard"])
    changed = set(modified) | set(untracked)

    src_changed = sorted(f for f in changed if SRC_PATTERN.match(f))
    docs_changed = sorted(f for f in changed if DOC_PATTERN.search(f))

    if src_changed and not docs_changed:
        with open(marker, "w", encoding="utf-8"):
            pass
        preview = ", ".join(src_changed[:8])
        if len(src_changed) > 8:
            preview += " (+ outros)"
        reason = (
            "Foram alteradas rotas/servicos/componentes nesta sessao sem "
            "atualizacao de documentacao correspondente: " + preview + ". "
            "Antes de terminar, verifica se README.md (backend/frontend/frontend-v2), "
            "CLAUDE.md, ou as notas relevantes do Obsidian Vault (Modulos, API Reference, "
            "Backlog & Roadmap) precisam de ser atualizadas."
        )
        print(json.dumps({
            "decision": "block",
            "reason": reason,
            "systemMessage": "Lembrete: verificar se README/CLAUDE.md/Obsidian precisam de atualizacao.",
        }))
    else:
        print("{}")


if __name__ == "__main__":
    main()
